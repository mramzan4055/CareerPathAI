"use client";

import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  Target,
  Loader2,
  Search,
  AlertTriangle,
  GraduationCap,
  Sparkles,
  ChevronRight,
  BookmarkPlus,
  BookMarked,
  Trash2,
} from 'lucide-react';
import { CoursePlaceholder } from "@/components/course-placeholder";
import {
  matchJobs,
  findJobs,
  setTargetRole,
  getSkillGapAnalysis,
  getCustomSkillGapAnalysis,
  getCourseRecommendations,
  saveLearningPlan,
  getLearningPlans,
  deleteLearningPlan,
  type MatchedJob,
  type MissingSkill,
  type Course,
  type LearningPlan,
} from "@/lib/api";
import { useSupabaseAuth } from "@/providers/supabase-auth-provider";
import { supabase } from "@/lib/supabase-browser";
import { sortJobsByInterest } from "@/lib/utils";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

// Per-importance weights used to derive readiness, roadmap length, and the
// radar's coverage estimate from the real skill-gap data returned by the API.
const IMPORTANCE_WEIGHT: Record<string, number> = { High: 15, Medium: 8, Low: 3 };
const IMPORTANCE_WEEKS: Record<string, number> = { High: 3, Medium: 2, Low: 1 };
const IMPORTANCE_COVERAGE: Record<string, number> = { High: 30, Medium: 55, Low: 75 };

