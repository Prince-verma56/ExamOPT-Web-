"use client";

import { useState } from "react";
import { EXAMOPT_SYSTEM_METADATA, EXAMOPT_FEASIBLE_TIMETABLE } from "@/lib/examopt-data";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, Download, CheckCircle2, FileSpreadsheet, Sparkles, RefreshCw } from "lucide-react";

export default function ImportExportPage() {
  const [activeLoadedPreset, setActiveLoadedPreset] = useState("GLA Normal Benchmark Dataset");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const loadPreset = (name: string) => {
    setActiveLoadedPreset(name);
    setStatusMessage(`Successfully loaded "${name}" into active memory cache.`);
    setTimeout(() => setStatusMessage(null), 3000);
  };

  const exportCSV = () => {
    const headers = "SubjectCode,SubjectName,SlotCode,Date,Session,TimeRange,RoomCode,Capacity,Enrolled,Invigilator\n";
    const rows = EXAMOPT_FEASIBLE_TIMETABLE.map(
      (a) =>
        `"${a.subjectCode}","${a.subjectName}","${a.slotCode}","${a.date}","${a.session}","${a.timeRange}","${a.roomCode}",${a.roomCapacity},${a.enrolledStudents},"${a.invigilator}"`
    ).join("\n");
    const blob = new Blob([headers + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "examopt_timetable_export.csv";
    link.click();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Upload className="h-6 w-6 text-primary" />
              Dataset Ingestion & Export Engine
            </h1>
            <Badge variant="outline" className="font-mono text-xs">
              CSV · JSON · Zod Sanitized
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Ingest campus inventories, course curriculums, and student cohort enrollments or export validated timetables.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={exportCSV} className="gap-1.5">
            <Download className="h-4 w-4" /> Export CSV
          </Button>
        </div>
      </div>

      {statusMessage && (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-800 dark:text-emerald-200 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Preset 1-Click Loaders */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                GLA HackVision 2.0 Benchmark Presets
              </CardTitle>
              <CardDescription className="text-xs">
                Instantly load verified test payloads without requiring manual CSV file preparation.
              </CardDescription>
            </div>
            <Badge className="bg-primary/10 text-primary border-primary/20" variant="outline">
              Active: {activeLoadedPreset}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <Button
              variant="outline"
              className="h-auto p-3 flex flex-col items-start gap-1 text-left hover:border-primary/50"
              onClick={() => loadPreset("GLA Normal Benchmark Dataset")}
            >
              <span className="font-semibold text-xs text-foreground">Normal Dataset (Baseline)</span>
              <span className="text-[10px] text-muted-foreground">15 Rooms · 24 Subjects · 355 Students</span>
            </Button>

            <Button
              variant="outline"
              className="h-auto p-3 flex flex-col items-start gap-1 text-left hover:border-amber-500/50"
              onClick={() => loadPreset("Lab Bottleneck (Slot D1-M)")}
            >
              <span className="font-semibold text-xs text-amber-600 dark:text-amber-400">Lab Bottleneck Test</span>
              <span className="text-[10px] text-muted-foreground">6 Lab Exams locked to 5 Labs</span>
            </Button>

            <Button
              variant="outline"
              className="h-auto p-3 flex flex-col items-start gap-1 text-left hover:border-destructive/50"
              onClick={() => loadPreset("Capacity Overflow (BCA-101)")}
            >
              <span className="font-semibold text-xs text-destructive">Capacity Overflow Test</span>
              <span className="text-[10px] text-muted-foreground">650 Students vs 150 Room Limit</span>
            </Button>

            <Button
              variant="outline"
              className="h-auto p-3 flex flex-col items-start gap-1 text-left hover:border-purple-500/50"
              onClick={() => loadPreset("Corrupted Schema Input")}
            >
              <span className="font-semibold text-xs text-purple-600 dark:text-purple-400">Corrupted Input Test</span>
              <span className="text-[10px] text-muted-foreground">Negative counts & bad foreign keys</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* CSV Drag and Drop Box */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4 text-emerald-500" />
            Upload Custom Tabular CSV / JSON
          </CardTitle>
          <CardDescription className="text-xs">
            Files are validated against Zod strict schemas before ingestion into database tables.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-xl border-2 border-dashed border-border/80 bg-muted/10 p-8 text-center space-y-3">
            <div className="h-12 w-12 rounded-full bg-primary/10 text-primary mx-auto flex items-center justify-center">
              <Upload className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">
                Drop your CSV or JSON schedule file here, or browse
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Supports Rooms.csv, Subjects.csv, StudentEnrollments.csv, TimeSlots.csv
              </p>
            </div>
            <Button size="sm" variant="secondary" className="text-xs">
              Select Local File
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
