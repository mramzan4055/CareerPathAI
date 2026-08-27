"use client";

import React, { useState, useEffect } from "react";
import {
  getApplications,
  getApplicationStats,
  updateSavedJobStatus,
  type SavedJobEntry,
  type ApplicationStats,
  type JobApplicationStatus,
} from "@/lib/api";
import {
  Send,
  Briefcase,
  CheckCircle2,
  XCircle,
  Clock,
  Trophy,
  BarChart3,
  Loader2,
  ExternalLink,
  ChevronDown,
  Activity,
} from "lucide-react";
import { toast } from "sonner";

const STATUS_CONFIG: Record<
  JobApplicationStatus | string,
  { label: string; color: string; bg: string; icon: React.ReactNode }
> = {
  saved:        { label: "Saved",        color: "text-slate-400",  bg: "bg-slate-500/10 border-slate-500/20",  icon: <Briefcase className="w-3.5 h-3.5" /> },
  applied:      { label: "Applied",      color: "text-blue-400",   bg: "bg-blue-500/10 border-blue-500/20",    icon: <Send className="w-3.5 h-3.5" /> },
  interviewing: { label: "Interviewing", color: "text-amber-400",  bg: "bg-amber-500/10 border-amber-500/20",  icon: <Clock className="w-3.5 h-3.5" /> },
  offer:        { label: "Offer",        color: "text-emerald-400",bg: "bg-emerald-500/10 border-emerald-500/20", icon: <Trophy className="w-3.5 h-3.5" /> },
  rejected:     { label: "Rejected",     color: "text-red-400",    bg: "bg-red-500/10 border-red-500/20",      icon: <XCircle className="w-3.5 h-3.5" /> },
  withdrawn:    { label: "Withdrawn",    color: "text-slate-500",  bg: "bg-slate-600/10 border-slate-600/20",  icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
};

const KANBAN_COLUMNS: (JobApplicationStatus | string)[] = [
  "applied", "interviewing", "offer", "rejected", "withdrawn"
];

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG["applied"];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10px] font-semibold ${cfg.color} ${cfg.bg}`}>
      {cfg.icon} {cfg.label}
    </span>
  );
}

function StatCard({ label, value, color, icon: Icon }: { label: string; value: number | string; color: string; icon?: React.ComponentType<{className?: string}> }) {
  return (
    <div className="p-4 bg-slate-900/30 border border-slate-800/80 rounded-xl flex items-center justify-between hover:border-slate-700 transition-colors">
      <div>
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">{label}</span>
        <span className={`text-2xl font-black ${color}`}>{value}</span>
      </div>
      {Icon && (
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${color} bg-current/10 opacity-60`}>
          <Icon className="w-4 h-4" />
        </div>
      )}
    </div>
  );
}

type ViewMode = "list" | "kanban";

