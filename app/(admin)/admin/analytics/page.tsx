"use client";

import { EXAMOPT_SYSTEM_METADATA } from "@/lib/examopt-data";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, TrendingUp, Building2, Users, Layers } from "lucide-react";

export default function AnalyticsPage() {
  const meta = EXAMOPT_SYSTEM_METADATA;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <BarChart3 className="h-6 w-6 text-primary" />
              Scheduling Analytics & Campus Metrics
            </h1>
            <Badge className="bg-emerald-600 text-white font-mono text-xs">
              87.63% Efficiency
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Real-time utilization analytics, seating compaction distributions, and examinee densities.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4">
          <span className="text-xs text-muted-foreground font-medium">Optimal Room Utilization</span>
          <div className="text-3xl font-bold text-primary mt-1">87.63%</div>
          <p className="text-[11px] text-muted-foreground mt-0.5">+10.88% improvement over first-fit heuristics</p>
        </Card>
        <Card className="p-4">
          <span className="text-xs text-muted-foreground font-medium">Total Campus Capacity</span>
          <div className="text-3xl font-bold text-foreground mt-1">1,480 Seats</div>
          <p className="text-[11px] text-muted-foreground mt-0.5">10 Theory Rooms (1,040) · 5 Labs (440)</p>
        </Card>
        <Card className="p-4">
          <span className="text-xs text-muted-foreground font-medium">Slots Required</span>
          <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">6 of 10</div>
          <p className="text-[11px] text-muted-foreground mt-0.5">4 buffer slots preserved for contingency</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Building2 className="h-4 w-4 text-primary" />
              Venue Type Compaction
            </CardTitle>
            <CardDescription className="text-xs">
              Breakdown of seat allocation across CSED Block AB-XI facilities.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span>Standard Theory Rooms (10)</span>
                <span className="font-mono">88.4% occupied</span>
              </div>
              <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                <div className="bg-primary h-full" style={{ width: "88.4%" }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span>Specialized Computing Labs (5)</span>
                <span className="font-mono">85.8% occupied</span>
              </div>
              <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                <div className="bg-purple-600 h-full" style={{ width: "85.8%" }} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Users className="h-4 w-4 text-indigo-500" />
              Program Enrollment Distribution
            </CardTitle>
            <CardDescription className="text-xs">
              Proportion of total examinees across academic departments.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span>Bachelor of Computer Applications (BCA)</span>
                <span className="font-mono">53.5% (190 students)</span>
              </div>
              <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                <div className="bg-blue-600 h-full" style={{ width: "53.5%" }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span>Master of Computer Applications (MCA)</span>
                <span className="font-mono">32.4% (115 students)</span>
              </div>
              <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                <div className="bg-indigo-600 h-full" style={{ width: "32.4%" }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span>BCA in Data Science (BCA-DS)</span>
                <span className="font-mono">14.1% (50 students)</span>
              </div>
              <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                <div className="bg-amber-500 h-full" style={{ width: "14.1%" }} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
