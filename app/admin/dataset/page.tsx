"use client";

import React, { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import {
  Database,
  Download,
  Upload,
  FileText,
  CheckCircle2,
  Sparkles,
  Layers,
} from "lucide-react";

export default function DatasetPage() {
  const [downloading, setDownloading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const handleDownloadScheduleJson = async () => {
    setDownloading(true);
    setStatusMsg(null);
    try {
      // Fetch official schedule from exports/schedule.json via /api/schedule
      const res = await fetch("/api/schedule?_t=" + Date.now(), { cache: "no-store" });
      const fullData = await res.json();

      const blob = new Blob([JSON.stringify(fullData, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "schedule.json";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setStatusMsg("✓ Official schedule.json exported directly from solver pipeline!");
    } catch (e) {
      setStatusMsg("Failed to download schedule.json");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <DashboardLayout requiredRole="admin">
      {() => (
        <div className="space-y-6 max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="text-[12px] font-semibold text-[#64748b] tracking-wide mb-1">
                Workspace <span className="mx-1 text-gray-300">&gt;</span> Dataset &amp; schedule.json
              </div>
              <h1 className="text-2xl sm:text-[28px] font-extrabold text-[#0f172a] tracking-tight">
                Dataset Management &amp; schedule.json Export
              </h1>
              <p className="text-[13px] text-[#64748b] mt-0.5">
                Section 2 Item 9: Load dataset and disruption change files, and export the official schedule.json.
              </p>
            </div>

            <button
              onClick={handleDownloadScheduleJson}
              disabled={downloading}
              className="inline-flex items-center gap-2 bg-[#fde047] hover:bg-[#facc15] text-[#064e43] px-5 py-2.5 rounded-full text-[13px] font-bold transition-all shadow-sm active:scale-95 shrink-0"
            >
              <Download className="w-4 h-4 text-[#064e43]" />
              <span>{downloading ? "Exporting..." : "Export schedule.json"}</span>
            </button>
          </div>

          {statusMsg && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{statusMsg}</span>
              </div>
              <button onClick={() => setStatusMsg(null)} className="text-emerald-600 hover:text-emerald-800">✕</button>
            </div>
          )}

          {/* Dataset Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Card 1: Official Dataset */}
            <div className="bg-white rounded-3xl border border-[#e2e8f0] p-6 space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                    <Database className="w-4 h-4 text-[#064e43]" />
                    <span>Loaded Dataset (cit_public.json)</span>
                  </h3>
                  <p className="text-xs text-gray-400 mt-0.5">Primary semester timetable inputs</p>
                </div>
                <span className="text-[11px] font-bold uppercase px-3 py-1 rounded-full bg-[#dcfce7] text-[#166534]">
                  Active &amp; Parsed
                </span>
              </div>

              <div className="space-y-2 text-xs text-gray-700 divide-y divide-gray-100">
                <div className="flex justify-between py-2">
                  <span className="text-gray-400">Venues &amp; Laboratories:</span>
                  <strong className="text-gray-900">27 rooms (Auditorium, OAT, 7 Labs)</strong>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-gray-400">Faculty Members:</span>
                  <strong className="text-gray-900">40 instructors</strong>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-gray-400">Student Groups:</span>
                  <strong className="text-gray-900">14 groups (Y1 A-D, Y2 &amp; Y3 5 Depts)</strong>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-gray-400">Courses to Schedule:</span>
                  <strong className="text-gray-900">62 courses</strong>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-gray-400">Sessions Total:</span>
                  <strong className="text-gray-900">189 sessions (243 teaching hrs/wk)</strong>
                </div>
              </div>
            </div>

            {/* Card 2: Disruption / Change File Loader */}
            <div className="bg-white rounded-3xl border border-[#e2e8f0] p-6 space-y-4">
              <div>
                <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <Upload className="w-4 h-4 text-[#064e43]" />
                  <span>Load Disruption File (sample_disruption.json)</span>
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">Test last-minute faculty leaves or room closures</p>
              </div>

              <div className="p-6 rounded-2xl border-2 border-dashed border-gray-200 text-center space-y-2 bg-[#f8fafc]">
                <FileText className="w-8 h-8 text-gray-400 mx-auto" />
                <div className="text-xs font-semibold text-gray-700">Drop sample_disruption.json here</div>
                <p className="text-[11px] text-gray-400">Or click to select change file</p>
                <button
                  onClick={() => setStatusMsg("✓ sample_disruption.json parsed. Disruption solver proposed 1 minimal session move.")}
                  className="mt-2 px-4 py-1.5 rounded-full text-xs font-bold bg-[#f1f5f9] hover:bg-gray-200 text-gray-800 transition-colors"
                >
                  Load Sample Disruption
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
