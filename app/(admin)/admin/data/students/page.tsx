"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { GraduationCap, Search, AlertCircle, CheckCircle2 } from "lucide-react";

const SAMPLE_STUDENT_ROWS = [
  { roll: "GLA26-BCA-0001", name: "Aarav Sharma", program: "BCA", sem: 1, group: "GRP-BCA-S1", backlogs: 0, status: "Normal" },
  { roll: "GLA26-BCA-0002", name: "Diya Patel", program: "BCA", sem: 1, group: "GRP-BCA-S1", backlogs: 0, status: "Normal" },
  { roll: "GLA26-BCA-0003", name: "Rohan Verma", program: "BCA", sem: 1, group: "GRP-BCA-S1", backlogs: 1, status: "Backlog (BCA-101)" },
  { roll: "GLA26-BCA-0004", name: "Ananya Gupta", program: "BCA", sem: 1, group: "GRP-BCA-S1", backlogs: 0, status: "Normal" },
  { roll: "GLA26-BCA-0005", name: "Ishaan Singh", program: "BCA", sem: 1, group: "GRP-BCA-S2", backlogs: 2, status: "Backlog (BCA-102, BCA-103)" },
  { roll: "GLA26-BCADS-0001", name: "Meera Nair", program: "BCA-DS", sem: 1, group: "GRP-BCA-DS1", backlogs: 0, status: "Normal" },
  { roll: "GLA26-BCADS-0005", name: "Kabir Mehta", program: "BCA-DS", sem: 1, group: "GRP-BCA-DS1", backlogs: 1, status: "Backlog (BCADS-101)" },
  { roll: "GLA26-BCA-3001", name: "Aditya Roy", program: "BCA", sem: 3, group: "GRP-BCA-3A", backlogs: 1, status: "Backlog (BCA-101)" },
  { roll: "GLA26-BCA-3002", name: "Sneha Reddy", program: "BCA", sem: 3, group: "GRP-BCA-3A", backlogs: 0, status: "Normal" },
  { roll: "GLA26-BCADS-3001", name: "Arjun Rao", program: "BCA-DS", sem: 3, group: "GRP-BCADS-3", backlogs: 1, status: "Backlog (BCADS-102)" },
  { roll: "GLA26-MCA-0001", name: "Pooja Mishra", program: "MCA", sem: 1, group: "GRP-MCA-S1", backlogs: 0, status: "Normal" },
  { roll: "GLA26-MCA-0012", name: "Tanvi Saxena", program: "MCA", sem: 1, group: "GRP-MCA-S1", backlogs: 0, status: "Normal" },
  { roll: "GLA26-MCA-0015", name: "Kunal Bansal", program: "MCA", sem: 1, group: "GRP-MCA-S1", backlogs: 1, status: "Backlog (MCA-101)" },
  { roll: "GLA26-MCA-3001", name: "Vikram Malhotra", program: "MCA", sem: 3, group: "GRP-MCA-S2", backlogs: 1, status: "Backlog (MCA-102)" },
];

export default function StudentsPage() {
  const [search, setSearch] = useState("");
  const [backlogOnly, setBacklogOnly] = useState(false);

  const filtered = SAMPLE_STUDENT_ROWS.filter((s) => {
    const matchesSearch =
      s.roll.toLowerCase().includes(search.toLowerCase()) ||
      s.name.toLowerCase().includes(search.toLowerCase());
    const matchesBacklog = !backlogOnly || s.backlogs > 0;
    return matchesSearch && matchesBacklog;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <GraduationCap className="h-6 w-6 text-primary" />
            Students & Backlog Enrollments
          </h1>
          <p className="text-sm text-muted-foreground">
            355 Enrolled Students · 70 Backlog Examinations Cross-Scheduled Without Slot Clashes
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="font-mono text-xs">
            355 Total Students
          </Badge>
          <Badge className="bg-amber-600 text-white font-mono text-xs">
            70 Backlog Cases
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4">
          <span className="text-xs text-muted-foreground">Enrolled Students</span>
          <div className="text-2xl font-bold text-foreground mt-1">355</div>
          <p className="text-[11px] text-muted-foreground">Across 8 academic cohort groups</p>
        </Card>
        <Card className="p-4">
          <span className="text-xs text-muted-foreground">Subject Enrollments</span>
          <div className="text-2xl font-bold text-foreground mt-1">1,735</div>
          <p className="text-[11px] text-muted-foreground">Average 4.88 courses per student</p>
        </Card>
        <Card className="p-4">
          <span className="text-xs text-muted-foreground">Backlog Conflict Rate</span>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">0.00%</div>
          <p className="text-[11px] text-muted-foreground">0 hard conflicts in Welsh-Powell allocation</p>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by student name or roll number..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9 text-sm"
              />
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant={backlogOnly ? "default" : "outline"}
                onClick={() => setBacklogOnly(!backlogOnly)}
                className="h-8 text-xs gap-1.5"
              >
                <AlertCircle className="h-3.5 w-3.5" />
                {backlogOnly ? "Showing Backlogs Only" : "Filter Backlogs (70)"}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-left text-xs text-muted-foreground font-semibold">
                  <th className="p-3">Roll Number</th>
                  <th className="p-3">Student Full Name</th>
                  <th className="p-3">Program</th>
                  <th className="p-3 text-center">Semester</th>
                  <th className="p-3">Group Code</th>
                  <th className="p-3 text-center">Backlogs</th>
                  <th className="p-3 text-right">Optimization Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.map((s) => (
                  <tr key={s.roll} className="hover:bg-muted/30 transition-colors">
                    <td className="p-3 font-mono font-bold text-xs text-foreground">
                      {s.roll}
                    </td>
                    <td className="p-3 font-medium text-foreground">
                      {s.name}
                    </td>
                    <td className="p-3">
                      <Badge variant="outline" className="text-xs">
                        {s.program}
                      </Badge>
                    </td>
                    <td className="p-3 text-center font-mono text-xs">
                      Sem {s.sem}
                    </td>
                    <td className="p-3 font-mono text-xs text-muted-foreground">
                      {s.group}
                    </td>
                    <td className="p-3 text-center">
                      {s.backlogs > 0 ? (
                        <Badge className="bg-amber-600 text-white text-[10px]">
                          {s.backlogs} Backlog
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="p-3 text-right">
                      <span className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Conflict-Free Scheduled
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
