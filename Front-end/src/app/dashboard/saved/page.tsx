"use client";

import { useEffect, useState, useMemo } from "react";
import { getSavedJobs, unsaveJob, updateSavedJobStatus, type SavedJobEntry, type JobApplicationStatus } from "@/lib/api";
import { useSupabaseAuth } from "@/providers/supabase-auth-provider";
import {
  Bookmark,
  Building2,
  MapPin,
  Briefcase,
  Loader2,
  Trash2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  InboxIcon,
  DollarSign,
  Clock,
  FileBadge,
  ExternalLink,
  NotebookPen,
  Send,
  Trophy,
  Search,
} from "lucide-react";
import { toast } from "sonner";

const STATUS_OPTIONS: { value: JobApplicationStatus; label: string }[] = [
  { value: "saved",        label: "Saved"        },
  { value: "applied",      label: "Applied"      },
  { value: "interviewing", label: "Interviewing" },
  { value: "offer",        label: "Offer"        },
  { value: "rejected",     label: "Rejected"     },
  { value: "withdrawn",    label: "Withdrawn"    },
];

const statusStyles: Record<JobApplicationStatus, string> = {
  saved:        "bg-slate-700/40 text-slate-300 border-slate-600/40",
  applied:      "bg-blue-500/10 text-blue-400 border-blue-500/20",
  interviewing: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  offer:        "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  rejected:     "bg-red-500/10 text-red-400 border-red-500/20",
  withdrawn:    "bg-slate-800/60 text-slate-500 border-slate-700/40",
};

// ── Stat cards ────────────────────────────────────────────────────────────────

