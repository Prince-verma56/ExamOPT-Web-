"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { SlidersHorizontal, ShieldAlert, Sparkles, CheckCircle2, Lock } from "lucide-react";

const HARD_CONSTRAINTS = [
  {
    id: "h1",
    name: "Zero Student Overlap (No Clash)",
    desc: "A student cannot be scheduled for two concurrent examinations in the same time slot, including backlog enrollments.",
    enforced: true,
    locked: true,
    type: "CRITICAL HARD",
  },
  {
    id: "h2",
    name: "Room Single-Booking Rule",
    desc: "A physical venue cannot host two disparate examinations simultaneously.",
    enforced: true,
    locked: true,
    type: "CRITICAL HARD",
  },
  {
    id: "h3",
    name: "Room Seating Capacity Strict Bound",
    desc: "Total examinees assigned to any venue cannot exceed the physical room seating capacity.",
    enforced: true,
    locked: true,
    type: "CRITICAL HARD",
  },
  {
    id: "h4",
    name: "Specialized Laboratory Requirement",
    desc: "Practical exams (e.g. BCA-104P, BCADS-104P, MCA-104P) must exclusively be scheduled in designated computing laboratories.",
    enforced: true,
    locked: true,
    type: "DOMAIN HARD",
  },
  {
    id: "h5",
    name: "Faculty Invigilator Non-Concurrency",
    desc: "A faculty invigilator cannot be scheduled in two separate rooms during the same session.",
    enforced: true,
    locked: true,
    type: "OPERATIONAL HARD",
  },
];

const SOFT_CONSTRAINTS = [
  {
    id: "s1",
    name: "Consecutive Session Spacing",
    desc: "Avoid scheduling back-to-back exams (Morning + Evening on the same day) for the same student cohort when feasible.",
    weight: "Weight: 35%",
    active: true,
  },
  {
    id: "s2",
    name: "Venue Seat Utilization Maximization",
    desc: "Group examinations to maximize room occupancy (current optimal: 87.63% via Welsh-Powell).",
    weight: "Weight: 30%",
    active: true,
  },
  {
    id: "s3",
    name: "Faculty Duty Load Balancing",
    desc: "Distribute invigilation slots uniformly across all 20 department faculty members.",
    weight: "Weight: 20%",
    active: true,
  },
  {
    id: "s4",
    name: "Campus Block Minimization",
    desc: "Prefer scheduling exams of the same academic program within adjacent rooms in CSED Block AB-XI.",
    weight: "Weight: 15%",
    active: true,
  },
];

export default function ConstraintsPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <SlidersHorizontal className="h-6 w-6 text-primary" />
            Optimization Constraint Matrix
          </h1>
          <p className="text-sm text-muted-foreground">
            Formulation of Hard and Soft Constraints for Problem Statement C10
          </p>
        </div>
        <Badge className="bg-emerald-600 text-white font-mono text-xs">
          0 Hard Violations in Current Model
        </Badge>
      </div>

      {/* Hard Constraints */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-destructive" />
            <CardTitle className="text-lg">Hard Constraints (Non-Negotiable)</CardTitle>
          </div>
          <CardDescription className="text-xs">
            Any violation causes an immediate timetable infeasibility verdict. Handled during graph coloring node assignment.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {HARD_CONSTRAINTS.map((c) => (
            <div
              key={c.id}
              className="flex items-center justify-between rounded-lg border p-3.5 bg-muted/20"
            >
              <div className="space-y-1 max-w-2xl">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm text-foreground">{c.name}</span>
                  <Badge variant="destructive" className="text-[10px] py-0 h-4">
                    {c.type}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">{c.desc}</p>
              </div>
              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-4 w-4" />
                <span className="hidden sm:inline">Enforced</span>
                <Lock className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Soft Constraints */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-amber-500" />
            <CardTitle className="text-lg">Soft Constraints (Penalty Optimization)</CardTitle>
          </div>
          <CardDescription className="text-xs">
            Evaluated by the objective function to maximize timetable quality score (Welsh-Powell benchmark: 77.05 / 100).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {SOFT_CONSTRAINTS.map((c) => (
            <div
              key={c.id}
              className="flex items-center justify-between rounded-lg border p-3.5 hover:bg-muted/30 transition-colors"
            >
              <div className="space-y-1 max-w-2xl">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm text-foreground">{c.name}</span>
                  <Badge variant="secondary" className="text-[10px] font-mono">
                    {c.weight}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">{c.desc}</p>
              </div>
              <div className="flex items-center gap-2">
                <Switch defaultChecked={c.active} />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
