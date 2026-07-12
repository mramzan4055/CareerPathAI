"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  findJobs,
  matchJobs,
  saveJob,
  setTargetRole,
  getSkillGapAnalysis,
  getCourseRecommendations,
  type Job,
  type MatchedJob,
  type MissingSkill,
  type Course,
} from "@/lib/api";
import { useSupabaseAuth } from "@/providers/supabase-auth-provider";
import { supabase } from "@/lib/supabase-browser";
import { sortJobsByInterest } from "@/lib/utils";
import {
  Search,
  MapPin,
  CheckCircle,
  Sparkles,
  AlertTriangle,
  Sliders,
  ChevronRight,
  CheckCircle2,
  Loader2,
  Briefcase,
  AlertCircle,
  Target
} from "lucide-react";
import { toast } from "sonner";
import { CoursePlaceholder } from "@/components/course-placeholder";

type TabType = "search" | "matches";

export default function JobsPage() {
  const { user } = useSupabaseAuth();

  // -- API State --
  const [activeTab, setActiveTab] = useState<TabType>("search");
  const [apiQuery, setApiQuery] = useState("software engineer");
  const [apiLocation, setApiLocation] = useState("us");
  const [resultCount, setResultCount] = useState(10);

  const [searchResults, setSearchResults] = useState<Job[]>([]);
  const [matchResults, setMatchResults] = useState<MatchedJob[]>([]);
  const [loading, setLoading] = useState(false);
  const [matchLoading, setMatchLoading] = useState(false);
  const [error, setError] = useState("");
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [interests, setInterests] = useState<string[]>([]);

  // -- Local Filters State --
  const [localSearch, setLocalSearch] = useState('');
  const [minScore, setMinScore] = useState(60);
  const [remoteOnly, setRemoteOnly] = useState(false);
  const [highMatchOnly, setHighMatchOnly] = useState(false);

  // -- Detail Panel State --
  const [selectedJob, setSelectedJob] = useState<Job | MatchedJob | null>(null);
  const [gaps, setGaps] = useState<MissingSkill[]>([]);
  const [gapLoading, setGapLoading] = useState(false);
  const [gapError, setGapError] = useState("");
  const [analysisRun, setAnalysisRun] = useState(false);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(false);

  // Sync CV ID
  useEffect(() => {
    const syncCVId = async () => {
      const cvId = localStorage.getItem("cv_id");
      if (!cvId && user) {
        try {
          const { data } = await supabase
            .from("profiles")
            .select("cv_id")
            .eq("id", user.id)
            .maybeSingle();

          if (data?.cv_id) {
            localStorage.setItem("cv_id", data.cv_id);
          }
        } catch (err) {
          console.error("Error syncing CV ID in JobsPage:", err);
        }
      }
    };
    syncCVId();
  }, [user]);

  // Fetch career interests for match prioritization
  useEffect(() => {
    const fetchInterests = async () => {
      if (!user) return;
      try {
        const { data } = await supabase
          .from("profiles")
          .select("interests")
          .eq("id", user.id)
          .maybeSingle();
        if (data?.interests) {
          setInterests(data.interests.split(",").map((s: string) => s.trim()).filter(Boolean));
        }
      } catch {}
    };
    fetchInterests();
  }, [user]);

  // Reset detail panel state when selected job changes
  useEffect(() => {
    setGaps([]);
    setCourses([]);
    setGapError("");
    setAnalysisRun(false);
  }, [selectedJob?.id]);

  // -- API Actions --
  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoading(true);
    setError("");
    setSearchResults([]);
    setSelectedJob(null);
    try {
      const res = await findJobs(apiQuery, apiLocation, resultCount);
      setSearchResults(res.data);
      if (res.data.length === 0) setError("No jobs found for this search.");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to fetch jobs");
    } finally {
      setLoading(false);
    }
  };

  const handleMatch = async () => {
    let cvId = localStorage.getItem("cv_id");
    if (!cvId && user) {
      try {
        const { data } = await supabase
          .from("profiles")
          .select("cv_id")
          .eq("id", user.id)
          .maybeSingle();
        if (data?.cv_id) {
          cvId = data.cv_id;
          localStorage.setItem("cv_id", data.cv_id);
        }
      } catch {}
    }
    if (!cvId) {
      toast.error("No CV found. Please upload your CV first.");
      return;
    }
    setMatchLoading(true);
    setError("");
    setMatchResults([]);
    setSelectedJob(null);
    try {
      const res = await matchJobs(cvId, resultCount);
      setMatchResults(sortJobsByInterest(res.matches, interests));
      if (res.matches.length === 0)
        setError("No matches found yet. Make sure your CV is uploaded and jobs are in the DB.");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Matching failed");
    } finally {
      setMatchLoading(false);
    }
  };

  const handleSave = useCallback(
    async (jobId: string) => {
      if (!user) { toast.error("Please sign in to save jobs."); return; }
      try {
        await saveJob(jobId);
        setSavedIds((prev) => new Set(Array.from(prev).concat(jobId)));
        toast.success("Job saved!");
      } catch {
        toast.error("Failed to save job.");
      }
    },
    [user]
  );

  const runSkillGap = useCallback(async () => {
    if (!selectedJob?.id) return;
    const cvId = localStorage.getItem("cv_id");
    if (!cvId) {
      setGapError("No CV found. Please upload your CV first.");
      return;
    }

    setGapLoading(true);
    setGapError("");
    setGaps([]);
    setCourses([]);
    try {
      await setTargetRole(cvId, selectedJob.id);
      const res = await getSkillGapAnalysis(cvId);
      setGaps(res.missing_skills);
      setAnalysisRun(true);
      if (res.missing_skills.length > 0) {
        // Fetch real course recommendations in the background
        setLoadingCourses(true);
        getCourseRecommendations(res.missing_skills)
          .then(courseRes => setCourses(courseRes.courses))
          .catch(err => console.error("Failed to load courses", err))
          .finally(() => setLoadingCourses(false));
      }
    } catch (err) {
      setGapError(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setGapLoading(false);
    }
  }, [selectedJob?.id]);


  // -- Filtering Logic --
  const sourceJobs = activeTab === "search" ? searchResults : matchResults;

  const filteredJobs = sourceJobs.filter(job => {
    const matchedJob = job as MatchedJob;
    const matchScore = matchedJob.match_percentage || 0;
    const hasMatchScore = matchedJob.match_percentage !== undefined;

    const matchesSearch = job.job_title.toLowerCase().includes(localSearch.toLowerCase()) ||
      job.company.toLowerCase().includes(localSearch.toLowerCase());
    const matchesScore = !hasMatchScore || matchScore >= minScore;
    const matchesRemote = !remoteOnly || job.location.toLowerCase().includes('remote');
    const matchesHigh = !highMatchOnly || (hasMatchScore && matchScore >= 90);

    return matchesSearch && matchesScore && matchesRemote && matchesHigh;
  });

  const selectedMatched = selectedJob as MatchedJob;
  const isSelectedMatched = selectedMatched?.match_percentage !== undefined;
  const selectedScore = selectedMatched?.match_percentage || 0;

  return (
    <div className="space-y-6 select-none animate-in fade-in duration-500 max-w-[1400px]">

      {/* Header & Tabs */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-100 flex items-center gap-2">
            <Briefcase className="h-6 w-6 text-blue-400" /> Job Matching & Search
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Discover roles and get semantic insights on your fit.
          </p>
        </div>

        <div className="flex rounded-xl bg-slate-900/40 border border-slate-800 p-1 gap-1">
          {([
            { key: "search", label: "Search Jobs", icon: Search },
            { key: "matches", label: "AI Matches", icon: Sparkles },
          ] as const).map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => { setActiveTab(key); setError(""); setSelectedJob(null); }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${activeTab === key
                ? "bg-blue-600/20 text-blue-400 border border-blue-500/20 shadow-lg shadow-blue-500/10"
                : "text-slate-400 hover:text-slate-200"
                }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* API Query & Local Filters Bento */}
      <div className="p-5 bg-slate-900/30 border border-slate-800/80 rounded-2xl space-y-4">
        {/* Top Row: API Fetchers */}
        {activeTab === "search" ? (
          <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
              <input
                type="text"
                placeholder="Job title or keyword (Adzuna API)..."
                value={apiQuery}
                onChange={(e) => setApiQuery(e.target.value)}
                className="w-full bg-slate-900/60 border border-slate-700/50 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-blue-500/50 transition-colors placeholder:text-slate-500"
              />
            </div>
            <div className="w-full md:w-48 relative">
              <MapPin className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
              <input
                type="text"
                placeholder="Country (us, gb)..."
                value={apiLocation}
                onChange={(e) => setApiLocation(e.target.value)}
                className="w-full bg-slate-900/60 border border-slate-700/50 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-blue-500/50 transition-colors placeholder:text-slate-500"
              />
            </div>
            <select
              value={resultCount}
              onChange={(e) => setResultCount(Number(e.target.value))}
              className="bg-slate-900/60 border border-slate-700/50 text-slate-100 text-sm rounded-xl px-3 py-2.5 focus:border-blue-500 sm:w-24 outline-none"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50 shrink-0"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              Fetch Jobs
            </button>
          </form>
        ) : (
          <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
            <div className="text-sm text-slate-400 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-400" /> Matches are generated using your CV against our database.
            </div>
            <div className="flex gap-3 w-full md:w-auto">
              <select
                value={resultCount}
                onChange={(e) => setResultCount(Number(e.target.value))}
                className="bg-slate-900/60 border border-slate-700/50 text-slate-100 text-sm rounded-xl px-3 py-2.5 focus:border-indigo-500 sm:w-24 outline-none"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
              <button
                onClick={handleMatch}
                disabled={matchLoading}
                className="flex-1 md:flex-none px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              >
                {matchLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                Find Matches
              </button>
            </div>
          </div>
        )}

        {/* Bottom Row: Local Filters */}
        <div className="flex flex-wrap items-center justify-between gap-6 pt-3 border-t border-slate-800/60">

          <div className="flex items-center gap-4 flex-1 min-w-[200px]">
            <Search className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <input
              type="text"
              placeholder="Filter these results locally..."
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              className="w-full bg-transparent border-none text-sm text-slate-100 focus:outline-none placeholder:text-slate-600"
            />
          </div>

          {/* Match Score Slider (only relevant for matches tab) */}
          {activeTab === "matches" && (
            <div className="flex items-center gap-4 w-full md:w-auto">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-indigo-400" /> Min Score: {minScore}%
              </span>
              <input
                type="range"
                min="60"
                max="100"
                value={minScore}
                onChange={(e) => setMinScore(Number(e.target.value))}
                className="w-full md:w-32 accent-indigo-500 cursor-pointer"
              />
            </div>
          )}

          {/* Quick Toggle Chips */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setRemoteOnly(!remoteOnly)}
              className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${remoteOnly ? 'bg-blue-500/10 border-blue-500/50 text-blue-400' : 'bg-slate-900/60 border-slate-700/50 text-slate-400 hover:border-slate-600'}`}
            >
              Remote Only
            </button>
            {activeTab === "matches" && (
              <button
                onClick={() => setHighMatchOnly(!highMatchOnly)}
                className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${highMatchOnly ? 'bg-cyan-500/10 border-cyan-500/50 text-cyan-400' : 'bg-slate-900/60 border-slate-700/50 text-slate-400 hover:border-slate-600'}`}
              >
                High Match (90%+)
              </button>
            )}
          </div>

          {/* Active Job Counter */}
          <div className="text-xs font-mono text-slate-500">
            Showing <strong className="text-slate-200 font-bold">{filteredJobs.length}</strong> of {sourceJobs.length} jobs
          </div>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Main Results Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Left Side: Cards Feed */}
        <div className="col-span-1 lg:col-span-6 xl:col-span-5 space-y-4 h-[650px] overflow-y-auto custom-scrollbar pr-2 pb-4">
          {sourceJobs.length === 0 ? (
            <div className="p-12 text-center bg-slate-900/30 border border-slate-800/80 rounded-2xl space-y-3">
              <Briefcase className="w-8 h-8 text-slate-600 mx-auto" />
              <div className="text-sm font-bold text-slate-300">No jobs to display</div>
              <p className="text-xs text-slate-500">
                {activeTab === "search" ? "Use the search bar above to fetch roles from Adzuna." : "Click Find Matches to get AI semantic recommendations."}
              </p>
            </div>
          ) : filteredJobs.length === 0 ? (
            <div className="p-12 text-center bg-slate-900/30 border border-slate-800/80 rounded-2xl space-y-3">
              <AlertTriangle className="w-8 h-8 text-slate-600 mx-auto" />
              <div className="text-sm font-bold text-slate-300">No jobs found matching criteria</div>
              <p className="text-xs text-slate-500">Try lowering the Match Threshold or clearing your active filters.</p>
            </div>
          ) : (
            filteredJobs.map(job => {
              const mJob = job as MatchedJob;
              const hasScore = mJob.match_percentage !== undefined;
              const isHigh = hasScore && mJob.match_percentage >= 90;
              const isSaved = savedIds.has(job.id || "");
              const isSelected = selectedJob?.id === job.id;

              return (
                <div
                  key={job.id}
                  className={`p-5 bg-slate-900/30 border rounded-2xl transition-all relative flex flex-col justify-between cursor-pointer ${isSelected ? 'border-blue-500/50 bg-blue-950/10 shadow-lg shadow-blue-500/10' : 'border-slate-800/80 hover:border-slate-600 hover:bg-slate-800/20'}`}
                  onClick={() => setSelectedJob(job)}
                >
                  {/* Header info */}
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-slate-800/50 border border-slate-700/50 flex items-center justify-center shrink-0 text-slate-400">
                        <Briefcase className="w-5 h-5" />
                      </div>
                      <div className="min-w-0 pr-2">
                        <h4 className="font-extrabold text-slate-100 text-sm hover:text-blue-400 transition-colors truncate">{job.job_title}</h4>
                        <p className="text-xs text-slate-400 font-medium truncate mt-0.5">{job.company} • {job.location}</p>
                      </div>
                    </div>

                    {/* Score Match */}
                    {hasScore && (
                      <div className="flex flex-col items-end shrink-0">
                        <span className={`px-2 py-1 rounded-lg border text-[10px] font-mono font-black ${isHigh ? 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400' : 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400'}`}>
                          {mJob.match_percentage}%
                        </span>
                      </div>
                    )}
                  </div>

                  <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed mb-4">
                    {job.clean_description}
                  </p>

                  {/* Footer Actions */}
                  <div className="flex justify-between items-center pt-3 border-t border-slate-800/60 relative z-10" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => setSelectedJob(job)}
                      className="text-xs font-bold text-blue-400 flex items-center gap-1 hover:text-blue-300 transition-colors"
                    >
                      View Details <ChevronRight className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => handleSave(job.id || "")}
                      disabled={isSaved}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${isSaved ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'}`}
                    >
                      {isSaved ? <><CheckCircle2 className="w-3.5 h-3.5" /> Saved</> : "Save Job"}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right Side: Detail Panel */}
        <div className="col-span-1 lg:col-span-6 xl:col-span-7 h-[650px]">
          {selectedJob ? (
            <div className="p-6 bg-slate-900/30 border border-slate-800/80 rounded-2xl space-y-6 h-full flex flex-col justify-between overflow-y-auto custom-scrollbar animate-in slide-in-from-right-4 duration-300">

              <div className="space-y-6">
                {/* Profile Details Header */}
                <div className="space-y-4">
                  <div className="flex justify-between items-start">
                    <div className="w-14 h-14 rounded-2xl bg-blue-950/20 border border-blue-500/20 flex items-center justify-center shrink-0 text-blue-400">
                      <Briefcase className="w-6 h-6" />
                    </div>
                    {isSelectedMatched && (
                      <div className="text-right">
                        <span className="text-3xl font-black text-indigo-400 font-mono">{selectedScore}%</span>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Semantic Match</p>
                      </div>
                    )}
                  </div>

                  <div>
                    <h3 className="text-xl font-extrabold text-slate-100">{selectedJob.job_title}</h3>
                    <p className="text-sm text-blue-400 font-bold mt-1">
                      {selectedJob.company} • <span className="text-slate-400 font-medium">{selectedJob.location}</span>
                    </p>
                  </div>
                </div>

                {/* Job Description Summary */}
                <div className="space-y-2 pt-2">
                  <h4 className="text-xs font-bold uppercase text-slate-300 tracking-wider">Role Overview</h4>
                  <div className="text-xs text-slate-400 leading-relaxed whitespace-pre-line bg-slate-900/40 border border-slate-800/50 rounded-xl p-4">
                    {selectedJob.clean_description}
                  </div>
                </div>

                {/* Skill Gap Analysis Section */}
                <div className="pt-2 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase text-slate-300 tracking-wider flex items-center gap-1.5">
                      <Target className="w-3.5 h-3.5 text-cyan-400" /> Skill Gap Analysis
                    </h4>
                    {!analysisRun && !gapLoading && (
                      <button
                        onClick={runSkillGap}
                        className="px-3 py-1.5 rounded-lg bg-cyan-600/20 hover:bg-cyan-600/30 border border-cyan-500/30 text-cyan-400 text-xs font-bold flex items-center gap-1.5 transition-colors"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        Analyse Skills
                      </button>
                    )}
                  </div>

                  {gapLoading ? (
                    <div className="flex flex-col items-center justify-center py-6 gap-3">
                      <Loader2 className="h-6 w-6 animate-spin text-cyan-400" />
                      <p className="text-xs text-slate-400">Analysing against your CV...</p>
                    </div>
                  ) : gapError ? (
                    <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-400 flex gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" /> {gapError}
                    </div>
                  ) : analysisRun ? (
                    gaps.length === 0 ? (
                      <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-xl flex items-start gap-2.5">
                        <CheckCircle className="w-4 h-4 text-green-400 shrink-0 mt-0.5" />
                        <div>
                          <div className="text-xs font-bold text-green-400">Excellent Skill Alignment</div>
                          <p className="text-[10px] text-slate-400 leading-normal mt-0.5">
                            Your profile highlights perfectly align with this role!
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-2.5">
                          <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                          <div>
                            <div className="text-xs font-bold text-red-400">Skill Gaps Detected</div>
                            <p className="text-[10px] text-slate-400 leading-normal mt-0.5">
                              Our model predicts your resume lacks direct credentials for {gaps.length} core requirements.
                            </p>
                          </div>
                        </div>

                        <div className="space-y-2">
                          {gaps.map((gap, i) => (
                            <div key={i} className="p-3 rounded-xl bg-slate-900/40 border border-slate-800/60 space-y-1">
                              <div className="flex items-center gap-2">
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${gap.importance === 'High' ? 'bg-red-500/10 text-red-400' : 'bg-orange-500/10 text-orange-400'}`}>
                                  {gap.importance}
                                </span>
                                <span className="text-sm font-bold text-slate-200">{gap.skill}</span>
                              </div>
                              <p className="text-xs text-slate-400 leading-relaxed">{gap.reason}</p>
                            </div>
                          ))}
                        </div>

                        {/* Course Recommendations */}
                        <div className="pt-2 border-t border-slate-800/60">
                          {loadingCourses ? (
                            <div className="flex items-center gap-2 text-xs text-slate-500 py-2">
                              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading course recommendations…
                            </div>
                          ) : (
                            <CoursePlaceholder missingSkills={gaps} courses={courses} />
                          )}
                        </div>
                      </div>
                    )
                  ) : (
                    <div className="p-4 bg-slate-900/40 border border-slate-800/50 rounded-xl text-center">
                      <p className="text-xs text-slate-500">Run a skill gap analysis to compare this job to your CV.</p>
                    </div>
                  )}
                </div>

              </div>

              {/* Sticky Footer */}
              <div className="pt-4 mt-4 border-t border-slate-800/60 shrink-0">
                <button
                  onClick={() => handleSave(selectedJob.id || "")}
                  disabled={savedIds.has(selectedJob.id || "")}
                  className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:bg-slate-800 disabled:text-slate-400 disabled:border disabled:border-slate-700 shadow-lg shadow-blue-500/10"
                >
                  {savedIds.has(selectedJob.id || "") ? (
                    <><CheckCircle2 className="w-4 h-4" /> Saved Successfully</>
                  ) : (
                    <><CheckCircle2 className="w-4 h-4" /> Save this Job</>
                  )}
                </button>
              </div>

            </div>
          ) : (
            <div className="h-full flex items-center justify-center border border-slate-800/80 rounded-2xl bg-slate-900/30 p-6 shadow-inner">
              <span className="text-xs text-slate-500 font-medium">Select a job card from the feed to view details.</span>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
