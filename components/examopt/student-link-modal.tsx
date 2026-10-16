"use client";

import { useState } from "react";
import { Link2, Plus, Trash2, CheckCircle2, UserCheck, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { api, errorMessage } from "@/components/scheduling/api";

interface StudentAccountLink {
  key: string;
  rollNo: string;
  linkedAt: string;
  linkedBy: string;
  note?: string;
}

export function StudentLinkModal({ onLinked }: { onLinked?: () => void }) {
  const [open, setOpen] = useState(false);
  const [links, setLinks] = useState<StudentAccountLink[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form inputs
  const [emailOrUserId, setEmailOrUserId] = useState("");
  const [rollNo, setRollNo] = useState("GLA26-BCA-0001");
  const [note, setNote] = useState("Student testing account");

  const loadLinks = async () => {
    setLoading(true);
    try {
      const res = await api<{ links: StudentAccountLink[] }>("/students/link");
      setLinks(res.links);
    } catch {
      // Ignored
    } finally {
      setLoading(false);
    }
  };

  // Refresh the list each time the dialog opens: an event, not an effect on `open`.
  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (next) {
      setError(null);
      setSuccess(null);
      void loadLinks();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailOrUserId.trim() || !rollNo.trim()) return;

    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      await api<{ success: boolean }>("/students/link", {
        method: "POST",
        body: JSON.stringify({
          emailOrUserId: emailOrUserId.trim(),
          rollNo: rollNo.trim().toUpperCase(),
          note: note.trim() || undefined,
        }),
      });

      setSuccess(`Successfully linked ${emailOrUserId} to roll number ${rollNo.toUpperCase()}!`);
      setEmailOrUserId("");
      await loadLinks();
      onLinked?.();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleUnlink = async (key: string) => {
    try {
      await api<{ success: boolean }>("/students/link", {
        method: "DELETE",
        body: JSON.stringify({ emailOrUserId: key }),
      });
      await loadLinks();
      onLinked?.();
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button variant="outline" size="sm" className="gap-1.5 text-xs" />}>
        <Link2 className="size-3.5 text-primary" />
        Link Student Account
      </DialogTrigger>
      <DialogContent className="max-w-md sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="grid size-8 place-items-center rounded-lg bg-primary/10 text-primary">
              <UserCheck className="size-4" />
            </div>
            <div>
              <DialogTitle className="text-base">Link Student Testing Account</DialogTitle>
              <DialogDescription className="text-xs">
                Associate a Clerk account with a synthetic student roll number for timetable testing.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
            <AlertCircle className="size-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-800">
            <CheckCircle2 className="size-4 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {/* Link Form */}
        <form onSubmit={handleSubmit} className="space-y-3 rounded-xl border bg-muted/20 p-4 text-xs">
          <div>
            <label className="block font-medium mb-1 text-foreground">Clerk Account Email or User ID</label>
            <Input
              value={emailOrUserId}
              onChange={(e) => setEmailOrUserId(e.target.value)}
              placeholder="e.g. student.test@example.com or user_2..."
              className="h-8 text-xs bg-background"
              required
            />
            <p className="mt-1 text-[11px] text-muted-foreground">
              The verified email or Clerk ID of the student testing account.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block font-medium mb-1 text-foreground">Synthetic Roll Number</label>
              <Input
                value={rollNo}
                onChange={(e) => setRollNo(e.target.value.toUpperCase())}
                placeholder="GLA26-BCA-0001"
                className="h-8 font-mono text-xs bg-background"
                required
              />
            </div>
            <div>
              <label className="block font-medium mb-1 text-foreground">Note (Optional)</label>
              <Input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. Hackathon Judge Account"
                className="h-8 text-xs bg-background"
              />
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <Button size="sm" type="submit" disabled={submitting || !emailOrUserId.trim() || !rollNo.trim()} className="gap-1.5">
              <Plus className="size-3.5" />
              {submitting ? "Linking..." : "Save Identity Link"}
            </Button>
          </div>
        </form>

        {/* Existing Active Links */}
        <div className="space-y-2 pt-2">
          <p className="text-xs font-semibold text-foreground">Active Account Links ({links.length})</p>
          {loading ? (
            <p className="text-xs text-muted-foreground">Loading links...</p>
          ) : links.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">
              No manual account links registered yet. Accounts without explicit links use Clerk metadata or server configuration.
            </p>
          ) : (
            <div className="max-h-40 overflow-y-auto divide-y rounded-lg border bg-card text-xs">
              {links.map((link) => (
                <div key={link.key} className="flex items-center justify-between p-2.5">
                  <div className="min-w-0 pr-2">
                    <p className="font-medium truncate">{link.key}</p>
                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mt-0.5">
                      <Badge variant="outline" className="font-mono text-[10px] px-1 py-0">
                        {link.rollNo}
                      </Badge>
                      {link.note && <span>· {link.note}</span>}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7 text-muted-foreground hover:text-destructive"
                    onClick={() => handleUnlink(link.key)}
                    title="Remove link"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
