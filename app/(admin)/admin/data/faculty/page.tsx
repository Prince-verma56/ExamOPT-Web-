"use client";

import { EXAMOPT_FACULTY } from "@/lib/examopt-data";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { UserCheck, Mail, ShieldCheck } from "lucide-react";

export default function FacultyPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <UserCheck className="h-6 w-6 text-primary" />
            Faculty & Invigilation Roster
          </h1>
          <p className="text-sm text-muted-foreground">
            20 Department Faculty Members · Balanced Invigilation Duty Allocation
          </p>
        </div>
        <Badge variant="outline" className="font-mono text-xs">
          20 Faculty Available
        </Badge>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {EXAMOPT_FACULTY.map((f) => (
          <Card key={f.id} className="hover:border-primary/40 transition-colors shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <Badge variant="secondary" className="text-[10px]">
                  {f.designation}
                </Badge>
                <Badge
                  className={
                    f.assignedCount <= f.maxInvigilations
                      ? "bg-emerald-600/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                      : "bg-amber-600/10 text-amber-600 border-amber-500/20"
                  }
                  variant="outline"
                >
                  {f.assignedCount} / {f.maxInvigilations} Slots
                </Badge>
              </div>
              <CardTitle className="text-base font-semibold pt-2">{f.name}</CardTitle>
              <CardDescription className="text-xs truncate">{f.department}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-2 truncate">
                <Mail className="h-3 w-3 shrink-0" />
                <span className="truncate">{f.email}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
