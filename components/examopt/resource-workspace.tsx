"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Check, ChevronLeft, ChevronRight, FileSpreadsheet, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

type ResourceName = "rooms" | "subjects" | "time-slots" | "student-groups";
const IMPORT_ENTITY: Record<ResourceName, string> = { rooms: "rooms", subjects: "subjects", "time-slots": "timeslots", "student-groups": "student_groups" };
type Field = { key: string; label: string; type?: "text" | "number" | "date" | "time" | "select" | "checkbox"; options?: string[]; optional?: boolean };
type Config = { title: string; description: string; rowKey: string; fields: Field[]; columns: { key: string; label: string }[]; singular: string };

const configs: Record<ResourceName, Config> = {
  rooms: {
    title: "Rooms & laboratories", singular: "room", rowKey: "rooms",
    description: "Maintain the available examination venues and their capacity. Changes are saved to the connected database.",
    fields: [
      { key: "code", label: "Room code" }, { key: "name", label: "Name" }, { key: "building", label: "Building", optional: true },
      { key: "capacity", label: "Capacity", type: "number" }, { key: "roomType", label: "Type", type: "select", options: ["standard", "lab", "auditorium"] },
    ],
    columns: [{ key: "code", label: "Code" }, { key: "name", label: "Venue" }, { key: "building", label: "Building" }, { key: "capacity", label: "Capacity" }, { key: "roomType", label: "Type" }, { key: "isActive", label: "Status" }],
  },
  subjects: {
    title: "Subjects & examinations", singular: "subject", rowKey: "subjects",
    description: "Manage the examinations that will become scheduling input. Enrollment counts are read from normalized records.",
    fields: [
      { key: "code", label: "Subject code" }, { key: "name", label: "Subject name" }, { key: "program", label: "Program" },
      { key: "semester", label: "Semester", type: "number" }, { key: "durationMinutes", label: "Duration (minutes)", type: "number" },
      { key: "examType", label: "Exam type", type: "select", options: ["theory", "practical", "combined"] }, { key: "requiresLab", label: "Requires laboratory", type: "checkbox" },
    ],
    columns: [{ key: "code", label: "Code" }, { key: "name", label: "Subject" }, { key: "program", label: "Program" }, { key: "semester", label: "Semester" }, { key: "durationMinutes", label: "Duration" }, { key: "requiresLab", label: "Laboratory" }],
  },
  "time-slots": {
    title: "Examination time slots", singular: "time slot", rowKey: "slots",
    description: "Examination dates and session windows, saved to the timetable the scheduler reads. A slot used by saved runs or fixed to a subject cannot be removed.",
    fields: [
      { key: "date", label: "Date", type: "date" }, { key: "startTime", label: "Start", type: "time" }, { key: "endTime", label: "End", type: "time" },
      { key: "session", label: "Session", type: "select", options: ["morning", "evening"] }, { key: "label", label: "Slot ID (e.g. D6-M)", optional: true },
    ],
    columns: [{ key: "date", label: "Date" }, { key: "label", label: "Slot" }, { key: "dayNumber", label: "Day" }, { key: "startTime", label: "Start" }, { key: "endTime", label: "End" }, { key: "session", label: "Session" }],
  },
  "student-groups": {
    title: "Student groups", singular: "student group", rowKey: "groups",
    description: "Keep cohort and section records aligned with the student directory. Student counts are derived from the database.",
    fields: [
      { key: "code", label: "Group code" }, { key: "name", label: "Group name" }, { key: "program", label: "Program" },
      { key: "semester", label: "Semester", type: "number" }, { key: "strength", label: "Expected strength", type: "number" },
    ],
    columns: [{ key: "code", label: "Code" }, { key: "name", label: "Group" }, { key: "program", label: "Program" }, { key: "semester", label: "Semester" }, { key: "strength", label: "Expected" }, { key: "_count.students", label: "Students" }],
  },
};

function readPath(row: Record<string, unknown>, path: string): unknown {
  return path.split(".").reduce<unknown>((value, key) => value && typeof value === "object" ? (value as Record<string, unknown>)[key] : undefined, row);
}

function initialValues(resource: ResourceName) {
  return Object.fromEntries(configs[resource].fields.map((field) => [field.key, field.type === "checkbox" ? false : field.type === "select" ? field.options?.[0] ?? "" : ""]));
}