function StatPill({
  label,
  value,
  color,
  active,
  onClick,
}: {
  label: string;
  value: number;
  color: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center p-4 rounded-xl border transition-all hover:-translate-y-0.5 duration-200 ${
        active
          ? `${color} scale-[1.02] shadow-lg`
          : "bg-slate-900/30 border-slate-800/80 hover:border-slate-700"
      }`}
    >
      <span className={`text-2xl font-black ${active ? "" : "text-slate-100"}`}>{value}</span>
      <span className={`text-[10px] font-bold uppercase tracking-wider mt-0.5 ${active ? "" : "text-slate-400"}`}>{label}</span>
    </button>
  );
}

// ── Job Card ─────────────────────────────────────────────────────────────────

const SavedJobCard = ({
  entry,
  onUnsave,
  onStatusChange,
  onNotesChange,
}: {
  entry: SavedJobEntry;
  onUnsave: (jobId: string) => void;
  onStatusChange: (savedJobId: string, status: JobApplicationStatus) => void;
  onNotesChange: (savedJobId: string, notes: string) => void;
}) => {
  const [expanded, setExpanded] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const [notesDraft, setNotesDraft] = useState(entry.notes || "");
  const job = entry.jobs;

  const handleNotesBlur = () => {
    if (notesDraft !== (entry.notes || "")) {
      onNotesChange(entry.id, notesDraft);
    }
  };

  return (
    <div className="p-5 rounded-2xl bg-slate-900/30 border border-slate-800/80 hover:border-blue-500/20 transition-all duration-300 space-y-3 animate-in fade-in duration-300">
      {/* Top row: icon + title + remove */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className="p-2.5 rounded-xl bg-indigo-950/30 border border-indigo-500/20 text-indigo-400 flex-shrink-0">
            <Briefcase className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-bold text-slate-200 truncate leading-snug">{(job as { job_title?: string })?.job_title || "Unknown Job"}</h3>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 mt-2">
              <span className="flex items-center gap-1 text-xs text-slate-400">
                <Building2 className="h-3.5 w-3.5 text-slate-500" /> {(job as { company?: string })?.company || "—"}
              </span>
              <span className="flex items-center gap-1 text-xs text-slate-500">
                <MapPin className="h-3.5 w-3.5" /> {(job as { location?: string })?.location || "—"}
              </span>
              {(job as { salary_min?: number })?.salary_min && (
                <span className="flex items-center gap-1 text-xs font-semibold text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-md border border-emerald-400/20">
                  <DollarSign className="h-3 w-3" />
                  ${(job as { salary_min?: number }).salary_min!.toLocaleString()}
                  {(job as { salary_max?: number })?.salary_max ? ` – $${(job as { salary_max?: number }).salary_max!.toLocaleString()}` : ""}
                </span>
              )}
              {(job as { contract_type?: string })?.contract_type && (
                <span className="flex items-center gap-1 text-xs font-semibold text-purple-400 capitalize bg-purple-400/10 px-2 py-0.5 rounded-md border border-purple-400/20">
                  <FileBadge className="h-3 w-3" /> {(job as { contract_type?: string }).contract_type}
                </span>
              )}
              {(job as { contract_time?: string })?.contract_time && (
                <span className="flex items-center gap-1 text-xs font-semibold text-blue-400 capitalize bg-blue-400/10 px-2 py-0.5 rounded-md border border-blue-400/20">
                  <Clock className="h-3 w-3" /> {(job as { contract_time?: string }).contract_time!.replace("_", " ")}
                </span>
              )}
            </div>
          </div>
        </div>
        <button
          onClick={() => onUnsave(entry.id)}
          title="Remove from saved"
          className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors flex-shrink-0"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {/* Description */}
      {(job as { clean_description?: string })?.clean_description && (
        <>
          <div className="text-xs text-slate-400 leading-relaxed">
            {expanded
              ? (job as { clean_description?: string }).clean_description
              : (job as { clean_description?: string }).clean_description!.slice(0, 220) + ((job as { clean_description?: string }).clean_description!.length > 220 ? "…" : "")}
          </div>
          {(job as { clean_description?: string }).clean_description!.length > 220 && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors font-medium"
            >
              {expanded ? <><ChevronUp className="h-3 w-3" /> Show less</> : <><ChevronDown className="h-3 w-3" /> Read more</>}
            </button>
          )}
        </>
      )}

      {/* Status selector + notes */}
      <div className="flex flex-wrap items-center gap-2 pt-1">
        <select
          value={entry.status}
          onChange={(e) => onStatusChange(entry.id, e.target.value as JobApplicationStatus)}
          className={`text-xs font-bold px-2.5 py-1.5 rounded-lg border cursor-pointer focus:outline-none transition-colors ${statusStyles[entry.status]}`}
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value} className="bg-slate-900 text-slate-200">
              {opt.label}
            </option>
          ))}
        </select>

        <button
          onClick={() => setNotesOpen(!notesOpen)}
          className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300 px-2.5 py-1.5 rounded-lg border border-slate-800 hover:border-slate-700 transition-colors"
        >
          <NotebookPen className="h-3.5 w-3.5" />
          {entry.notes ? "Edit notes" : "Add notes"}
        </button>
      </div>

      {notesOpen && (
        <textarea
          value={notesDraft}
          onChange={(e) => setNotesDraft(e.target.value)}
          onBlur={handleNotesBlur}
          placeholder="e.g. Interviewed with hiring manager on Friday, follow up next week..."
          rows={2}
          className="w-full bg-slate-950/60 border border-slate-800 rounded-xl p-3 text-xs text-slate-300 focus:outline-none focus:border-blue-500/50 resize-none transition-colors"
        />
      )}

      {/* Footer */}
      <div className="flex items-center justify-between mt-2 pt-3 border-t border-slate-800/60">
        <div className="text-[10px] text-slate-500 font-medium">
          Saved {new Date(entry.created_at).toLocaleDateString(undefined, { dateStyle: "medium" })}
        </div>
        {(job as { url?: string })?.url && (
          <a
            href={(job as { url?: string }).url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs font-bold text-blue-400 hover:text-blue-300 transition-colors bg-blue-500/10 hover:bg-blue-500/20 px-3 py-1.5 rounded-lg border border-blue-500/20"
          >
            Apply Now <ExternalLink className="h-3.5 w-3.5" />
          </a>
        )}
      </div>
    </div>
  );
};

// ── Main View ─────────────────────────────────────────────────────────────────

export default function SavedJobsPage() {
  const { user } = useSupabaseAuth();
  const [jobs, setJobs] = useState<SavedJobEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [search, setSearch] = useState("");

  const fetchSaved = async () => {
    if (!user) return;
    setLoading(true);
    setError("");
    try {
      const res = await getSavedJobs();
      setJobs(res.data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load saved jobs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSaved();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const handleUnsave = async (savedJobId: string) => {
    if (!user) return;
    const entry = jobs.find((j) => j.id === savedJobId);
    if (!entry) return;
    const jobId = (entry.jobs as SavedJobEntry["jobs"] & { id?: string })?.id || "";
    try {
      await unsaveJob(jobId);
      setJobs((prev) => prev.filter((j) => j.id !== savedJobId));
      toast.success("Job removed from saved list");
    } catch {
      toast.error("Failed to remove job");
    }
  };

  const handleStatusChange = async (savedJobId: string, status: JobApplicationStatus) => {
    const previous = jobs;
    setJobs((prev) => prev.map((j) => (j.id === savedJobId ? { ...j, status } : j)));
    try {
      await updateSavedJobStatus(savedJobId, status);
      toast.success("Application status updated");
    } catch {
      setJobs(previous);
      toast.error("Failed to update status");
    }
  };

  const handleNotesChange = async (savedJobId: string, notes: string) => {
    const previous = jobs;
    setJobs((prev) => prev.map((j) => (j.id === savedJobId ? { ...j, notes } : j)));
    try {
      const entry = jobs.find((j) => j.id === savedJobId);
      if (!entry) return;
      await updateSavedJobStatus(savedJobId, entry.status, notes);
      toast.success("Notes saved");
    } catch {
      setJobs(previous);
      toast.error("Failed to save notes");
    }
  };

  // Derived stats
  const byStatus = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const j of jobs) {
      counts[j.status] = (counts[j.status] ?? 0) + 1;
    }
    return counts;
  }, [jobs]);

  const filteredJobs = useMemo(() => {
    return jobs.filter(j => {
      const jobData = j.jobs as { job_title?: string; company?: string };
      const matchesStatus = !statusFilter || j.status === statusFilter;
      const matchesSearch = !search
        || (jobData?.job_title ?? "").toLowerCase().includes(search.toLowerCase())
        || (jobData?.company ?? "").toLowerCase().includes(search.toLowerCase());
      return matchesStatus && matchesSearch;
    });
  }, [jobs, statusFilter, search]);

  const STAT_CARDS = [
    { key: "all",          label: "Total",        value: jobs.length,                   color: "bg-slate-800/60 border-slate-600/60 text-slate-200" },
    { key: "applied",      label: "Applied",       value: byStatus["applied"] ?? 0,      color: "bg-blue-500/10 border-blue-500/30 text-blue-400"    },
    { key: "interviewing", label: "Interviewing",  value: byStatus["interviewing"] ?? 0, color: "bg-purple-500/10 border-purple-500/30 text-purple-400" },
    { key: "offer",        label: "Offers",        value: byStatus["offer"] ?? 0,        color: "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" },
  ];

  return (
    <div className="space-y-6 max-w-3xl animate-in fade-in duration-500">

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-100 flex items-center gap-2">
            <Bookmark className="h-6 w-6 text-indigo-400" /> Saved Jobs
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Bookmarked positions — track status and add notes as you apply.
          </p>
        </div>
        {!loading && jobs.length > 0 && (
          <div className="flex items-center gap-2 shrink-0">
            <Send className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-xs text-slate-400 font-medium">
              <strong className="text-slate-200">{byStatus["applied"] ?? 0}</strong> applied ·{" "}
              <strong className="text-slate-200">{byStatus["interviewing"] ?? 0}</strong> interviewing ·{" "}
              <strong className="text-emerald-400">{byStatus["offer"] ?? 0}</strong> offers
            </span>
          </div>
        )}
      </div>

      {/* Stat quick-filter cards */}
      {!loading && jobs.length > 0 && (
        <div className="grid grid-cols-4 gap-3">
          {STAT_CARDS.map(c => (
            <StatPill
              key={c.key}
              label={c.label}
              value={c.value}
              color={c.color}
              active={statusFilter === (c.key === "all" ? "" : c.key)}
              onClick={() => setStatusFilter(statusFilter === (c.key === "all" ? "" : c.key) ? "" : (c.key === "all" ? "" : c.key))}
            />
          ))}
        </div>
      )}

      {/* Search + filter bar */}
      {!loading && jobs.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Filter by title or company…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-slate-900/60 border border-slate-700/50 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-blue-500/50 transition-colors placeholder:text-slate-500"
            />
          </div>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="bg-slate-900/60 border border-slate-700/50 text-slate-100 text-sm rounded-xl px-3 py-2.5 outline-none sm:w-44"
          >
            <option value="">All statuses</option>
            {STATUS_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label} {byStatus[o.value] ? `(${byStatus[o.value]})` : ""}</option>
            ))}
          </select>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Empty State — no saved jobs at all */}
      {!loading && !error && jobs.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 gap-5 text-center">
          <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
            <InboxIcon className="h-8 w-8 text-indigo-400" />
          </div>
          <div>
            <p className="text-slate-200 font-bold text-base">No saved jobs yet</p>
            <p className="text-slate-500 text-sm mt-1 max-w-xs leading-relaxed">
              Head to <strong className="text-slate-400">Job Matches</strong> and click Save on roles you&apos;re interested in.
            </p>
          </div>
          <div className="flex gap-3 flex-wrap justify-center text-xs text-slate-500">
            <span className="flex items-center gap-1.5 bg-slate-900/40 border border-slate-800 px-3 py-1.5 rounded-full">
              <Bookmark className="w-3.5 h-3.5 text-indigo-400" /> Save interesting jobs
            </span>
            <span className="flex items-center gap-1.5 bg-slate-900/40 border border-slate-800 px-3 py-1.5 rounded-full">
              <Send className="w-3.5 h-3.5 text-blue-400" /> Track your applications
            </span>
            <span className="flex items-center gap-1.5 bg-slate-900/40 border border-slate-800 px-3 py-1.5 rounded-full">
              <Trophy className="w-3.5 h-3.5 text-emerald-400" /> Celebrate offers
            </span>
          </div>
        </div>
      )}

      {/* Empty State — filters show nothing */}
      {!loading && !error && jobs.length > 0 && filteredJobs.length === 0 && (
        <div className="p-8 text-center border border-dashed border-slate-700/60 rounded-2xl">
          <p className="text-slate-400 font-semibold text-sm">No jobs match your current filters.</p>
          <button
            onClick={() => { setStatusFilter(""); setSearch(""); }}
            className="mt-3 text-xs text-blue-400 hover:text-blue-300 transition-colors"
          >
            Clear filters
          </button>
        </div>
      )}

      {/* Job List */}
      {!loading && !error && filteredJobs.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs text-slate-500">
            {filteredJobs.length} of {jobs.length} job{jobs.length !== 1 ? "s" : ""}
            {statusFilter ? ` · filtered by ${statusFilter}` : ""}
          </p>
          {filteredJobs.map((entry) => (
            <SavedJobCard
              key={entry.id}
              entry={entry}
              onUnsave={handleUnsave}
              onStatusChange={handleStatusChange}
              onNotesChange={handleNotesChange}
            />
          ))}
        </div>
      )}
    </div>
  );
}
