# CSV import and export — audit

Date: 2026-10-17. Before this phase, CSV files could only be validated (a dry run of the reference data-quality report); nothing was persisted and no table could be exported.

## What exists now

| Item | Status | Where |
|---|---|---|
| Templates (header-only, canonical column order) | IMPLEMENTED AND VERIFIED | `GET /api/v1/data/export?entity=…&template=1`; column guide on `/admin/import` |
| Dry-run validation with line-numbered errors | IMPLEMENTED AND VERIFIED | `POST /api/v1/data/import/preview` → `planImport()` in `server/examopt/csv-import.ts` |
| Confirmed, persisted import | IMPLEMENTED AND VERIFIED | `POST /api/v1/data/import/commit` → `csvService.commit()` in `server/examopt/csv-service.ts` |
| Read-back verification after commit | IMPLEMENTED AND VERIFIED | Every written column is re-read and compared; the result says `verified` or lists mismatches |
| Canonical entity export (re-importable unchanged) | IMPLEMENTED AND VERIFIED | `GET /api/v1/data/export?entity=…` |
| Timetable, room allocation and invigilation exports | IMPLEMENTED AND VERIFIED (pre-existing) | `ExportMenu`. **Fixed:** opening the menu crashed (Base UI `MenuGroupContext is missing`); the label now sits in a `DropdownMenuGroup`. |
| UI | IMPLEMENTED AND VERIFIED (browser) | `/admin/import` (two steps: validate, then confirm with a review checkbox); "Import / export CSV" on Subjects, Rooms, Time slots, Student groups and Students pages (`?entity=` preselects the table) |
| Reference edge-case files | Preserved | Still checked with the reference quality report on `/admin/import`; never imported |

## Supported entities and formats

All writes go through the existing PostgREST path (`querySupabase`, service role, server only), to the canonical tables the scheduler reads.

| Entity | Table written | Key | Columns |
|---|---|---|---|
| `subjects` | `subjects` | `subject_id` | subject_id, name, program, semester, duration_hours, requires_lab, fixed_slot, unavailable_slots, enrolled_students |
| `rooms` | `rooms` | `room_id` | room_id, name, building, capacity, room_type, unavailable_slots |
| `timeslots` | `timeslots` | `slot_id` | slot_id, day_number, exam_date, session, time_range |
| `student_groups` | `student_groups` | `group_id` | group_id, name, program, semester, is_backlog_group, student_count |
| `students` | `student_enrollments` and `student_subject_enrollments` | `roll_no` | roll_no, student_name, group_id, has_backlog, subject_ids |
| `faculty` | `faculty` | `faculty_id` | faculty_id, name, department, unavailable_slots, max_duties |

Format: UTF-8 (a BOM is accepted), comma-separated, RFC 4180 quoting, a header row, slot and subject lists separated by `|`, booleans `true`/`false`, dates `YYYY-MM-DD`, time ranges `09:30 AM - 12:30 PM`. Identifiers are normalised to upper case. Limits: 2 MB and 5,000 rows per file (the existing dry-run policy).

## Validation and duplicate policy

- **Header:** unknown columns, missing required columns and repeated column names are errors at line 1.
- **Types and ranges:** integers, booleans, enums (program, room type, session, department), real dates, start-before-end time ranges, `duration_hours` 2 or 3, semester 1–8, `day_number` 1–14, capacity ≥ 1. These mirror the database `CHECK` constraints.
- **References:** slot lists, `fixed_slot`, `group_id` and `subject_ids` must already exist. Students and enrollments are therefore never malformed.
- **Entity rules:** a subject fixed to a slot it also marks unavailable is refused; a date may hold one MORNING and one EVENING slot (checked against existing rows and within the file).
- **Duplicates:** a key repeated within the file is an error on every occurrence. In "Add new only" (`insert`) mode an existing key is an error. In "Add or update" (`upsert`) mode it is an update; rows whose values already match are `unchanged` and not written.
- **Blank optional cells:** keep the current value on update, and use the database default on create (every row carries the same columns, so one bulk statement can write them).
- **Dataset-level check:** the reference quality report is computed for the data before and after the import. Any new error (for example `CAPACITY_OVERFLOW`, when shrinking rooms leaves a subject with no room large enough) blocks the import.
- **No partial imports.** Any error blocks the whole file. There is no replace or delete mode.

## Persistence strategy

1. The client previews; the server returns the plan and a `planHash`.
2. On commit, the server rebuilds the plan from fresh data. It refuses (409) if the hash differs, so a concurrent edit or an imported key added in between is never overwritten unseen. The hash covers the writes **and the prior values of changed fields**; a unit test proved that a hash over the writes alone missed a concurrent edit.
3. **Single-table entities:** one PostgREST request, which is one SQL statement (`on_conflict=<key>`, `Prefer: resolution=merge-duplicates` for upsert). It writes all rows or none.
4. **Students** span two tables. PostgREST offers no transaction across requests, and no database function could be installed from this environment (no DDL path). So the order is: upsert `student_enrollments`, then insert enrollment pairs with `resolution=ignore-duplicates`. If the second write fails, the first is undone: created students are deleted and updated ones restored from the preview snapshot. The error says whether that compensation succeeded. A database function would make this atomic (see limitations).
5. Read-back verification of every written value and enrollment pair.
6. A log line with entity, mode and counts, plus an audit call; no record contents are logged. `auditService` writes through Prisma, which is not connected to the live database, so those audit rows are not stored (a pre-existing gap).

## Tests

| Test | Result |
|---|---|
| `tests/unit/csv-import.test.ts` (20): templates, export → re-import unchanged for all 6 entities, header errors, row errors with line and field, duplicates, slot rules, references, contradictory constraints, malformed CSV, create and update plans, blank optional cells, room-type warning, additive enrollments, dataset-level block | 20/20 pass |
| `tests/unit/csv-commit.test.ts` (10), against an in-memory PostgREST stand-in: preview writes nothing; one-statement upsert with read-back; export round trip after commit; plan-hash refusal; error file refused; failed write reported as failure; students and enrollments written additively; **compensation** when the enrollment write fails; insert never overwrites; export format | 10/10 pass |
| `tests/e2e/csv.spec.ts` (browser, live database): invalid file shows line-numbered errors and no confirm button; a namespaced room `ZZ-E2E-*` is previewed (nothing written), confirmed, read back as "Imported and verified", found in the export, re-imports as unchanged, and is then deleted (verified gone) | 2/2 pass |
| Authorization (browser): a student gets 403 from the import route | pass |

## Known limitations

- **Students import is compensated, not transactional.** If the compensation itself failed, the error message says so and names the problem; the roll numbers would need manual checking. A Postgres function called through `rpc/` would make it atomic. That needs a migration to be applied in Supabase; none was applied.
- Imports never delete records or enrollments. Removing data stays a deliberate, per-record action in the data workspace.
- Large files are parsed in one request (capped at 2 MB / 5,000 rows); there is no streaming or progress percentage, and none is shown.
- The faculty roster has no dedicated page; faculty import and export are available on `/admin/import` only.
