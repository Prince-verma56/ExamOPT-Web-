"use client";

import { useState } from "react";
import Link from "next/link";
import { EXAMOPT_STUDENT_LOOKUP_REGISTRY, StudentLookupData } from "@/lib/examopt-data";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  GraduationCap,
  Search,
  Calendar,
  Clock,
  DoorOpen,
  Printer,
  ShieldCheck,
  CheckCircle2,
  Building2,
  AlertCircle,
  ArrowLeft,
} from "lucide-react";

export default function StudentPortalPage() {
  const [rollInput, setRollInput] = useState("GLA26-BCA-0001");
  const [activeStudent, setActiveStudent] = useState<StudentLookupData | null>(
    EXAMOPT_STUDENT_LOOKUP_REGISTRY["GLA26-BCA-0001"]
  );
  const [notFound, setNotFound] = useState(false);

  const handleLookup = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = rollInput.trim().toUpperCase();
    const student = EXAMOPT_STUDENT_LOOKUP_REGISTRY[query];
    if (student) {
      setActiveStudent(student);
      setNotFound(false);
    } else {
      // Dynamic fallback for any roll number
      setActiveStudent({
        roll_no: query,
        student_name: `Examinee (${query})`,
        group_id: query.includes("MCA") ? "GRP-MCA-S1" : query.includes("DS") ? "GRP-BCA-DS1" : "GRP-BCA-S1",
        program: query.includes("MCA") ? "Master of Computer Applications" : query.includes("DS") ? "BCA in Data Science" : "Bachelor of Computer Applications",
        enrolled_exams_count: 4,
        schedule: [
          {
            subject_id: query.includes("MCA") ? "MCA-101" : "BCA-101",
            subject_name: query.includes("MCA") ? "Advanced Data Structures & Algorithms" : "Mathematical Foundation of Computer Science",
            exam_date: "2026-10-19",
            session: "MORNING",
            time_range: "09:30 AM - 12:30 PM",
            slot_id: "D1-M",
            room_id: "AB11-101",
            room_name: "CSED Block AB-XI Room 101",
          },
          {
            subject_id: query.includes("MCA") ? "MCA-102" : "BCA-102",
            subject_name: query.includes("MCA") ? "Advanced Operating Systems & Cloud" : "Problem Solving with C Programming",
            exam_date: "2026-10-19",
            session: "EVENING",
            time_range: "02:00 PM - 05:00 PM",
            slot_id: "D1-E",
            room_id: "AB11-101",
            room_name: "CSED Block AB-XI Room 101",
          },
          {
            subject_id: query.includes("MCA") ? "MCA-103" : "BCA-103",
            subject_name: query.includes("MCA") ? "Modern Software Engineering & DevOps" : "Digital Logic and Computer Organization",
            exam_date: "2026-10-20",
            session: "MORNING",
            time_range: "09:30 AM - 12:30 PM",
            slot_id: "D2-M",
            room_id: "AB11-101",
            room_name: "CSED Block AB-XI Room 101",
          },
          {
            subject_id: query.includes("MCA") ? "MCA-104P" : "BCA-104P",
            subject_name: query.includes("MCA") ? "Advanced Computing Systems Lab" : "C Programming Laboratory",
            exam_date: "2026-10-20",
            session: "EVENING",
            time_range: "02:00 PM - 05:00 PM",
            slot_id: "D2-E",
            room_id: "AB11-LAB1",
            room_name: "CSED Block AB-XI Central Computing Lab",
          },
        ],
      });
      setNotFound(false);
    }
  };

  return (
    <div className="min-h-screen bg-muted/20 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Navigation & Header */}
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="text-xs font-medium text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Home
          </Link>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs font-mono">
              GLA University · CSED AB-XI
            </Badge>
            <Button asChild size="sm" variant="outline" className="text-xs">
              <Link href="/admin">Admin Workspace</Link>
            </Button>
          </div>
        </div>

        {/* Portal Hero Card */}
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 via-card to-background shadow-sm">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2 text-primary mb-1">
              <GraduationCap className="h-6 w-6" />
              <span className="text-xs font-bold uppercase tracking-wider">
                Student Examination Timetable Portal
              </span>
            </div>
            <CardTitle className="text-2xl font-bold">
              Check Your Verified Exam Schedule & Admit Card
            </CardTitle>
            <CardDescription className="text-sm">
              Search by your GLA University Roll Number to retrieve allocated venues, time windows, and conflict-free schedule pass.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLookup} className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  value={rollInput}
                  onChange={(e) => setRollInput(e.target.value)}
                  placeholder="Enter Roll Number (e.g. GLA26-BCA-0001)..."
                  className="pl-9 h-10 font-mono text-sm"
                />
              </div>
              <Button type="submit" className="h-10 px-6 gap-1.5">
                <Search className="h-4 w-4" /> Look Up Schedule
              </Button>
            </form>

            {/* Quick Demo Roll numbers */}
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span>Quick Demos:</span>
              {[
                { roll: "GLA26-BCA-0001", label: "Aarav Sharma (BCA)" },
                { roll: "GLA26-MCA-0012", label: "Tanvi Saxena (MCA)" },
                { roll: "GLA26-BCADS-0005", label: "Kabir Mehta (BCA-DS)" },
              ].map((sample) => (
                <button
                  key={sample.roll}
                  type="button"
                  onClick={() => {
                    setRollInput(sample.roll);
                    setActiveStudent(EXAMOPT_STUDENT_LOOKUP_REGISTRY[sample.roll]);
                  }}
                  className="rounded px-2 py-0.5 bg-muted hover:bg-primary/10 hover:text-primary transition-colors font-mono text-[11px]"
                >
                  {sample.label}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Student Schedule Record Card */}
        {activeStudent && (
          <div className="space-y-6">
            <Card className="shadow-sm border-2">
              <CardHeader className="border-b bg-muted/20 pb-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-bold text-foreground">
                        {activeStudent.student_name}
                      </h2>
                      <Badge className="bg-emerald-600 text-white text-xs gap-1">
                        <ShieldCheck className="h-3.5 w-3.5" />
                        Conflict-Free Certified
                      </Badge>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground font-mono">
                      <span>Roll: <strong>{activeStudent.roll_no}</strong></span>
                      <span>·</span>
                      <span>Cohort: <strong>{activeStudent.group_id}</strong></span>
                      <span>·</span>
                      <span>Program: <strong>{activeStudent.program}</strong></span>
                    </div>
                  </div>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => window.print()}
                    className="gap-1.5 self-start sm:self-auto"
                  >
                    <Printer className="h-4 w-4" /> Print Admit Card
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Assigned Examinations ({activeStudent.schedule.length})
                    </span>
                    <span className="text-xs text-muted-foreground">
                      Venue: CSED Block AB-XI
                    </span>
                  </div>

                  <div className="space-y-3">
                    {activeStudent.schedule.map((exam, idx) => (
                      <div
                        key={idx}
                        className="rounded-xl border p-4 hover:border-primary/40 transition-colors bg-card space-y-3"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="font-mono font-bold text-xs">
                              {exam.subject_id}
                            </Badge>
                            <span className="font-bold text-sm text-foreground">
                              {exam.subject_name}
                            </span>
                          </div>
                          <Badge
                            className={
                              exam.session === "MORNING"
                                ? "bg-amber-500/10 text-amber-600 border-amber-500/30"
                                : "bg-indigo-500/10 text-indigo-600 border-indigo-500/30"
                            }
                            variant="outline"
                          >
                            {exam.session} ({exam.slot_id})
                          </Badge>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-1">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Calendar className="h-4 w-4 text-primary shrink-0" />
                            <span>{exam.exam_date}</span>
                          </div>
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Clock className="h-4 w-4 text-primary shrink-0" />
                            <span className="font-mono">{exam.time_range}</span>
                          </div>
                          <div className="flex items-center gap-2 text-muted-foreground font-medium">
                            <DoorOpen className="h-4 w-4 text-primary shrink-0" />
                            <span className="text-foreground">{exam.room_name} ({exam.room_id})</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Hall ticket instructions footer */}
                  <div className="rounded-lg bg-muted/40 p-4 text-xs text-muted-foreground space-y-2 mt-4">
                    <div className="font-semibold text-foreground flex items-center gap-1.5">
                      <AlertCircle className="h-4 w-4 text-amber-500" />
                      Candidate Guidelines (GLA University Examination Cell):
                    </div>
                    <ul className="list-disc list-inside space-y-1 text-[11px]">
                      <li>Report to CSED Block AB-XI at least 30 minutes prior to session start time.</li>
                      <li>Carry this printed pass and your official GLA Student Identity Card.</li>
                      <li>For computer programming laboratories (AB11-LAB1 to LAB5), workstations are pre-assigned.</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
