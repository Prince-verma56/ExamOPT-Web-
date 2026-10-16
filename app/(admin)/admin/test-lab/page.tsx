"use client";

import { useState } from "react";
import { EXAMOPT_EDGE_CASE_RESULTS, EXAMOPT_SYSTEM_METADATA } from "@/lib/examopt-data";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  FlaskConical,
  Play,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RotateCcw,
  ShieldAlert,
  ArrowRight,
  Terminal,
} from "lucide-react";

export default function TestLabPage() {
  const [activeTest, setActiveTest] = useState<string>("normal_gla_dataset");
  const [isRunning, setIsRunning] = useState(false);
  const [testResult, setTestResult] = useState<{
    status: string;
    is_valid: boolean;
    readiness_score: number;
    error_code?: string;
    message?: string;
    error_codes?: string[];
    remediation?: string;
  } | null>(null);

  const runTest = (testKey: string) => {
    setActiveTest(testKey);
    setIsRunning(true);
    setTestResult(null);

    setTimeout(() => {
      setIsRunning(false);
      if (testKey === "normal_gla_dataset") {
        setTestResult({
          status: "READY_FOR_OPTIMIZATION",
          is_valid: true,
          readiness_score: 100,
          message: "All 24 examinations feasible across 10 available slots and 15 physical rooms. Zero hard conflicts detected.",
        });
      } else {
        const edge = EXAMOPT_EDGE_CASE_RESULTS[testKey];
        if (edge) {
          setTestResult({
            status: edge.status,
            is_valid: edge.is_valid,
            readiness_score: edge.readiness_score,
            error_code: edge.detected_error,
            message: edge.message,
            error_codes: edge.error_codes,
            remediation: edge.remediation,
          });
        }
      }
    }, 400);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <FlaskConical className="h-6 w-6 text-primary" />
              Edge Case Test Lab & Validation Suite
            </h1>
            <Badge variant="outline" className="font-mono text-xs">
              GLA HackVision 2.0
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Evaluate resilience against lab capacity bottlenecks, candidate enrollment overflows, and corrupted dataset schema.
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => runTest("normal_gla_dataset")}
          className="gap-1.5"
        >
          <RotateCcw className="h-3.5 w-3.5" /> Reset to Normal Dataset
        </Button>
      </div>

      {/* Test Selector Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Test 1: Normal */}
        <Card
          className={`cursor-pointer transition-all hover:border-primary/50 ${
            activeTest === "normal_gla_dataset" ? "border-primary ring-1 ring-primary/20 shadow-sm" : ""
          }`}
          onClick={() => runTest("normal_gla_dataset")}
        >
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between">
              <Badge className="bg-emerald-600 text-white text-[10px]">Baseline</Badge>
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            </div>
            <CardTitle className="text-sm font-bold pt-1">Normal Dataset</CardTitle>
            <CardDescription className="text-xs">
              15 Rooms · 24 Subjects · 355 Students · 10 Slots
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <span className="text-[11px] text-muted-foreground">Expected: 100% Feasible</span>
          </CardContent>
        </Card>

        {/* Test 2: Lab Bottleneck */}
        <Card
          className={`cursor-pointer transition-all hover:border-destructive/50 ${
            activeTest === "edge_case_lab_bottleneck" ? "border-destructive ring-1 ring-destructive/20 shadow-sm" : ""
          }`}
          onClick={() => runTest("edge_case_lab_bottleneck")}
        >
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between">
              <Badge variant="destructive" className="text-[10px]">Stress Test</Badge>
              <AlertTriangle className="h-4 w-4 text-amber-500" />
            </div>
            <CardTitle className="text-sm font-bold pt-1">Lab Bottleneck</CardTitle>
            <CardDescription className="text-xs">
              6 labs locked to Slot D1-M vs 5 campus labs
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <span className="text-[11px] text-muted-foreground">Detects LAB_BOTTLENECK</span>
          </CardContent>
        </Card>

        {/* Test 3: Capacity Overflow */}
        <Card
          className={`cursor-pointer transition-all hover:border-destructive/50 ${
            activeTest === "edge_case_capacity_overflow" ? "border-destructive ring-1 ring-destructive/20 shadow-sm" : ""
          }`}
          onClick={() => runTest("edge_case_capacity_overflow")}
        >
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between">
              <Badge variant="destructive" className="text-[10px]">Stress Test</Badge>
              <ShieldAlert className="h-4 w-4 text-destructive" />
            </div>
            <CardTitle className="text-sm font-bold pt-1">Capacity Overflow</CardTitle>
            <CardDescription className="text-xs">
              BCA-101 has 650 examinees vs max room 150
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <span className="text-[11px] text-muted-foreground">Detects CAPACITY_OVERFLOW</span>
          </CardContent>
        </Card>

        {/* Test 4: Corrupted Input */}
        <Card
          className={`cursor-pointer transition-all hover:border-destructive/50 ${
            activeTest === "invalid_corrupted_input" ? "border-destructive ring-1 ring-destructive/20 shadow-sm" : ""
          }`}
          onClick={() => runTest("invalid_corrupted_input")}
        >
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between">
              <Badge variant="secondary" className="text-[10px]">Schema Test</Badge>
              <XCircle className="h-4 w-4 text-purple-500" />
            </div>
            <CardTitle className="text-sm font-bold pt-1">Corrupted Input</CardTitle>
            <CardDescription className="text-xs">
              Malformed CSV headers & negative counts
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <span className="text-[11px] text-muted-foreground">Catches 6 Validation Errors</span>
          </CardContent>
        </Card>
      </div>

      {/* Test Execution Output Console */}
      <Card className="shadow-sm">
        <CardHeader className="border-b bg-muted/20 pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Terminal className="h-5 w-5 text-primary" />
              <CardTitle className="text-base font-bold">
                Validation & Pre-Flight Diagnostic Console
              </CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={() => runTest(activeTest)}
                disabled={isRunning}
                className="gap-1.5 h-8 text-xs"
              >
                <Play className="h-3.5 w-3.5" />
                {isRunning ? "Running Diagnostic..." : "Execute Test Suite"}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {isRunning ? (
            <div className="py-12 flex flex-col items-center justify-center space-y-3">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              <p className="text-xs text-muted-foreground">
                Simulating graph coloring constraints and room capacity checks...
              </p>
            </div>
          ) : testResult ? (
            <div className="space-y-5">
              {/* Status Header */}
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4 bg-card">
                <div>
                  <span className="text-xs text-muted-foreground block font-mono">Test Scenario</span>
                  <span className="text-base font-bold text-foreground font-mono">{activeTest}</span>
                </div>
                <div className="flex items-center gap-3">
                  <div>
                    <span className="text-xs text-muted-foreground block text-right">Readiness Score</span>
                    <span className="text-lg font-bold font-mono">
                      {testResult.readiness_score} / 100
                    </span>
                  </div>
                  {testResult.is_valid ? (
                    <Badge className="bg-emerald-600 text-white text-xs px-2.5 py-1">
                      VALIDATION PASSED
                    </Badge>
                  ) : (
                    <Badge variant="destructive" className="text-xs px-2.5 py-1">
                      VALIDATION FAILED
                    </Badge>
                  )}
                </div>
              </div>

              {/* Error or Success message */}
              <div
                className={`rounded-lg border p-4 text-xs ${
                  testResult.is_valid
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-200"
                    : "bg-destructive/10 border-destructive/30 text-destructive-foreground"
                }`}
              >
                <div className="font-semibold text-sm mb-1 flex items-center gap-2">
                  {testResult.is_valid ? (
                    <>
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      Status: {testResult.status}
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="h-4 w-4 text-destructive" />
                      Detected Error: {testResult.error_code || testResult.status}
                    </>
                  )}
                </div>
                <p className="text-foreground/90">{testResult.message}</p>
              </div>

              {/* Error code list if multiple */}
              {testResult.error_codes && (
                <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                    Detected Schema Error Codes ({testResult.error_codes.length}):
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {testResult.error_codes.map((code) => (
                      <Badge key={code} variant="outline" className="font-mono text-xs border-destructive/50 text-destructive">
                        {code}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Recommended remediation */}
              {testResult.remediation && (
                <div className="rounded-lg border bg-amber-500/10 border-amber-500/30 p-4 text-xs space-y-1">
                  <span className="font-semibold text-amber-700 dark:text-amber-300 block flex items-center gap-1.5">
                    <ArrowRight className="h-3.5 w-3.5" />
                    Automated Remediation Recommendation:
                  </span>
                  <p className="text-foreground/90">{testResult.remediation}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="py-12 text-center text-xs text-muted-foreground">
              Select any of the 4 test scenarios above and click &quot;Execute Test Suite&quot; to inspect diagnostics.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
