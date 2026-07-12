"use client";

import { useState, useEffect, useCallback } from "react";
import {
  X,
  Briefcase,
  Building2,
  MapPin,
  Sparkles,
  Loader2,
  CheckCircle,
  AlertTriangle,
  AlertCircle,
  Info,
  Target,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  setTargetRole,
  getSkillGapAnalysis,
  type Job,
  type MatchedJob,
  type MissingSkill,
} from "@/lib/api";
import { CoursePlaceholder } from "@/components/course-placeholder";

interface JobDetailModalProps {
  job: Job | MatchedJob | null;
  open: boolean;
  onClose: () => void;
}

const importanceMeta: Record<
  string,
  { color: string; bg: string; border: string; icon: React.ReactNode }
> = {
  High: {
    color: "text-red-400",
    bg: "bg-red-500/10",
    border: "border-red-500/20",
    icon: <AlertTriangle className="h-3 w-3" />,
  },
  Medium: {
    color: "text-orange-400",
    bg: "bg-orange-500/10",
    border: "border-orange-500/20",
    icon: <AlertCircle className="h-3 w-3" />,
  },
  Low: {
    color: "text-blue-400",
    bg: "bg-blue-500/10",
    border: "border-blue-500/20",
    icon: <Info className="h-3 w-3" />,
  },
};

export function JobDetailModal({ job, open, onClose }: JobDetailModalProps) {
  const [gaps, setGaps] = useState<MissingSkill[]>([]);
  const [gapLoading, setGapLoading] = useState(false);
  const [gapError, setGapError] = useState("");
  const [analysisRun, setAnalysisRun] = useState(false);

  const matchedJob = job as MatchedJob;
  const hasMatch = matchedJob?.match_percentage !== undefined;

  // Reset state when job changes
  useEffect(() => {
    setGaps([]);
    setGapError("");
    setAnalysisRun(false);
  }, [job?.id]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (open) window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  // Prevent body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const runSkillGap = useCallback(async () => {
    if (!job?.id) return;
    const cvId = localStorage.getItem("cv_id");
    if (!cvId) {
      setGapError("No CV found. Please upload your CV first.");
      return;
    }

    setGapLoading(true);
    setGapError("");
    setGaps([]);
    try {
      await setTargetRole(cvId, job.id);
      const res = await getSkillGapAnalysis(cvId);
      setGaps(res.missing_skills);
      setAnalysisRun(true);
    } catch (err) {
      setGapError(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setGapLoading(false);
    }
  }, [job?.id]);

  if (!open || !job) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Slide-over panel */}
      <div className="relative w-full max-w-2xl h-full bg-[#070b14] border-l border-blue-500/10 overflow-y-auto animate-in slide-in-from-right duration-300">
        {/* Close button */}
        <button
          onClick={onClose}
          className="sticky top-4 float-right mr-4 z-10 p-2 rounded-xl bg-slate-900/80 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="p-6 pt-4 space-y-6">
          {/* ── Header ── */}
          <div className="space-y-3 pr-10">
            <div className="flex items-start gap-3">
              <div className="p-3 rounded-xl bg-blue-950/20 border border-blue-500/20 text-blue-400 flex-shrink-0">
                <Briefcase className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h2 className="text-xl font-extrabold text-slate-100">
                  {job.job_title}
                </h2>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1">
                  <span className="flex items-center gap-1.5 text-sm text-slate-400">
                    <Building2 className="h-3.5 w-3.5" /> {job.company}
                  </span>
                  <span className="flex items-center gap-1.5 text-sm text-slate-500">
                    <MapPin className="h-3.5 w-3.5" /> {job.location}
                  </span>
                </div>
              </div>
            </div>

            {hasMatch && (
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-green-400 bg-green-500/10 border border-green-500/20 px-3 py-1.5 rounded-full">
                <Sparkles className="h-3 w-3" />
                {matchedJob.match_percentage}% Match
              </span>
            )}
          </div>

          {/* ── Full Description ── */}
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Job Description
            </h3>
            <div className="text-sm text-slate-300 leading-relaxed whitespace-pre-line bg-slate-900/20 border border-slate-800/60 rounded-xl p-4">
              {job.clean_description}
            </div>
          </div>

          {/* ── Skill Gap Analysis ── */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Target className="h-3.5 w-3.5 text-cyan-400" /> Skill Gap Analysis
              </h3>
              {!analysisRun && !gapLoading && (
                <Button
                  onClick={runSkillGap}
                  size="sm"
                  className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white border-none text-xs h-8 rounded-lg"
                >
                  <Sparkles className="h-3 w-3 mr-1.5" /> Analyse Skills
                </Button>
              )}
            </div>

            {gapLoading ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
                <div className="relative">
                  <div className="absolute inset-0 rounded-full border-4 border-cyan-500/20 animate-pulse" />
                  <Loader2 className="h-10 w-10 animate-spin text-cyan-400 relative z-10" />
                </div>
                <p className="text-sm text-slate-400">Analysing skill gaps…</p>
              </div>
            ) : gapError ? (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                {gapError}
              </div>
            ) : analysisRun && gaps.length === 0 ? (
              <div className="flex items-center gap-3 p-4 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400">
                <CheckCircle className="h-5 w-5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-bold">Perfect Match!</p>
                  <p className="text-xs text-green-400/70">
                    Your CV covers all key skills for this role.
                  </p>
                </div>
              </div>
            ) : analysisRun && gaps.length > 0 ? (
              <div className="space-y-2">
                <div className="flex gap-2 text-xs mb-2">
                  <span className="px-2 py-0.5 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 font-medium">
                    {gaps.filter((g) => g.importance === "High").length} High
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 font-medium">
                    {gaps.filter((g) => g.importance === "Medium").length} Med
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 font-medium">
                    {gaps.filter((g) => g.importance === "Low").length} Low
                  </span>
                </div>

                {gaps.map((gap, i) => {
                  const meta =
                    importanceMeta[gap.importance] || importanceMeta.Low;
                  return (
                    <div
                      key={i}
                      className={`p-3 rounded-xl ${meta.bg} border ${meta.border} space-y-1`}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${meta.color} ${meta.bg} border ${meta.border}`}
                        >
                          {meta.icon}
                          {gap.importance}
                        </span>
                        <span className="text-sm font-bold text-slate-200">
                          {gap.skill}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        {gap.reason}
                      </p>
                    </div>
                  );
                })}

                {/* Course Recommendations Placeholder */}
                <CoursePlaceholder missingSkills={gaps} />
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-slate-900/20 border border-slate-800/60 text-center">
                <p className="text-xs text-slate-500">
                  Click &quot;Analyse Skills&quot; to compare your CV against this job&apos;s requirements.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
