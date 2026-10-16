"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bell, CheckCircle2, Calendar, Send } from "lucide-react";
import { Button } from "@/components/ui/button";

const NOTIFICATIONS = [
  {
    id: "notif-1",
    title: "Timetable Published for Fall 2026 Examination",
    time: "10 mins ago",
    category: "Schedule",
    body: "Final Welsh-Powell optimized timetable has been published for BCA, BCA-DS, and MCA students. Hall tickets are now verifiable.",
    isNew: true,
  },
  {
    id: "notif-2",
    title: "Zero Conflict Verification Confirmed",
    time: "1 hour ago",
    category: "Audit",
    body: "Conflict detector ran validation across 70 backlog cases and verified 0 concurrent slot clashes.",
    isNew: false,
  },
  {
    id: "notif-3",
    title: "CSED Block AB-XI Seating Layout Active",
    time: "Yesterday",
    category: "Infrastructure",
    body: "15 examination halls (1,040 theory seats + 440 lab workstations) marked available for examination week.",
    isNew: false,
  },
];

export default function NotificationsPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Bell className="h-6 w-6 text-primary" />
            Broadcasts & Operational Alerts
          </h1>
          <p className="text-sm text-muted-foreground">
            Examination notifications, schedule release announcements, and system alerts.
          </p>
        </div>
        <Button size="sm" className="gap-1.5 text-xs">
          <Send className="h-3.5 w-3.5" /> Broadcast to Students
        </Button>
      </div>

      <div className="space-y-3">
        {NOTIFICATIONS.map((n) => (
          <Card key={n.id} className="hover:border-primary/40 transition-colors shadow-sm">
            <CardHeader className="p-4 pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px]">
                    {n.category}
                  </Badge>
                  <CardTitle className="text-sm font-bold">{n.title}</CardTitle>
                </div>
                <span className="text-[11px] text-muted-foreground">{n.time}</span>
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-1">
              <p className="text-xs text-muted-foreground">{n.body}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
