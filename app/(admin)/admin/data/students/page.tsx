"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, CircleAlert, RefreshCw, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api, errorMessage } from "@/components/scheduling/api";
import { num } from "@/components/scheduling/format";
import { PageIntro, StatStrip } from "@/components/scheduling/page-intro";
import { Segmented } from "@/components/scheduling/segmented";
import { StudentLinkModal } from "@/components/examopt/student-link-modal";

type Student = { rollNo: string; name: string; groupId: string; groupName: string | null; program: string | null; semester: number | null; hasBacklog: boolean; subjectIds: string[]; backlogSubjectIds: string[] };
type Response = { students: Student[]; pagination: { page: number; pages: number; total: number }; metrics: { totalStudents: number; backlogStudents: number; backlogEnrollments: number; subjectEnrollments: number }; programs: string[] };

/** Student directory read from the same enrollment tables the scheduler uses. */
export default function StudentsPage() {
  const [data, setData] = useState<Response | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [pending, setPending] = useState("");
  const [program, setProgram] = useState("all");
  const [backlog, setBacklog] = useState<"all" | "true">("all");

  const load = useCallback(async () => {
    setError(null);
    const params = new URLSearchParams({ page: String(page), limit: "25", ...(search ? { search } : {}), ...(program !== "all" ? { program } : {}), ...(backlog === "true" ? { hasBacklog: "true" } : {}) });
    try { setData(await api<Response>(`/students?${params}`)); }
    catch (e) { setError(errorMessage(e)); }
  }, [page, search, program, backlog]);

  useEffect(() => {
    // Fetch on mount and when filters change; state is set after the response.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const m = data?.metrics;
  return (
    <div className="space-y-8 pb-8">
      <PageIntro
        eyebrow="Data workspace"
        title="Students"
        description="Every student and the examinations they sit, read from the enrollment records the scheduler uses to build the conflict graph. A backlog exam is one outside the student's own program or below their semester; it creates cross-semester conflicts."
        actions={<StudentLinkModal onLinked={() => void load()} />}
      />

      {error && <p className="flex items-center justify-between gap-3 rounded-xl border border-destructive/30 bg-destructive/4 p-4 text-sm text-destructive"><span className="flex items-center gap-2"><CircleAlert className="size-4" />{error}</span><Button variant="outline" size="sm" onClick={() => void load()}><RefreshCw />Retry</Button></p>}

      {!m ? <Skeleton className="h-21 rounded-xl" /> : (
        <StatStrip items={[
          { label: "Students", value: num(m.totalStudents) },
          { label: "Subject enrollments", value: num(m.subjectEnrollments), hint: m.totalStudents ? `${num(m.subjectEnrollments / m.totalStudents, 2)} per student` : undefined },
          { label: "Students with backlog", value: num(m.backlogStudents) },
          { label: "Backlog exam seats", value: num(m.backlogEnrollments), hint: "cross-semester or cross-program" },
        ]} />
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Segmented label="Program" value={program} onChange={(v) => { setProgram(v); setPage(1); }} options={[{ value: "all", label: "All programs" }, ...(data?.programs ?? []).map((p) => ({ value: p, label: p }))]} />
          <Segmented label="Backlog" value={backlog} onChange={(v) => { setBacklog(v); setPage(1); }} options={[{ value: "all", label: "Everyone" }, { value: "true", label: "With backlog" }]} />
        </div>
        <form className="relative w-full sm:w-72" onSubmit={(e) => { e.preventDefault(); setPage(1); setSearch(pending.trim()); }}>
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input value={pending} onChange={(e) => setPending(e.target.value)} placeholder="Name or roll number" className="h-8 bg-card pl-8" aria-label="Search students" />
        </form>
      </div>

      <div className="overflow-x-auto rounded-xl border bg-card">
        <Table className="min-w-200">
          <TableHeader><TableRow className="bg-muted/40 hover:bg-muted/40">
            <TableHead className="pl-4">Roll number</TableHead><TableHead>Name</TableHead><TableHead>Group</TableHead><TableHead>Examinations</TableHead><TableHead className="pr-4">Backlog exams</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {!data && Array.from({ length: 8 }, (_, i) => <TableRow key={i}><TableCell colSpan={5}><Skeleton className="h-5" /></TableCell></TableRow>)}
            {data?.students.map((s) => (
              <TableRow key={s.rollNo}>
                <TableCell className="pl-4 font-mono text-xs font-semibold">{s.rollNo}</TableCell>
                <TableCell>{s.name}</TableCell>
                <TableCell className="text-xs"><span className="font-mono">{s.groupId}</span><span className="block text-muted-foreground">{s.program} · Sem {s.semester}</span></TableCell>
                <TableCell className="max-w-72 font-mono text-[11px] leading-5 text-muted-foreground">{s.subjectIds.join(" · ") || "—"}</TableCell>
                <TableCell className="pr-4 font-mono text-[11px]">{s.backlogSubjectIds.length ? <span className="text-warning">{s.backlogSubjectIds.join(" · ")}</span> : <span className="text-muted-foreground">—</span>}</TableCell>
              </TableRow>
            ))}
            {data && !data.students.length && <TableRow><TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">No students match these filters.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </div>

      {data && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>{num(data.pagination.total)} students · page {data.pagination.page} of {data.pagination.pages}</span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}><ChevronLeft />Previous</Button>
            <Button size="sm" variant="outline" disabled={page >= data.pagination.pages} onClick={() => setPage((p) => p + 1)}>Next<ChevronRight /></Button>
          </div>
        </div>
      )}
    </div>
  );
}