export default function SkillsPage() {
  const { user } = useSupabaseAuth();
  const router = useRouter();

  // -- Data State --
  const [matches, setMatches] = useState<MatchedJob[]>([]);
  const [selectedJob, setSelectedJob] = useState<MatchedJob | null>(null);
  const [gaps, setGaps] = useState<MissingSkill[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);
  const [initLoading, setInitLoading] = useState(true);
  const [hasCv, setHasCv] = useState(false);
  const [analysisDone, setAnalysisDone] = useState(false);

  // -- UI State --
  const [selectedGap, setSelectedGap] = useState<MissingSkill | null>(null);
  const [hoveredSkill, setHoveredSkill] = useState<string | null>(null);
  const [showRoadmap, setShowRoadmap] = useState(false);
  const [cvId, setCvId] = useState<string | null>(null);
  const [savingPlan, setSavingPlan] = useState(false);
  const [savedPlans, setSavedPlans] = useState<LearningPlan[]>([]);
  const [showSavedPlans, setShowSavedPlans] = useState(false);
  const [loadingSavedPlans, setLoadingSavedPlans] = useState(false);

  // -- Search State --
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<MatchedJob[]>([]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const res = await findJobs(searchQuery, "us", 5);
      const mapped = res.data.map(j => ({ ...j, similarity: 0, match_percentage: 0 } as MatchedJob));
      setSearchResults(mapped);
      if (mapped.length > 0) {
        handleJobSelect(mapped[0]);
      } else {
        toast.error("No jobs found for that role.");
      }
    } catch {
      toast.error("Failed to search jobs");
    } finally {
      setSearching(false);
    }
  };

  const runAnalysisForJob = async (cvId: string, job: MatchedJob) => {
    setLoadingAnalysis(true);
    setAnalysisDone(false);
    setGaps([]);
    setCourses([]);
    setSelectedGap(null);
    setShowRoadmap(false);
    try {
      let res;
      if (job.id) {
        await setTargetRole(cvId, job.id);
        res = await getSkillGapAnalysis(cvId);
      } else {
        // Job from ad-hoc search without a DB id yet
        res = await getCustomSkillGapAnalysis(cvId, job.clean_description);
      }
      setGaps(res.missing_skills);
      setAnalysisDone(true);
      if (res.missing_skills.length > 0) {
        setSelectedGap(res.missing_skills[0]);
        // Fetch real courses based on missing skills in the background
        setLoadingCourses(true);
        getCourseRecommendations(res.missing_skills)
          .then(courseRes => setCourses(courseRes.courses))
          .catch(err => console.error("Failed to load courses", err))
          .finally(() => setLoadingCourses(false));
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Analysis failed";
      toast.error(msg);
    } finally {
      setLoadingAnalysis(false);
    }
  };

  const handleJobSelect = async (job: MatchedJob) => {
    setSelectedJob(job);
    const cvId = localStorage.getItem("cv_id");
    if (!cvId) {
      toast.error("No CV found. Please upload your CV first.");
      return;
    }
    await runAnalysisForJob(cvId, job);
  };

  useEffect(() => {
    const syncAndLoad = async () => {
      setInitLoading(true);
      let cvId = localStorage.getItem("cv_id");
      let interests: string[] = [];

      if (user) {
        try {
          const { data } = await supabase
            .from("profiles")
            .select("cv_id, interests")
            .eq("id", user.id)
            .maybeSingle();

          if (!cvId && data?.cv_id) {
            cvId = data.cv_id;
            localStorage.setItem("cv_id", data.cv_id);
          }
          if (data?.interests) {
            interests = data.interests.split(",").map((s: string) => s.trim()).filter(Boolean);
          }
        } catch {}
      }

      setHasCv(Boolean(cvId));
      setCvId(cvId);

      if (cvId) {
        try {
          const res = await matchJobs(cvId, 10);
          const sortedMatches = sortJobsByInterest(res.matches, interests);
          setMatches(sortedMatches);
          if (sortedMatches.length > 0) {
            setSelectedJob(sortedMatches[0]);
            await runAnalysisForJob(cvId, sortedMatches[0]);
          }
        } catch (err) {
          console.error("Failed to load matches:", err);
        }
      }
      setInitLoading(false);
    };

    syncAndLoad();
  }, [user]);

  const fetchSavedPlans = async () => {
    if (!user) return;
    setLoadingSavedPlans(true);
    try {
      const res = await getLearningPlans();
      setSavedPlans(res.data);
    } catch (err) {
      console.error("Failed to load saved learning plans:", err);
    } finally {
      setLoadingSavedPlans(false);
    }
  };

  useEffect(() => {
    fetchSavedPlans();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const handleDeletePlan = async (planId: string) => {
    const previous = savedPlans;
    setSavedPlans(prev => prev.filter(p => p.id !== planId));
    try {
      await deleteLearningPlan(planId);
      toast.success("Roadmap deleted");
    } catch {
      setSavedPlans(previous);
      toast.error("Failed to delete roadmap");
    }
  };

  if (initLoading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!hasCv && matches.length === 0) {
    return (
      <div className="space-y-6 max-w-3xl">
        <div className="p-8 bg-slate-900/30 border border-slate-800/80 rounded-2xl flex flex-col items-center text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-blue-950/20 border border-blue-500/20 flex items-center justify-center">
            <TrendingUp className="w-8 h-8 text-blue-400" />
          </div>
          <h1 className="text-xl font-extrabold text-slate-100">Upload your CV to see Skill Gaps</h1>
          <p className="text-sm text-slate-400 max-w-lg mx-auto">
            We need to parse your resume before we can analyze your semantic profile against market roles.
          </p>
          <button
            onClick={() => router.push("/dashboard/cv")}
            className="mt-4 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-500/20"
          >
            Go to CV Upload
          </button>
        </div>
      </div>
    );
  }

  // ── Derived metrics (all computed from the real gap analysis) ──────────────
  const highGaps = gaps.filter(g => g.importance === 'High');
  const mediumGaps = gaps.filter(g => g.importance === 'Medium');
  const lowGaps = gaps.filter(g => g.importance === 'Low');
  const criticalGapsCount = highGaps.length;

  // Readiness: prefer the real vector-similarity score for AI-matched jobs;
  // otherwise derive it from the weighted gap penalty (used for custom searches).
  const gapPenalty = gaps.reduce((sum, g) => sum + (IMPORTANCE_WEIGHT[g.importance] ?? 3), 0);
  const computedReadiness = Math.max(15, 100 - gapPenalty);
  const readinessScore = selectedJob && selectedJob.match_percentage > 0
    ? Math.round(selectedJob.match_percentage)
    : computedReadiness;

  // Roadmap length scales with the number and severity of gaps.
  const estimatedWeeks = gaps.reduce((sum, g) => sum + (IMPORTANCE_WEEKS[g.importance] ?? 1), 0);

  // Study phases, built from the real gaps grouped by priority.
  const phaseStyles: Record<string, { badge: string; chip: string }> = {
    blue: { badge: 'bg-blue-950/50 border-blue-500 text-blue-400', chip: 'bg-blue-500/10 text-blue-300 border-blue-500/20' },
    indigo: { badge: 'bg-indigo-950/50 border-indigo-400 text-indigo-400', chip: 'bg-indigo-500/10 text-indigo-300 border-indigo-500/20' },
    cyan: { badge: 'bg-cyan-950/50 border-cyan-400 text-cyan-400', chip: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/20' },
  };
  const phases = [
    { skills: highGaps, title: 'Close Critical Gaps', desc: 'Prioritize the high-impact skills currently blocking this role.', color: 'blue' },
    { skills: mediumGaps, title: 'Strengthen Core Competencies', desc: 'Build working fluency in the moderately important skills.', color: 'indigo' },
    { skills: lowGaps, title: 'Polish & Differentiate', desc: 'Round out the nice-to-have skills to stand out from other candidates.', color: 'cyan' },
  ].filter(p => p.skills.length > 0);

  const handleSaveRoadmap = async () => {
    if (!selectedJob || gaps.length === 0) return;
    setSavingPlan(true);
    try {
      const planData = {
        jobTitle: selectedJob.job_title,
        company: selectedJob.company,
        readinessScore,
        estimatedWeeks,
        phases: phases.map(p => ({ title: p.title, desc: p.desc, skills: p.skills })),
      };
      await saveLearningPlan(
        `${selectedJob.job_title} Roadmap`,
        planData,
        cvId || undefined,
        selectedJob.id || undefined
      );
      toast.success("Roadmap saved! Find it under My Saved Roadmaps.");
      fetchSavedPlans();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save roadmap");
    } finally {
      setSavingPlan(false);
    }
  };

  // Radar: top gaps as "coverage vs requirement". Coverage is an estimate
  // derived from each gap's priority (higher priority => larger gap).
  const radarSkills = gaps.length > 0
    ? gaps.slice(0, 5).map((g, i) => ({
        name: g.skill,
        current: IMPORTANCE_COVERAGE[g.importance] ?? 55,
        target: 95,
        angle: i * (360 / Math.min(gaps.length, 5)),
      }))
    : [
        { name: 'Core Match', current: readinessScore, target: 95, angle: 0 },
        { name: 'Experience', current: readinessScore, target: 90, angle: 72 },
        { name: 'Tools', current: readinessScore, target: 85, angle: 144 },
        { name: 'Domain', current: readinessScore, target: 95, angle: 216 },
        { name: 'Alignment', current: readinessScore, target: 90, angle: 288 },
      ];

  const polarToCartesian = (angleDegrees: number, percentage: number) => {
    const angleRadians = (angleDegrees - 90) * (Math.PI / 180);
    const radius = (percentage / 100) * 85;
    const x = 125 + radius * Math.cos(angleRadians);
    const y = 125 + radius * Math.sin(angleRadians);
    return { x, y };
  };

  const currentPoints = radarSkills.map(s => {
    const { x, y } = polarToCartesian(s.angle, s.current);
    return `${x},${y}`;
  }).join(' ');

  const targetPoints = radarSkills.map(s => {
    const { x, y } = polarToCartesian(s.angle, s.target);
    return `${x},${y}`;
  }).join(' ');

  return (
    <div className="space-y-6 select-none animate-in fade-in duration-500 max-w-[1400px]">

      {/* Target Role Selector Header */}
      <div className="p-5 bg-slate-900/30 border border-slate-800/80 rounded-2xl space-y-4">

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-xl font-extrabold text-slate-100 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-400" /> Skill Gap Analysis & Alignment
            </h1>
            <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
              {selectedJob ? (
                <>
                  Semantic comparison of your profile versus{' '}
                  <strong className="text-slate-200">{selectedJob.job_title}</strong>
                  {selectedJob.company ? <> at <strong className="text-slate-200">{selectedJob.company}</strong></> : null}.
                </>
              ) : (
                <>Select a role below to compare it against your CV.</>
              )}
              {loadingAnalysis && <Loader2 className="w-3 h-3 animate-spin text-blue-400" />}
            </p>
          </div>

          <form onSubmit={handleSearch} className="flex w-full md:w-auto relative">
            <input
              type="text"
              placeholder="Search custom role (e.g. Product Manager)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full md:w-64 bg-slate-900/60 border border-slate-700/50 rounded-l-xl pl-4 pr-4 py-2 text-xs text-slate-100 focus:outline-none focus:border-blue-500/50 transition-colors placeholder:text-slate-500"
            />
            <button
              type="submit"
              disabled={searching}
              aria-label="Search roles"
              className="px-4 py-2 rounded-r-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors disabled:opacity-50 border border-blue-600 border-l-0"
            >
              {searching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
            </button>
          </form>
        </div>

        <div className="pt-3 border-t border-slate-800/60">

          {searchResults.length > 0 && (
            <div className="mb-4">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Search className="w-3 h-3 text-cyan-400" /> Custom Search Results
              </div>
              <div className="flex gap-2 w-full overflow-x-auto pb-2 custom-scrollbar">
                {searchResults.map((job, idx) => (
                  <button
                    key={job.id ?? `search-${idx}`}
                    onClick={() => handleJobSelect(job)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${
                      selectedJob === job
                        ? 'bg-blue-600/20 border-blue-500/40 text-blue-400 shadow-sm shadow-blue-500/10'
                        : 'bg-slate-900/40 border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-slate-300'
                    }`}
                  >
                    {job.job_title} <span className="text-[10px] font-normal opacity-70 ml-1">({job.company})</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {matches.length > 0 && (
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Target className="w-3 h-3 text-indigo-400" /> AI Matched Roles (Based on CV)
              </div>
              <div className="flex gap-2 w-full overflow-x-auto pb-2 custom-scrollbar">
                {matches.map(job => (
                  <button
                    key={job.id}
                    onClick={() => handleJobSelect(job)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border flex items-center gap-2 ${
                      selectedJob?.id === job.id
                        ? 'bg-indigo-600/20 border-indigo-500/40 text-indigo-400 shadow-sm shadow-indigo-500/10'
                        : 'bg-slate-900/40 border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-slate-300'
                    }`}
                  >
                    {job.job_title}
                    {job.match_percentage > 0 && (
                      <span className="text-[10px] font-mono opacity-80">{Math.round(job.match_percentage)}%</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

      </div>

      {/* Bento Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

        <div className="p-5 bg-slate-900/30 border border-slate-800/80 rounded-2xl flex justify-between items-center transition-all hover:bg-slate-800/40">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Critical Skill Gaps</span>
            <span className="text-3xl font-black text-red-400">{criticalGapsCount}</span>
            <p className="text-[10px] text-slate-400 mt-1 font-medium truncate max-w-[150px]">
              {highGaps.map(g => g.skill).join(', ') || (analysisDone ? 'None — great fit!' : '—')}
            </p>
          </div>
          <div className="h-10 w-10 rounded-xl bg-red-500/10 flex items-center justify-center text-red-400 border border-red-500/20 shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

        <div className="p-5 bg-slate-900/30 border border-slate-800/80 rounded-2xl flex justify-between items-center transition-all hover:bg-slate-800/40">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Core Readiness</span>
            <span className="text-3xl font-black text-blue-400">{loadingAnalysis ? '—' : `${readinessScore}%`}</span>
            <p className="text-[10px] text-slate-400 mt-1 font-medium">
              {selectedJob && selectedJob.match_percentage > 0 ? 'Vector similarity score' : 'Estimated from skill gaps'}
            </p>
          </div>
          <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400 border border-blue-500/20 shrink-0">
            <Target className="w-5 h-5" />
          </div>
        </div>

        <div className="p-5 bg-slate-900/30 border border-slate-800/80 rounded-2xl flex justify-between items-center transition-all hover:bg-slate-800/40">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Roadmap Sprint</span>
            <span className="text-3xl font-black text-indigo-400">{estimatedWeeks > 0 ? `${estimatedWeeks} Wks` : (analysisDone ? 'Ready' : '—')}</span>
            <p className="text-[10px] text-slate-400 mt-1 font-medium">Estimated time to close gaps</p>
          </div>
          <div className="h-10 w-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 border border-indigo-500/20 shrink-0">
            <GraduationCap className="w-5 h-5" />
          </div>
        </div>

      </div>

      {/* Main Analysis Section */}
      <div className="grid grid-cols-12 gap-6">

        {/* Left Side: Radar Chart and Gaps */}
        <div className="col-span-12 lg:col-span-8 space-y-6">

          <div className="p-6 bg-slate-900/30 border border-slate-800/80 rounded-2xl grid md:grid-cols-2 gap-6 items-center">

            {/* Radar Visual */}
            <div className="space-y-4 flex flex-col items-center">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider self-start flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-blue-400" /> Skill Coverage vs Requirement
              </h4>

              <div className="relative w-64 h-64 bg-slate-900/50 border border-slate-800/80 rounded-full flex items-center justify-center shadow-inner">
                {loadingAnalysis ? (
                  <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                ) : (
                  <svg className="w-full h-full p-2" viewBox="0 0 250 250">
                    {/* Grid meshes */}
                    {[20, 40, 60, 80, 100].map(level => (
                      <polygon
                        key={level}
                        points={radarSkills.map(s => {
                          const { x, y } = polarToCartesian(s.angle, level);
                          return `${x},${y}`;
                        }).join(' ')}
                        className="fill-none stroke-slate-700/50"
                        strokeWidth={1}
                      />
                    ))}

                    {/* Axis lines */}
                    {radarSkills.map(s => {
                      const outer = polarToCartesian(s.angle, 100);
                      return (
                        <line
                          key={s.name}
                          x1="125" y1="125" x2={outer.x} y2={outer.y}
                          className="stroke-slate-700/50"
                          strokeWidth={1}
                        />
                      );
                    })}

                    {/* Target Area */}
                    <polygon points={targetPoints} className="fill-indigo-500/10 stroke-indigo-400/50" strokeWidth={1} strokeDasharray="4" />

                    {/* Current Area */}
                    <polygon points={currentPoints} className="fill-blue-500/20 stroke-blue-400 drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]" strokeWidth={2} />

                    {/* Skill text labels */}
                    {radarSkills.map(s => {
                      const labelPos = polarToCartesian(s.angle, 115);
                      const isHovered = hoveredSkill === s.name;
                      return (
                        <text
                          key={s.name}
                          x={labelPos.x} y={labelPos.y}
                          fontSize="7.5"
                          fontWeight="bold"
                          fontFamily="monospace"
                          fill={isHovered ? '#60a5fa' : '#64748b'}
                          textAnchor="middle"
                          onMouseEnter={() => setHoveredSkill(s.name)}
                          onMouseLeave={() => setHoveredSkill(null)}
                          className="cursor-pointer transition-all uppercase"
                        >
                          {s.name.substring(0, 12)}
                        </text>
                      );
                    })}
                  </svg>
                )}
              </div>

              {/* Legend */}
              <div className="flex justify-center gap-4 font-mono text-[10px]">
                <span className="flex items-center gap-1.5 text-blue-400">
                  <span className="w-3 h-2 rounded-sm bg-blue-500/30 border border-blue-400" /> Your coverage
                </span>
                <span className="flex items-center gap-1.5 text-indigo-400">
                  <span className="w-3 h-0 border-t border-dashed border-indigo-400" /> Role requirement
                </span>
              </div>
            </div>

            {/* Gap Description & Action selection */}
            <div className="space-y-4 max-h-[300px] flex flex-col">
              <h3 className="text-sm font-bold text-slate-100 shrink-0">Skill Gap Overview</h3>

              <div className="space-y-3 overflow-y-auto custom-scrollbar pr-2 flex-1">
                {loadingAnalysis ? (
                  <div className="p-4 text-center border border-slate-800 rounded-xl text-slate-500 text-xs flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" /> Analyzing your profile…
                  </div>
                ) : gaps.length === 0 ? (
                  <div className="p-4 text-center border border-slate-800 rounded-xl text-slate-500 text-xs">
                    {analysisDone ? 'No significant skill gaps found — you are a strong match!' : 'Select a role to run the analysis.'}
                  </div>
                ) : (
                  gaps.map((gap, i) => (
                    <div
                      key={gap.skill + i}
                      onClick={() => setSelectedGap(gap)}
                      className={`p-3.5 rounded-xl border cursor-pointer transition-all ${selectedGap?.skill === gap.skill ? 'bg-slate-800/60 border-blue-500/50' : 'bg-slate-900/40 border-slate-800/80 hover:border-slate-700'}`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="pr-2">
                          <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block mb-0.5">Missing Skill</span>
                          <div className="text-xs font-bold text-slate-200">{gap.skill}</div>
                        </div>

                        <span className={`shrink-0 px-2 py-0.5 rounded text-[8px] font-bold uppercase ${gap.importance === 'High' ? 'bg-red-500/15 text-red-400 border border-red-500/20' : (gap.importance === 'Medium' ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20' : 'bg-blue-500/10 text-blue-400 border border-blue-500/20')}`}>
                          {gap.importance} PRIORITY
                        </span>
                      </div>
                      {selectedGap?.skill === gap.skill && (
                        <p className="text-[10px] text-slate-400 mt-2 leading-relaxed pt-2 border-t border-slate-700/50">
                          {gap.reason}
                        </p>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>

          {/* Action Sprint trigger */}
          {gaps.length > 0 && (
            <div className="p-5 bg-slate-900/30 border border-slate-800/80 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <div className="text-xs font-bold text-slate-100">Personalized Learning Roadmap Ready</div>
                <p className="text-[11px] text-slate-400 mt-0.5">We have curated real course recommendations based on your parsed gaps to bridge the requirements.</p>
              </div>

              <button
                onClick={() => setShowRoadmap(!showRoadmap)}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1 transition-colors shadow-lg shadow-blue-500/20 shrink-0"
              >
                {showRoadmap ? "Hide Courses" : "Access Learning Roadmap"} <ChevronRight className={`w-4 h-4 transition-transform ${showRoadmap ? 'rotate-90' : ''}`} />
              </button>
            </div>
          )}

          {showRoadmap && (
            <div className="animate-in fade-in slide-in-from-top-2 duration-300">
              {loadingCourses ? (
                <div className="flex flex-col items-center justify-center p-8 space-y-3 text-center border-t border-slate-800/60 mt-6">
                  <Loader2 className="h-5 w-5 animate-spin text-amber-500" />
                  <p className="text-xs text-slate-400">Curating highly relevant course recommendations based on your exact skill gap...</p>
                </div>
              ) : (
                <CoursePlaceholder missingSkills={gaps} courses={courses} />
              )}
            </div>
          )}

        </div>

        {/* Right Side: Dynamic Study Roadmap built from real gaps */}
        <div className="col-span-12 lg:col-span-4 space-y-6">

          <div className="p-5 bg-slate-900/30 border border-slate-800/80 rounded-2xl space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-100">Your Study Roadmap</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {estimatedWeeks > 0
                  ? `~${estimatedWeeks} weeks, sequenced by skill priority.`
                  : 'Sequenced by skill priority.'}
              </p>
            </div>

            {loadingAnalysis ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
              </div>
            ) : phases.length === 0 ? (
              <div className="p-4 text-center border border-slate-800 rounded-xl text-slate-500 text-xs">
                {analysisDone
                  ? 'No gaps to bridge — your profile already covers this role.'
                  : 'Select a role to generate your roadmap.'}
              </div>
            ) : (
              <div className="space-y-4 relative before:absolute before:top-2 before:bottom-2 before:left-3 before:w-0.5 before:bg-slate-800 pr-1">
                {phases.map((phase, idx) => {
                  const style = phaseStyles[phase.color];
                  return (
                    <div key={phase.title} className="flex gap-4 relative">
                      <div className={`w-6 h-6 rounded-full ${style.badge} flex items-center justify-center font-mono text-[10px] font-bold shrink-0 z-10`}>
                        {idx + 1}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-200">{phase.title}</div>
                        <p className="text-[10px] text-slate-400 leading-relaxed mt-0.5">{phase.desc}</p>
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {phase.skills.map(s => (
                            <span key={s.skill} className={`text-[9px] font-semibold px-2 py-0.5 rounded-full border ${style.chip}`}>
                              {s.skill}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {phases.length > 0 && (
              <button
                onClick={handleSaveRoadmap}
                disabled={savingPlan}
                className="w-full py-2 rounded-lg bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 font-bold text-xs hover:bg-indigo-600/30 transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {savingPlan ? (
                  <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving...</>
                ) : (
                  <><BookmarkPlus className="w-3.5 h-3.5" /> Save This Roadmap</>
                )}
              </button>
            )}
          </div>

          {/* My Saved Roadmaps */}
          <div className="p-5 bg-slate-900/30 border border-slate-800/80 rounded-2xl space-y-4">
            <button
              onClick={() => setShowSavedPlans(!showSavedPlans)}
              className="w-full flex items-center justify-between text-left"
            >
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <BookMarked className="w-4 h-4 text-indigo-400" /> My Saved Roadmaps
                {savedPlans.length > 0 && (
                  <span className="text-[10px] font-mono text-slate-500">({savedPlans.length})</span>
                )}
              </h3>
              <ChevronRight className={`w-4 h-4 text-slate-500 transition-transform ${showSavedPlans ? 'rotate-90' : ''}`} />
            </button>

            {showSavedPlans && (
              <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                {loadingSavedPlans ? (
                  <div className="flex items-center justify-center py-6">
                    <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                  </div>
                ) : savedPlans.length === 0 ? (
                  <p className="text-xs text-slate-500 text-center py-4">
                    No saved roadmaps yet. Generate an analysis above and click &quot;Save This Roadmap&quot;.
                  </p>
                ) : (
                  savedPlans.map(plan => (
                    <div
                      key={plan.id}
                      className="flex items-center justify-between gap-2 p-3 rounded-xl bg-slate-900/40 border border-slate-800/80"
                    >
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-200 truncate">{plan.title}</div>
                        <div className="text-[10px] text-slate-500 mt-0.5">
                          Saved {new Date(plan.created_at).toLocaleDateString(undefined, { dateStyle: "medium" })}
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeletePlan(plan.id)}
                        title="Delete roadmap"
                        className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors flex-shrink-0"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

        </div>
      </div>

    </div>
  );
}
