"use client";

import { useEffect, useState } from "react";
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
} from "lucide-react";
import { toast } from "sonner";

const STATUS_OPTIONS: { value: JobApplicationStatus; label: string }[] = [
  { value: "saved", label: "Saved" },
  { value: "applied", label: "Applied" },
  { value: "interviewing", label: "Interviewing" },
  { value: "offer", label: "Offer" },
  { value: "rejected", label: "Rejected" },
  { value: "withdrawn", label: "Withdrawn" },
];

const statusStyles: Record<JobApplicationStatus, string> = {
  saved: "bg-slate-700/40 text-slate-300 border-slate-600/40",
  applied: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  interviewing: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  offer: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  rejected: "bg-red-500/10 text-red-400 border-red-500/20",
  withdrawn: "bg-slate-800/60 text-slate-500 border-slate-700/40",
};

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
    <div className="p-5 rounded-2xl bg-slate-900/30 border border-slate-800/80 hover:border-blue-500/15 transition-all duration-300 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className="p-2.5 rounded-xl bg-indigo-950/20 border border-indigo-500/20 text-indigo-400 flex-shrink-0">
            <Briefcase className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-slate-200 truncate">{job?.job_title || "Unknown Job"}</h3>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2 mt-2">
              <span className="flex items-center gap-1 text-xs text-slate-400">
                <Building2 className="h-3.5 w-3.5" /> {job?.company || "—"}
              </span>
              <span className="flex items-center gap-1 text-xs text-slate-500">
                <MapPin className="h-3.5 w-3.5" /> {job?.location || "—"}
              </span>
              {job?.salary_min && (
                <span className="flex items-center gap-1 text-xs font-medium text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-md border border-emerald-400/20">
                  <DollarSign className="h-3 w-3" />
                  ${job.salary_min.toLocaleString()}{job.salary_max ? ` - $${job.salary_max.toLocaleString()}` : ""}
                </span>
              )}
              {job?.contract_type && (
                <span className="flex items-center gap-1 text-xs font-medium text-purple-400 capitalize bg-purple-400/10 px-2 py-0.5 rounded-md border border-purple-400/20">
                  <FileBadge className="h-3 w-3" /> {job.contract_type}
                </span>
              )}
              {job?.contract_time && (
                <span className="flex items-center gap-1 text-xs font-medium text-blue-400 capitalize bg-blue-400/10 px-2 py-0.5 rounded-md border border-blue-400/20">
                  <Clock className="h-3 w-3" /> {job.contract_time.replace("_", " ")}
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

      {job?.clean_description && (
        <>
          <div className="text-xs text-slate-400 leading-relaxed">
            {expanded
              ? job.clean_description
              : job.clean_description.slice(0, 220) + (job.clean_description.length > 220 ? "…" : "")}
          </div>
          {job.clean_description.length > 220 && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors"
            >
              {expanded ? <><ChevronUp className="h-3 w-3" /> Show less</> : <><ChevronDown className="h-3 w-3" /> Read more</>}
            </button>
          )}
        </>
      )}

      {/* Application status + notes */}
      <div className="flex flex-wrap items-center gap-2 pt-1">
        <select
          value={entry.status}
          onChange={(e) => onStatusChange(entry.id, e.target.value as JobApplicationStatus)}
          className={`text-xs font-bold px-2.5 py-1.5 rounded-lg border cursor-pointer focus:outline-none ${statusStyles[entry.status]}`}
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
          className="w-full bg-slate-950/60 border border-slate-800 rounded-xl p-3 text-xs text-slate-300 focus:outline-none focus:border-blue-500/50 resize-none"
        />
      )}

      <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-800/60">
        <div className="text-[10px] text-slate-500 font-medium">
          Saved {new Date(entry.created_at).toLocaleDateString(undefined, { dateStyle: "medium" })}
        </div>
        {job?.url && (
          <a
            href={job.url}
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

export default function SavedJobsPage() {
  const { user } = useSupabaseAuth();
  const [jobs, setJobs] = useState<SavedJobEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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
    // Find the job_id from the saved entry
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

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-slate-100 flex items-center gap-2">
          <Bookmark className="h-6 w-6 text-purple-400" /> Saved Jobs
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          Jobs you&apos;ve bookmarked for later review. Track your application status and add notes as you go.
        </p>
      </div>

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

      {/* Empty State */}
      {!loading && !error && jobs.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
          <div className="h-16 w-16 rounded-2xl bg-slate-900/40 border border-slate-800 flex items-center justify-center">
            <InboxIcon className="h-8 w-8 text-slate-600" />
          </div>
          <div>
            <p className="text-slate-300 font-semibold">No saved jobs yet</p>
            <p className="text-slate-500 text-sm mt-1">
              Head to <strong>Job Matches</strong> and bookmark jobs you like.
            </p>
          </div>
        </div>
      )}

      {/* Job List */}
      {!loading && !error && jobs.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs text-slate-500">{jobs.length} saved job{jobs.length !== 1 ? "s" : ""}</p>
          {jobs.map((entry) => (
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
