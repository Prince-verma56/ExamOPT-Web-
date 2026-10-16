/**
 * Reversible correction of one room's type, with a consequence report.
 *
 *   npx tsx --conditions=react-server scripts/room-type-correction.ts AB11-101 THEORY            # dry run (default)
 *   npx tsx --conditions=react-server scripts/room-type-correction.ts AB11-101 THEORY --apply    # writes, after a backup
 *   npx tsx --conditions=react-server scripts/room-type-correction.ts --revert <backup.json>     # restores the backup
 *
 * The dry run reads only. It reports the current and requested value, what the
 * seed sources say, whether the dataset fingerprint would match the reference
 * dataset, and how the active published timetable validates before and after,
 * computed in memory with the real validator.
 */
import fs from "node:fs";
import path from "node:path";

process.loadEnvFile(path.resolve(__dirname, "../.env"));

const BACKUP_DIR = path.resolve(__dirname, "../server/scheduling/.backups");

async function main() {
  const { querySupabase } = await import("@/lib/supabase");
  const { loadRawDataset } = await import("@/server/scheduling/loader");
  const { normalizeDataset } = await import("@/server/scheduling/normalize");
  const { fingerprintInput, prepareDataset } = await import("@/server/scheduling/engine");
  const { referenceRawDataset } = await import("@/server/scheduling/reference-dataset");
  const { validateSchedule } = await import("@/server/scheduling/validator");
  const { runStore } = await import("@/server/scheduling/persistence");

  const args = process.argv.slice(2);
  if (args[0] === "--revert") {
    const backup = JSON.parse(fs.readFileSync(args[1], "utf8")) as { room_id: string; room_type: string };
    const res = await querySupabase<{ room_type: string }[]>("rooms", { method: "PATCH", useServiceRole: true, query: { room_id: `eq.${backup.room_id}` }, body: { room_type: backup.room_type } });
    if (res.error || res.data?.[0]?.room_type !== backup.room_type) throw new Error(`Revert failed: ${res.error?.message ?? "value not confirmed"}`);
    console.log(`Reverted ${backup.room_id} to room_type=${backup.room_type} (read back and confirmed).`);
    return;
  }

  const [roomId, target, flag] = args;
  if (!roomId || !["THEORY", "LAB"].includes(target ?? "")) throw new Error("usage: room-type-correction.ts <ROOM_ID> <THEORY|LAB> [--apply]");
  const current = (await querySupabase<{ room_id: string; name: string; room_type: string; capacity: number }[]>("rooms", { useServiceRole: true, query: { select: "room_id,name,room_type,capacity", room_id: `eq.${roomId}` } })).data?.[0];
  if (!current) throw new Error(`Room ${roomId} not found.`);

  const raw = await loadRawDataset();
  const now = normalizeDataset(raw);
  const corrected = normalizeDataset({ ...raw, rooms: raw.rooms.map((r) => (r.room_id === roomId ? { ...r, room_type: target! } : r)) });
  const referenceFingerprint = prepareDataset(normalizeDataset(referenceRawDataset("normal"))).fingerprint;
  const referenceType = referenceRawDataset("normal").rooms.find((r) => r.room_id === roomId)?.room_type ?? "(not in reference)";

  const publication = await runStore.activePublication();
  const stored = publication ? await runStore.get(publication.runId) : null;
  const report = (label: string, input: typeof now) => {
    if (!stored) return `${label}: no active publication`;
    const v = validateSchedule(input, stored.assignments);
    const byCode = v.violations.reduce<Record<string, number>>((acc, x) => ({ ...acc, [x.code]: (acc[x.code] ?? 0) + 1 }), {});
    return `${label}: ${v.valid ? "VALID" : `${v.violationCount} violation(s) ${JSON.stringify(byCode)}`}`;
  };
  const usedBy = stored?.assignments.filter((a) => a.roomId === roomId).map((a) => a.examId) ?? [];

  console.log(`Room ${roomId} (${current.name}, ${current.capacity} seats)`);
  console.log(`  live room_type:        ${current.room_type}`);
  console.log(`  requested room_type:   ${target}`);
  console.log(`  reference dataset:     ${referenceType}`);
  console.log(`Dataset fingerprint`);
  console.log(`  live now:              ${fingerprintInput(now)}`);
  console.log(`  after the change:      ${fingerprintInput(corrected)}`);
  console.log(`  reference dataset:     ${referenceFingerprint}`);
  console.log(`Active publication ${publication ? `v${publication.version} (run ${publication.runId})` : "(none)"}; exams in ${roomId}: ${usedBy.join(", ") || "none"}`);
  console.log(`  ${report("against live data now  ", now)}`);
  console.log(`  ${report("against data after fix", corrected)}`);

  if (current.room_type === target) { console.log("Nothing to change."); return; }
  if (flag !== "--apply") { console.log("Dry run: nothing was written. Re-run with --apply to change the room (a backup is written first)."); return; }

  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  const backupFile = path.join(BACKUP_DIR, `room-${roomId}-${new Date().toISOString().replace(/[:.]/g, "-")}.json`);
  fs.writeFileSync(backupFile, JSON.stringify({ room_id: roomId, room_type: current.room_type, saved_at: new Date().toISOString() }, null, 2));
  const res = await querySupabase<{ room_type: string }[]>("rooms", { method: "PATCH", useServiceRole: true, query: { room_id: `eq.${roomId}` }, body: { room_type: target } });
  if (res.error || res.data?.[0]?.room_type !== target) throw new Error(`Update failed: ${res.error?.message ?? "value not confirmed"}. Backup: ${backupFile}`);
  console.log(`Applied: ${roomId} room_type ${current.room_type} -> ${target} (read back and confirmed).`);
  console.log(`Backup: ${backupFile}`);
  console.log(`Revert: npx tsx --conditions=react-server scripts/room-type-correction.ts --revert "${backupFile}"`);
}

main().catch((error) => { console.error(error instanceof Error ? error.message : error); process.exit(1); });