function responseError(payload: unknown) {
  const data = payload as { error?: { message?: string } };
  return data?.error?.message ?? "The request could not be completed.";
}

export function ResourceWorkspace({ resource }: { resource: ResourceName }) {
  const config = configs[resource];
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [pendingSearch, setPendingSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [editing, setEditing] = useState<Record<string, unknown> | null>(null);
  const [values, setValues] = useState<Record<string, string | boolean>>(initialValues(resource));
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "25" });
      if (search) params.set("search", search);
      const response = await fetch(`/api/v1/${resource}?${params}`, { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok || !payload.success) throw new Error(responseError(payload));
      const data = payload.data as Record<string, unknown>;
      setRows((data[config.rowKey] as Record<string, unknown>[]) ?? []);
      const pagination = data.pagination as { total?: number; pages?: number } | undefined;
      setTotal(pagination?.total ?? 0); setPages(pagination?.pages ?? 1);
    } catch (cause) {
      setRows([]); setError(cause instanceof Error ? cause.message : "Unable to load records.");
    } finally { setLoading(false); }
  }, [config.rowKey, page, resource, search]);

  useEffect(() => {
    // Fetch on mount and when filters change; state updates happen after the awaited response.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const sortedRows = useMemo(() => [...rows].sort((a, b) => String(readPath(a, config.columns[0].key) ?? "").localeCompare(String(readPath(b, config.columns[0].key) ?? ""))), [config.columns, rows]);

  function openCreate() { setEditing({}); setValues(initialValues(resource)); setNotice(null); }
  function openEdit(row: Record<string, unknown>) {
    setEditing(row);
    setValues(Object.fromEntries(config.fields.map((field) => {
      const value = row[field.key];
      return [field.key, field.type === "checkbox" ? Boolean(value) : field.key === "date" && value ? new Date(String(value)).toISOString().slice(0, 10) : String(value ?? "")];
    })));
    setNotice(null);
  }

  async function save(event: React.FormEvent) {
    event.preventDefault(); if (!editing) return;
    setSaving(true); setError(null);
    const payload = Object.fromEntries(config.fields.filter((field) => !(editing.id && field.key === "code")).map((field) => {
      const value = values[field.key];
      if (field.type === "number") return [field.key, Number(value)];
      return [field.key, value];
    }));
    try {
      const id = editing.id as string | undefined;
      const response = await fetch(id ? `/api/v1/${resource}/${id}` : `/api/v1/${resource}`, {
        method: id ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
      });
      const body = await response.json();
      if (!response.ok || !body.success) throw new Error(responseError(body));
      setEditing(null); setNotice(`${id ? "Updated" : "Added"} ${config.singular}.`); await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to save this record."); }
    finally { setSaving(false); }
  }

  async function deactivate(row: Record<string, unknown>) {
    const id = row.id as string;
    if (!window.confirm(`Remove this ${config.singular}? Existing scheduling relationships are preserved where supported.`)) return;
    setError(null);
    try {
      const response = await fetch(`/api/v1/${resource}/${id}`, { method: "DELETE" });
      const body = await response.json();
      if (!response.ok || !body.success) throw new Error(responseError(body));
      setNotice(`${config.singular[0].toUpperCase()}${config.singular.slice(1)} removed.`); await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to remove this record."); }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div><h1 className="text-2xl font-semibold tracking-tight">{config.title}</h1><p className="mt-1 max-w-2xl text-sm text-muted-foreground">{config.description}</p></div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Link href={`/admin/import?entity=${IMPORT_ENTITY[resource]}`} className="inline-flex h-9 items-center gap-1.5 rounded-md border bg-background px-3 text-sm font-medium hover:bg-muted"><FileSpreadsheet className="size-4" />Import / export CSV</Link>
          <Button onClick={openCreate}><Plus /> Add {config.singular}</Button>
        </div>
      </div>

      {(error || notice) && <div className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${error ? "border-destructive/30 bg-destructive/10 text-destructive" : "border-emerald-500/30 bg-emerald-500/10 text-emerald-700"}`}>
        {error ? <X className="size-4" /> : <Check className="size-4" />}{error ?? notice}
      </div>}

      {editing && <Card className="border-primary/25"><CardHeader className="pb-3"><CardTitle className="text-base">{editing.id ? `Edit ${config.singular}` : `Add ${config.singular}`}</CardTitle><CardDescription>Required fields are validated by the API before any database change.</CardDescription></CardHeader><CardContent>
        <form onSubmit={save} className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {config.fields.map((field) => <label key={field.key} className={`space-y-1.5 text-sm ${field.type === "checkbox" ? "flex items-center gap-2 self-end pb-2" : ""}`}>
            {field.type === "checkbox" ? <><input type="checkbox" checked={Boolean(values[field.key])} onChange={(event) => setValues((old) => ({ ...old, [field.key]: event.target.checked }))} /><span>{field.label}</span></> : <><span className="font-medium">{field.label}{field.optional ? " (optional)" : ""}</span>{field.type === "select" ? <select className="h-8 w-full rounded-md border bg-background px-2 text-sm" value={String(values[field.key] ?? "")} onChange={(event) => setValues((old) => ({ ...old, [field.key]: event.target.value }))}>{field.options?.map((option) => <option key={option} value={option}>{option}</option>)}</select> : <Input required={!field.optional} disabled={Boolean(editing.id && field.key === "code")} type={field.type ?? "text"} value={String(values[field.key] ?? "")} onChange={(event) => setValues((old) => ({ ...old, [field.key]: event.target.value }))} />}</>}
          </label>)}
          <div className="flex items-end gap-2"><Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save"}</Button><Button type="button" variant="outline" onClick={() => setEditing(null)}>Cancel</Button></div>
        </form>
      </CardContent></Card>}

      <Card><CardHeader className="pb-3"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><CardTitle className="text-base">Database records</CardTitle><CardDescription>{total} record{total === 1 ? "" : "s"} found</CardDescription></div><form className="relative w-full sm:w-80" onSubmit={(event) => { event.preventDefault(); setPage(1); setSearch(pendingSearch); }}><Search className="pointer-events-none absolute left-3 top-2.5 size-4 text-muted-foreground" /><Input className="pl-9" placeholder={`Search ${config.singular}s`} value={pendingSearch} onChange={(event) => setPendingSearch(event.target.value)} /></form></div></CardHeader><CardContent>
        <div className="overflow-x-auto rounded-lg border"><table className="w-full min-w-[720px] text-sm"><thead className="bg-muted/50 text-left text-xs text-muted-foreground"><tr>{config.columns.map((column) => <th key={column.key} className="px-3 py-2.5 font-medium">{column.label}</th>)}<th className="px-3 py-2.5 text-right">Actions</th></tr></thead><tbody>
          {loading ? <tr><td colSpan={config.columns.length + 1} className="px-3 py-10 text-center text-muted-foreground">Loading records…</td></tr> : sortedRows.length === 0 ? <tr><td colSpan={config.columns.length + 1} className="px-3 py-10 text-center text-muted-foreground">No {config.singular}s match this view.</td></tr> : sortedRows.map((row) => <tr key={String(row.id)} className="border-t hover:bg-muted/30">{config.columns.map((column) => { const value = readPath(row, column.key); return <td key={column.key} className="px-3 py-3">{column.key === "requiresLab" ? <Badge variant={value ? "secondary" : "outline"}>{value ? "Required" : "Not required"}</Badge> : typeof value === "boolean" ? <Badge variant={value ? "secondary" : "outline"}>{value ? "Available" : "Inactive"}</Badge> : column.key === "roomType" || column.key === "session" ? <Badge variant="outline" className="capitalize">{String(value ?? "—")}</Badge> : column.key === "date" && value ? new Date(String(value)).toLocaleDateString() : value === null || value === undefined || value === "" ? <span className="text-muted-foreground">—</span> : String(value)}</td>; })}<td className="px-3 py-3"><div className="flex justify-end gap-1"><Button size="icon-sm" variant="ghost" aria-label={`Edit ${config.singular}`} onClick={() => openEdit(row)}><Pencil /></Button><Button size="icon-sm" variant="ghost" className="text-destructive hover:text-destructive" aria-label={`Remove ${config.singular}`} onClick={() => void deactivate(row)}><Trash2 /></Button></div></td></tr>)}
        </tbody></table></div>
        <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground"><span>Page {page} of {pages}</span><div className="flex gap-2"><Button size="sm" variant="outline" disabled={page <= 1 || loading} onClick={() => setPage((current) => current - 1)}><ChevronLeft /> Previous</Button><Button size="sm" variant="outline" disabled={page >= pages || loading} onClick={() => setPage((current) => current + 1)}>Next <ChevronRight /></Button></div></div>
      </CardContent></Card>
    </div>
  );
}