export default function ApplicationsView() {
  const [applications, setApplications] = useState<SavedJobEntry[]>([]);
  const [stats, setStats] = useState<ApplicationStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>("kanban");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [appsRes, statsRes] = await Promise.allSettled([
        getApplications(),
        getApplicationStats(),
      ]);
      if (appsRes.status === "fulfilled") setApplications(appsRes.value.data);
      if (statsRes.status === "fulfilled") setStats(statsRes.value);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to load applications");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleStatusChange = async (savedJobId: string, newStatus: JobApplicationStatus) => {
    setUpdatingId(savedJobId);
    try {
      await updateSavedJobStatus(savedJobId, newStatus);
      setApplications(prev =>
        prev.map(a => a.id === savedJobId ? { ...a, status: newStatus } : a)
      );
      toast.success(`Status updated to ${STATUS_CONFIG[newStatus]?.label ?? newStatus}`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredApps = statusFilter
    ? applications.filter(a => a.status === statusFilter)
    : applications;

  const getColumnApps = (col: string) =>
    applications.filter(a => a.status === col);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-100 flex items-center gap-2">
            <Activity className="h-6 w-6 text-blue-400" /> Application Tracker
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Track every application from saved → interview → offer with a full audit trail.
          </p>
        </div>

        <div className="flex rounded-xl bg-slate-900/40 border border-slate-800 p-1 gap-1">
          {(["kanban", "list"] as const).map(mode => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                viewMode === mode
                  ? "bg-blue-600/20 text-blue-400 border border-blue-500/20"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {mode === "kanban" ? "Kanban" : "List"}
            </button>
          ))}
        </div>
      </div>

      {/* Stats Row */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard label="Total Saved" value={stats.total_saved} color="text-slate-200" icon={Briefcase} />
          <StatCard label="Applied Today" value={stats.today_applied} color="text-blue-400" icon={Send} />
          <StatCard label="Daily Limit" value={stats.daily_limit} color="text-amber-400" icon={Clock} />
          <StatCard label="Remaining Today" value={stats.remaining_today} color="text-emerald-400" icon={Trophy} />
        </div>
      )}

      {/* Status breakdown */}
      {stats && stats.by_status && Object.keys(stats.by_status).length > 0 && (
        <div className="p-4 bg-slate-900/30 border border-slate-800/80 rounded-2xl">
          <h3 className="text-xs font-bold text-slate-300 mb-3 flex items-center gap-1.5">
            <BarChart3 className="w-3.5 h-3.5 text-blue-400" /> Status Overview
          </h3>
          <div className="flex flex-wrap gap-2">
            {Object.entries(stats.by_status).map(([status, count]) => {
              const cfg = STATUS_CONFIG[status];
              if (!cfg) return null;
              return (
                <button
                  key={status}
                  onClick={() => setStatusFilter(statusFilter === status ? "" : status)}
                  className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
                    statusFilter === status
                      ? `${cfg.color} ${cfg.bg} scale-105`
                      : "text-slate-400 bg-slate-800/50 border-slate-700/50 hover:border-slate-600"
                  }`}
                >
                  {cfg.icon} {cfg.label}
                  <span className="font-black">{count}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {applications.length === 0 ? (
        <div className="p-16 text-center bg-slate-900/30 border border-slate-800/80 rounded-2xl space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mx-auto">
            <Send className="w-8 h-8 text-blue-400" />
          </div>
          <div className="text-sm font-bold text-slate-200">No applications yet</div>
          <p className="text-xs text-slate-500 max-w-xs mx-auto">
            Save jobs in Job Matches and click Apply to start tracking your pipeline here.
          </p>
        </div>
      ) : viewMode === "kanban" ? (
        /* ── Kanban View ── */
        <div className="overflow-x-auto pb-4">
          <div className="flex gap-4 min-w-max">
            {KANBAN_COLUMNS.map(col => {
              const colApps = getColumnApps(col);
              const cfg = STATUS_CONFIG[col];
              return (
                <div key={col} className="w-72 flex-shrink-0">
                  <div className={`flex items-center gap-2 mb-3 px-3 py-2.5 rounded-xl ${cfg.bg} border`}>
                    {cfg.icon}
                    <span className={`text-xs font-bold ${cfg.color}`}>{cfg.label}</span>
                    <span className={`ml-auto text-[11px] font-black px-1.5 py-0.5 rounded-full ${cfg.bg} ${cfg.color}`}>{colApps.length}</span>
                  </div>
                  <div className="space-y-3">
                    {colApps.length === 0 ? (
                      <div className="p-4 text-center border border-dashed border-slate-700/50 rounded-xl">
                        <p className="text-xs text-slate-600">Empty</p>
                      </div>
                    ) : (
                      colApps.map(app => (
                        <ApplicationCard
                          key={app.id}
                          app={app}
                          onStatusChange={handleStatusChange}
                          isUpdating={updatingId === app.id}
                        />
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* ── List View ── */
        <div className="space-y-3">
          {filteredApps.map(app => (
            <ApplicationCard
              key={app.id}
              app={app}
              onStatusChange={handleStatusChange}
              isUpdating={updatingId === app.id}
              listMode
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ApplicationCard({
  app,
  onStatusChange,
  isUpdating,
  listMode = false,
}: {
  app: SavedJobEntry;
  onStatusChange: (id: string, status: JobApplicationStatus) => void;
  isUpdating: boolean;
  listMode?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const job = app.jobs as (SavedJobEntry["jobs"] & { url?: string });

  const NEXT_STATUSES: JobApplicationStatus[] = [
    "applied", "interviewing", "offer", "rejected", "withdrawn"
  ];

  return (
    <div className={`p-4 bg-slate-900/30 border border-slate-800/80 rounded-xl space-y-3 ${listMode ? "flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4" : ""}`}>
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2 mb-1">
          <StatusBadge status={app.status} />
          {(job as { remote?: boolean })?.remote && (
            <span className="text-[10px] px-2 py-0.5 rounded border text-teal-400 bg-teal-500/10 border-teal-500/20 font-semibold">Remote</span>
          )}
        </div>
        <h4 className="font-bold text-slate-100 text-sm truncate">{(job as { job_title?: string })?.job_title ?? "Unknown Role"}</h4>
        <p className="text-xs text-slate-400 truncate">{(job as { company?: string })?.company ?? "Unknown Company"} • {(job as { location?: string })?.location}</p>
        {app.notes && (
          <p className="text-xs text-slate-500 italic mt-1 line-clamp-1">{app.notes}</p>
        )}
        <p className="text-[10px] text-slate-600 mt-1">
          {app.status_updated_at ? new Date(app.status_updated_at).toLocaleDateString() : ""}
        </p>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {(job as { url?: string })?.url && (
          <a
            href={(job as { url?: string }).url}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-400 transition-all"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        )}

        <div className="relative">
          <button
            onClick={() => setOpen(!open)}
            disabled={isUpdating}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs font-semibold transition-all disabled:opacity-50"
          >
            {isUpdating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
            Move
            <ChevronDown className="w-3 h-3" />
          </button>

          {open && (
            <div className="absolute right-0 top-full mt-1 w-40 bg-slate-900 border border-slate-700 rounded-xl shadow-xl z-20 py-1">
              {NEXT_STATUSES.filter(s => s !== app.status).map(s => {
                const cfg = STATUS_CONFIG[s];
                return (
                  <button
                    key={s}
                    onClick={() => { onStatusChange(app.id, s); setOpen(false); }}
                    className={`w-full text-left px-3 py-2 text-xs font-medium flex items-center gap-2 hover:bg-slate-800 transition-colors ${cfg.color}`}
                  >
                    {cfg.icon} {cfg.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
