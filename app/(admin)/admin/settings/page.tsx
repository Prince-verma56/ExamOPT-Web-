"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Settings, Save, CheckCircle2 } from "lucide-react";

export default function SettingsPage() {
  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Settings className="h-6 w-6 text-primary" />
            System & Examination Settings
          </h1>
          <p className="text-sm text-muted-foreground">
            Configure academic session bounds, department defaults, and optimizer constraints.
          </p>
        </div>
        <Button size="sm" className="gap-1.5 text-xs">
          <Save className="h-3.5 w-3.5" /> Save Preferences
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-bold">Academic Session & Campus</CardTitle>
          <CardDescription className="text-xs">
            Affiliation details for Problem Statement C10.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="font-semibold text-foreground">Institution Name</label>
              <Input defaultValue="GLA University, Mathura" className="h-9 text-xs" />
            </div>
            <div className="space-y-1">
              <label className="font-semibold text-foreground">Examination Venue Block</label>
              <Input defaultValue="CSED Block AB-XI" className="h-9 text-xs" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="font-semibold text-foreground">Academic Term</label>
              <Input defaultValue="End-Term Autumn 2026" className="h-9 text-xs" />
            </div>
            <div className="space-y-1">
              <label className="font-semibold text-foreground">Active Problem Statement</label>
              <Input defaultValue="C10 (GLA HackVision 2.0)" disabled className="h-9 text-xs bg-muted/50" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-bold">Optimizer Defaults</CardTitle>
          <CardDescription className="text-xs">
            Algorithm heuristics parameters.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-xs">
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <span className="font-semibold text-foreground block">Automatic Conflict Resolution</span>
              <span className="text-muted-foreground block text-[11px]">
                Auto-assign reserve time slots when hard constraint clashes are detected.
              </span>
            </div>
            <Switch defaultChecked />
          </div>

          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <span className="font-semibold text-foreground block">Strict Lab Workstation Checks</span>
              <span className="text-muted-foreground block text-[11px]">
                Enforce 1-workstation-per-candidate rule for practical examination sessions.
              </span>
            </div>
            <Switch defaultChecked />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
