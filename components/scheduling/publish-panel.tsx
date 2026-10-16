"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowUpRight, Download, Loader2, Megaphone, ShieldCheck, ShieldX } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button, buttonVariants } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { api, downloadCsv, errorMessage } from "./api";
import { ALGORITHM_LABEL, dateTime } from "./format";
import type { Publication } from "@/server/scheduling/persistence";
import type { PublishRejection } from "@/server/scheduling/publication";

const EXPORTS = [
  { kind: "timetable", label: "Timetable", hint: "One row per exam, with room and invigilator" },
  { kind: "rooms", label: "Room allocation", hint: "Seats used and empty per room and slot" },
  { kind: "invigilation", label: "Invigilation duties", hint: "One row per faculty duty" },
] as const;

/** CSV exports of a saved run, or of the active published timetable when no run is given. */
export function ExportMenu({ runId, className }: { runId?: string; className?: string }) {
  const [busy, setBusy] = useState(false);
  async function run(kind: (typeof EXPORTS)[number]["kind"]) {
    setBusy(true);
    try { const data = await downloadCsv(kind, runId); toast.success(`Exported ${data.rows} rows`, { description: data.filename }); }
    catch (error) { toast.error("Export failed", { description: errorMessage(error) }); }
    finally { setBusy(false); }
  }
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="outline" className={cn("h-9", className)} disabled={busy} />}>
        {busy ? <Loader2 className="animate-spin" /> : <Download />}Export CSV
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="text-xs text-muted-foreground">{runId ? "This run" : "Published timetable"}</DropdownMenuLabel>
        {EXPORTS.map((item) => (
          <DropdownMenuItem key={item.kind} onClick={() => void run(item.kind)} className="flex flex-col items-start gap-0">
            <span className="font-medium">{item.label}</span>
            <span className="text-xs text-muted-foreground">{item.hint}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * Publish control. The button reflects the server's gate for this run; the
 * server re-checks the gate on publish, so a stale page cannot publish an
 * invalid schedule.
 */
export function PublishButton({ runId, algorithm, gate, onPublished }: {
  runId: string;
  algorithm: string;
  gate: { allowed: boolean; rejections: PublishRejection[] };
  onPublished: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const alreadyActive = gate.rejections.some((r) => r.code === "ALREADY_ACTIVE");

  async function publish() {
    setBusy(true); setError(null);
    try {
      const result = await api<{ publication: Publication; retiredVersions: number[]; retireError: string | null }>(`/scheduling/runs/${encodeURIComponent(runId)}/publish`, { json: title.trim() ? { title: title.trim() } : {} });
      toast.success(`Published as version ${result.publication.version}`, { description: result.retireError ?? (result.retiredVersions.length ? `Version ${result.retiredVersions.join(", ")} kept as history.` : undefined) });
      setOpen(false); setTitle(""); onPublished();
    } catch (cause) { setError(errorMessage(cause)); }
    finally { setBusy(false); }
  }

  if (alreadyActive) return <span className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-success/30 bg-success/5 px-3 text-sm text-success"><ShieldCheck className="size-4" />Active timetable</span>;

  return (
    <>
      <Button className="h-9" disabled={!gate.allowed} onClick={() => setOpen(true)} title={gate.allowed ? "Publish this run" : gate.rejections.map((r) => r.message).join(" ")}>
        <Megaphone />Publish
      </Button>
      <Dialog open={open} onOpenChange={(value) => { if (!busy) setOpen(value); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl font-normal">Publish this timetable?</DialogTitle>
            <DialogDescription>
              {ALGORITHM_LABEL[algorithm] ?? algorithm} run <code className="font-mono text-xs">{runId}</code> becomes the active timetable that students and faculty see. The current version stays in the history and is not deleted.
            </DialogDescription>
          </DialogHeader>
          <ul className="space-y-1.5 rounded-lg border bg-muted/30 p-3 text-xs text-muted-foreground">
            <li className="flex items-center gap-2"><ShieldCheck className="size-3.5 text-success" />Generated by the ExamOpt engine and FEASIBLE</li>
            <li className="flex items-center gap-2"><ShieldCheck className="size-3.5 text-success" />Passes all 10 hard-constraint rules against today&apos;s data</li>
            <li className="flex items-center gap-2"><ShieldCheck className="size-3.5 text-success" />Invigilator duties break no rule</li>
          </ul>
          <label className="space-y-1.5 text-sm">
            <span className="font-medium">Title <span className="font-normal text-muted-foreground">(optional)</span></span>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={160} placeholder="Examination Timetable (Version N)" />
          </label>
          {error && <p className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"><ShieldX className="mt-0.5 size-4 shrink-0" />{error}</p>}
          <DialogFooter>
            <Button variant="outline" disabled={busy} onClick={() => setOpen(false)}>Cancel</Button>
            <Button disabled={busy} onClick={() => void publish()}>{busy ? <Loader2 className="animate-spin" /> : <Megaphone />}Publish</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/** Why a run cannot be published, shown under the validation banner. */
export function PublishBlockers({ rejections }: { rejections: PublishRejection[] }) {
  const shown = rejections.filter((r) => r.code !== "ALREADY_ACTIVE");
  if (!shown.length) return null;
  return (
    <div className="rounded-xl border border-dashed p-4">
      <p className="text-sm font-medium">This run cannot be published</p>
      <ul className="mt-2 space-y-1 text-sm text-muted-foreground">{shown.map((r) => <li key={r.code} className="flex gap-2"><code className="font-mono text-[11px] text-foreground/80">{r.code}</code><span>{r.message}</span></li>)}</ul>
    </div>
  );
}

export function PublicationHistory({ publications, currentRunId }: { publications: Publication[] | null; currentRunId: string | null }) {
  if (!publications) return null;
  return (
    <section className="space-y-3" aria-labelledby="publication-history">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="publication-history" className="text-sm font-semibold">Publication history</h2>
        <p className="text-xs text-muted-foreground">Every version is kept; the newest active version is what students see.</p>
      </div>
      {!publications.length ? <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">Nothing has been published yet.</p> : (
        <ol className="divide-y overflow-hidden rounded-xl border bg-card">
          {publications.map((p) => (
            <li key={p.publishedId} className={cn("flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2.5 text-sm", p.runId === currentRunId && "bg-primary/3")}>
              <span className="w-10 font-mono text-xs font-semibold">v{p.version}</span>
              <span className="min-w-0 flex-1 truncate">{p.title}</span>
              {p.isActive && <span className="rounded-full border border-success/30 bg-success/5 px-2 text-[11px] text-success">active</span>}
              <span className="text-xs text-muted-foreground">{dateTime(p.publishedAt)} · {p.publishedBy}</span>
              <Link href={`/admin/schedules?run=${encodeURIComponent(p.runId)}`} className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "h-7 font-mono text-[11px]")}>{p.runId}<ArrowUpRight className="size-3.5" /></Link>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
