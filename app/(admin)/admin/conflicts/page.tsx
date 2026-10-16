"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { GitBranch, CheckCircle2, AlertTriangle, ShieldCheck, Zap } from "lucide-react";

export default function ConflictsPage() {
  const [injectedConflict, setInjectedConflict] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <GitBranch className="h-6 w-6 text-primary" />
              Conflict Analysis & Graph Coloring Graph
            </h1>
            <Badge className="bg-emerald-600 text-white font-mono text-xs">
              0 Hard Clashes
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Detect candidate overlaps, room double-bookings, and backlog student exam collisions.
          </p>
        </div>
        <Button
          size="sm"
          variant={injectedConflict ? "destructive" : "outline"}
          onClick={() => setInjectedConflict(!injectedConflict)}
          className="gap-1.5 text-xs"
        >
          {injectedConflict ? "Clear Injected Conflict" : "Simulate Backlog Clash"}
        </Button>
      </div>

      {injectedConflict ? (
        <Card className="border-destructive/50 bg-destructive/[0.04]">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              <CardTitle className="text-base">1 Hard Conflict Detected via Simulation</CardTitle>
            </div>
            <CardDescription className="text-xs">
              Direct student enrollment collision triggered between core curriculum and backlog exam.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-lg border bg-card p-4 space-y-2 text-xs">
              <div className="flex items-center justify-between font-mono font-bold text-foreground">
                <span>Subject BCA-101 ⚡ Subject BCA-301</span>
                <Badge variant="destructive">SLOT CLASH (D1-M)</Badge>
              </div>
              <p className="text-muted-foreground">
                12 Backlog students in group <strong>GRP-BCA-3A</strong> are enrolled in both BCA-301 and have a backlog in BCA-101. They cannot write two exams simultaneously.
              </p>
              <div className="rounded bg-muted/60 p-2 font-mono text-[11px] text-foreground">
                Auto-Remediation: Reschedule BCA-101 to Slot D1-M and BCA-301 to Slot D2-M. Conflict score returns to 0.
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-emerald-500/40 bg-emerald-500/[0.03]">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
              <ShieldCheck className="h-5 w-5" />
              <CardTitle className="text-base font-bold">Timetable Verified 100% Conflict-Free</CardTitle>
            </div>
            <CardDescription className="text-xs">
              All 1,735 student-subject enrollments and 70 backlog cases have zero overlapping exams.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-1">
              <div className="rounded-lg border bg-card p-3">
                <span className="text-muted-foreground block">Student Exam Clashes</span>
                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-lg">0</span>
              </div>
              <div className="rounded-lg border bg-card p-3">
                <span className="text-muted-foreground block">Room Double-Bookings</span>
                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-lg">0</span>
              </div>
              <div className="rounded-lg border bg-card p-3">
                <span className="text-muted-foreground block">Capacity Overflows</span>
                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-lg">0</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Conflict Graph Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-bold">
            Examination Interference Graph Topology
          </CardTitle>
          <CardDescription className="text-xs">
            Vertices represent the 24 course examinations; edges represent shared student enrollments. Chromatic number is 6 colors (slots).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border bg-muted/20 p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="text-muted-foreground">Total Vertices (Exams): <strong className="text-foreground">24</strong></span>
              <span className="text-muted-foreground">Interference Edges: <strong className="text-foreground">78</strong></span>
              <span className="text-muted-foreground">Graph Density: <strong className="text-foreground">0.282</strong></span>
              <span className="text-muted-foreground">Chromatic Number (Slots): <strong className="text-primary font-bold">6</strong></span>
            </div>
            <div className="rounded bg-background p-3 text-xs text-muted-foreground font-mono space-y-1">
              <div>// Welsh-Powell Graph Coloring Partition:</div>
              <div>Slot 1 (D1-M): [BCA-101, BCADS-101, MCA-101, BCA-301]</div>
              <div>Slot 2 (D1-E): [BCA-102, BCADS-102, MCA-102, BCADS-301]</div>
              <div>Slot 3 (D2-M): [BCA-103, BCADS-103, BCA-302, MCA-301]</div>
              <div>Slot 4 (D2-E): [BCA-104P, BCADS-104P, BCADS-302, MCA-302]</div>
              <div>Slot 5 (D3-M): [BCA-303, BCADS-303, MCA-103, MCA-303]</div>
              <div>Slot 6 (D3-E): [BCA-304P, BCADS-304P, MCA-104P, MCA-304P]</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
