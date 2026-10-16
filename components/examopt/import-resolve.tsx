"use client";

import { useState } from "react";
import { CircleAlert, Loader2, Wand2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { FixAction, FixOption } from "@/server/examopt/csv-fixes";
import type { csvService } from "@/server/examopt/csv-service";

export type ImportPreview = Awaited<ReturnType<typeof csvService.preview>>;

/** Every safe automatic fix in the preview, one per problem. */
export function autoActions(plan: ImportPreview): FixAction[] {
  return [...plan.fixes.rows, ...plan.fixes.dataset].flatMap((options) => options.find((o) => o.auto)?.actions ?? []);
}

/**
 * The problems of a dry run with ways to resolve each one: suggested fixes
 * computed by the server from the current data, or a value typed by hand.
 * Applying anything re-validates the corrected file; nothing is written to the
 * database until the import is confirmed.
 */
export function ResolvePanel({ plan, busy, onApply }: {
  plan: ImportPreview;
  busy: boolean;
  onApply: (actions: FixAction[], description: string) => void;
}) {
  const [edits, setEdits] = useState<Record<string, string>>({});
  const problems = plan.errors.length + (plan.quality?.newErrors.length ?? 0);
  if (!problems) return null;
  const auto = autoActions(plan);
  const headerOnly = plan.errors.every((e) => e.line <= 1);

  const optionButtons = (options: FixOption[]) => (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o, i) => (
        <Button key={i} type="button" size="sm" variant={o.auto ? "default" : "outline"} className="h-auto min-h-7 py-1 text-left text-xs whitespace-normal" disabled={busy} onClick={() => onApply(o.actions, o.label)}>
          {o.label}
        </Button>
      ))}
    </div>
  );

  return (
    <div className="space-y-3 rounded-xl border border-destructive/25 bg-destructive/3 p-4" aria-live="polite">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-sm font-semibold"><CircleAlert className="size-4 text-destructive" />Resolve {problems} conflict{problems === 1 ? "" : "s"}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {plan.fixes.autoFixable} {plan.fixes.autoFixable === 1 ? "has" : "have"} a safe fix computed from your current data; the rest need your choice or a value typed below. Every fix edits the file only and re-validates it.
          </p>
        </div>
        {auto.length > 0 && !headerOnly && (
          <Button disabled={busy} onClick={() => onApply(auto, `${plan.fixes.autoFixable} safe fixes`)}>
            {busy ? <Loader2 className="animate-spin" /> : <Wand2 />}Apply {plan.fixes.autoFixable} safe fix{plan.fixes.autoFixable === 1 ? "" : "es"}
          </Button>
        )}
      </div>

      <div className="overflow-x-auto rounded-lg border bg-card">
        <table className="w-full min-w-[760px] text-xs">
          <thead className="bg-muted/50 text-left text-muted-foreground">
            <tr><th className="px-3 py-1.5 font-medium">Line</th><th className="px-3 py-1.5 font-medium">Record</th><th className="px-3 py-1.5 font-medium">Problem</th><th className="w-[40%] px-3 py-1.5 font-medium">How to resolve</th></tr>
          </thead>
          <tbody>
            {plan.errors.slice(0, 200).map((e, i) => {
              const key = `${e.line}|${e.field}`;
              const editable = e.line >= 2 && plan.columns.includes(e.field);
              return (
                <tr key={`r${i}`} className="border-t align-top">
                  <td className="px-3 py-2 tabular-nums">{e.line || "file"}</td>
                  <td className="px-3 py-2"><span className="font-mono">{e.key ?? "—"}</span>{e.field && <span className="block font-mono text-muted-foreground">{e.field}</span>}</td>
                  <td className="px-3 py-2"><code className="mr-1.5 font-mono text-[10.5px] text-destructive">{e.code}</code>{e.message}</td>
                  <td className="space-y-1.5 px-3 py-2">
                    {plan.fixes.rows[i]?.length ? optionButtons(plan.fixes.rows[i]) : null}
                    {editable && (
                      <form className="flex gap-1.5" onSubmit={(ev) => { ev.preventDefault(); const value = edits[key] ?? ""; onApply([{ type: "set", line: e.line, field: e.field, value }], `${e.field} on line ${e.line} set to "${value}"`); }}>
                        <Input value={edits[key] ?? ""} onChange={(ev) => setEdits((old) => ({ ...old, [key]: ev.target.value }))} placeholder={`Type a new ${e.field}`} aria-label={`New ${e.field} for line ${e.line}`} className="h-7 text-xs" />
                        <Button type="submit" size="sm" variant="outline" className="h-7 text-xs" disabled={busy}>Set</Button>
                      </form>
                    )}
                  </td>
                </tr>
              );
            })}
            {plan.quality?.newErrors.map((e, i) => (
              <tr key={`d${i}`} className="border-t align-top">
                <td className="px-3 py-2">dataset</td>
                <td className="px-3 py-2"><span className="font-mono">{e.rowId}</span><span className="block font-mono text-muted-foreground">{e.table}.{e.field}</span></td>
                <td className="px-3 py-2"><code className="mr-1.5 font-mono text-[10.5px] text-destructive">{e.code}</code>{e.message}</td>
                <td className={cn("px-3 py-2", !plan.fixes.dataset[i]?.length && "text-muted-foreground")}>
                  {plan.fixes.dataset[i]?.length ? optionButtons(plan.fixes.dataset[i]) : "Change the conflicting rows in the file, or the existing records in the data workspace."}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {plan.errors.length > 200 && <p className="border-t px-3 py-1.5 text-xs text-muted-foreground">Showing 200 of {plan.errors.length} row problems; apply fixes to see the rest.</p>}
      </div>
    </div>
  );
}
