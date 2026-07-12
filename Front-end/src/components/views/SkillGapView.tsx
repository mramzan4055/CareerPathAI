"use client";

import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  Target, 
  CheckCircle2,
  Loader2,
  Search,
  AlertTriangle,
  GraduationCap,
  Sparkles,
  ChevronRight,
  Users,
  X,
  Send
} from 'lucide-react';
import { CoursePlaceholder } from "@/components/course-placeholder";
import {
  matchJobs,
  findJobs,
  setTargetRole,
  getSkillGapAnalysis,
  getCustomSkillGapAnalysis,
  getCourseRecommendations,
  type MatchedJob,
  type MissingSkill,
  type Course,
} from "@/lib/api";
import { useSupabaseAuth } from "@/providers/supabase-auth-provider";
import { supabase } from "@/lib/supabase-browser";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

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

  // -- UI State --
  const [selectedGap, setSelectedGap] = useState<MissingSkill | null>(null);
  const [mentorModalOpen, setMentorModalOpen] = useState(false);
  const [mentorMessage, setMentorMessage] = useState("Hi Sarah, I'm Alex. I saw you're mentoring in UX Strategy and business metrics. I would love to connect for 15 minutes to share my profile and get feedback.");
  const [mentorSent, setMentorSent] = useState(false);
  const [hoveredSkill, setHoveredSkill] = useState<string | null>(null);
  const [showRoadmap, setShowRoadmap] = useState(false);
  
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
    setGaps([]);
    setCourses([]);
    setSelectedGap(null);
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

      if (cvId) {
        try {
          const res = await matchJobs(cvId, 10);
          setMatches(res.matches);
          if (res.matches.length > 0) {
            setSelectedJob(res.matches[0]);
            await runAnalysisForJob(cvId, res.matches[0]);
          }
        } catch (err) {
          console.error("Failed to load matches:", err);
        }
      }
      setInitLoading(false);
    };

    syncAndLoad();
  }, [user]);

  if (matches.length === 0 && !localStorage.getItem("cv_id")) {
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

  const criticalGapsCount = gaps.filter(g => g.importance === 'High').length;
  const readinessScore = selectedJob?.match_percentage || 74;

  // Generate dynamic radar skills based on gaps if available, else fallback
  const radarSkills = gaps.length > 0 
    ? gaps.slice(0, 5).map((g, i) => ({
        name: g.skill,
        current: g.importance === 'High' ? 20 : (g.importance === 'Medium' ? 45 : 70),
        target: 95,
        angle: i * (360 / Math.min(gaps.length, 5))
      }))
    : [
        { name: 'Core Match', current: readinessScore, target: 95, angle: 0 },
        { name: 'Experience', current: readinessScore, target: 90, angle: 72 },
        { name: 'Tools', current: readinessScore, target: 85, angle: 144 },
        { name: 'Domain', current: readinessScore, target: 95, angle: 216 },
        { name: 'Soft Skills', current: readinessScore, target: 90, angle: 288 },
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

  const handleSendRequest = () => {
    setMentorSent(true);
    setTimeout(() => {
      setMentorModalOpen(false);
      setMentorSent(false);
    }, 2000);
  };

  if (initLoading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

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
              Semantic comparison of your profile index versus <strong className="text-slate-200">{selectedJob?.job_title}</strong>.
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
                {searchResults.map(job => (
                  <button
                    key={job.id}
                    onClick={() => handleJobSelect(job)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${
                      selectedJob?.id === job.id 
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

          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Target className="w-3 h-3 text-indigo-400" /> AI Matched Roles (Based on CV)
            </div>
            <div className="flex gap-2 w-full overflow-x-auto pb-2 custom-scrollbar">
              {matches.map(job => (
                <button
                  key={job.id}
                  onClick={() => handleJobSelect(job)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${
                    selectedJob?.id === job.id 
                      ? 'bg-indigo-600/20 border-indigo-500/40 text-indigo-400 shadow-sm shadow-indigo-500/10' 
                      : 'bg-slate-900/40 border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-slate-300'
                  }`}
                >
                  {job.job_title}
                </button>
              ))}
            </div>
          </div>
        </div>

      </div>

      {/* Skill Gap Header */}
      <div className="p-5 bg-slate-900/30 border border-slate-800/80 rounded-2xl">
        <h2 className="text-xl font-extrabold text-slate-100 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-blue-400" /> Skill Gap Analysis & Alignment
        </h2>
        <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
          Semantic comparison of your profile index versus <strong className="text-slate-200">{selectedJob?.job_title}</strong> at {selectedJob?.company}.
          {loadingAnalysis && <Loader2 className="w-3 h-3 animate-spin text-blue-400" />}
        </p>
      </div>

      {/* Bento Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        
        <div className="p-5 bg-slate-900/30 border border-slate-800/80 rounded-2xl flex justify-between items-center transition-all hover:bg-slate-800/40">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Critical Skill Gaps</span>
            <span className="text-3xl font-black text-red-400">{criticalGapsCount}</span>
            <p className="text-[10px] text-slate-400 mt-1 font-medium truncate max-w-[150px]">
              {gaps.filter(g => g.importance === 'High').map(g => g.skill).join(', ') || 'None!'}
            </p>
          </div>
          <div className="h-10 w-10 rounded-xl bg-red-500/10 flex items-center justify-center text-red-400 border border-red-500/20 shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

        <div className="p-5 bg-slate-900/30 border border-slate-800/80 rounded-2xl flex justify-between items-center transition-all hover:bg-slate-800/40">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Core Readiness</span>
            <span className="text-3xl font-black text-blue-400">{readinessScore}%</span>
            <p className="text-[10px] text-slate-400 mt-1 font-medium">Vector similarity score</p>
          </div>
          <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400 border border-blue-500/20 shrink-0">
            <Target className="w-5 h-5" />
          </div>
        </div>

        <div className="p-5 bg-slate-900/30 border border-slate-800/80 rounded-2xl flex justify-between items-center transition-all hover:bg-slate-800/40">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Roadmap Sprint</span>
            <span className="text-3xl font-black text-indigo-400">12 Wks</span>
            <p className="text-[10px] text-slate-400 mt-1 font-medium">Personalized bridge syllabus</p>
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
                <Sparkles className="w-4 h-4 text-blue-400" /> Proficiency Radar Mesh
              </h4>

              <div className="relative w-64 h-64 bg-slate-900/50 border border-slate-800/80 rounded-full flex items-center justify-center shadow-inner">
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
                  <polygon points={currentPoints} className="fill-blue-500/20 stroke-blue-400 shadow-blue-500 drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]" strokeWidth={2} />

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

                {/* Legend Floating overlay */}
                <div className="absolute bottom-2 left-2 right-2 flex justify-between font-mono text-[9px]">
                  <span className="flex items-center gap-1 text-blue-400">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="https://i.pravatar.cc/150?u=a042581f4e29026704d" alt="Alex Rivera" className="w-8 h-8 rounded-full border border-slate-700" /> Current
                  </span>
                  <span className="flex items-center gap-1 text-indigo-400">
                    <span className="w-2 h-0.5 border-t border-dashed border-indigo-400" /> Target
                  </span>
                </div>
              </div>
            </div>

            {/* Gap Description & Action selection */}
            <div className="space-y-4 max-h-[300px] flex flex-col">
              <h3 className="text-sm font-bold text-slate-100 shrink-0">Skill Gap Overview</h3>
              
              <div className="space-y-3 overflow-y-auto custom-scrollbar pr-2 flex-1">
                {gaps.length === 0 && !loadingAnalysis ? (
                  <div className="p-4 text-center border border-slate-800 rounded-xl text-slate-500 text-xs">
                    No significant skill gaps found!
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
          <div className="p-5 bg-slate-900/30 border border-slate-800/80 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <div className="text-xs font-bold text-slate-100">Personalized Learning Roadmap Ready</div>
              <p className="text-[11px] text-slate-400 mt-0.5">We have curated custom modules based on your parsed gaps to bridge the requirements.</p>
            </div>
            
            <button 
              onClick={() => setShowRoadmap(!showRoadmap)}
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1 transition-colors shadow-lg shadow-blue-500/20 shrink-0"
            >
              {showRoadmap ? "Hide Courses" : "Access Learning Roadmap"} <ChevronRight className={`w-4 h-4 transition-transform ${showRoadmap ? 'rotate-90' : ''}`} />
            </button>
          </div>

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

        {/* Right Side: Sprint timeline & Mentorship Card */}
        <div className="col-span-12 lg:col-span-4 space-y-6">
          
          {/* Timeline */}
          <div className="p-5 bg-slate-900/30 border border-slate-800/80 rounded-2xl space-y-4">
            <h3 className="text-sm font-bold text-slate-100">Curated 12-Week Study Sprint</h3>
            <div className="bg-slate-900 border border-slate-800 p-3 rounded-lg text-sm text-slate-300 relative before:content-[&quot;&quot;] before:absolute before:left-[-6px] before:top-4 before:w-3 before:h-3 before:bg-slate-900 before:border-l before:border-b before:border-slate-800 before:rotate-45">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="https://i.pravatar.cc/150?u=a042581f4e29026704d" alt="Mentor" className="w-12 h-12 rounded-full ring-2 ring-blue-500/30 object-cover" />
            </div>
            
            <div className="space-y-4 relative before:absolute before:top-2 before:bottom-2 before:left-3 before:w-0.5 before:bg-slate-800 pr-1">
              
              <div className="flex gap-4 relative">
                <div className="w-6 h-6 rounded-full bg-blue-950/50 border border-blue-500 text-blue-400 flex items-center justify-center font-mono text-[10px] font-bold shrink-0 z-10">
                  1
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-200">Weeks 1-4: Foundation</div>
                  <p className="text-[10px] text-slate-400 leading-relaxed mt-0.5">
                    Complete basic modules and theoretical architecture targeting {gaps[0]?.skill || "core requirements"}.
                  </p>
                </div>
              </div>

              <div className="flex gap-4 relative">
                <div className="w-6 h-6 rounded-full bg-indigo-950/50 border border-indigo-400 text-indigo-400 flex items-center justify-center font-mono text-[10px] font-bold shrink-0 z-10">
                  2
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-200">Weeks 5-8: Advanced Application</div>
                  <p className="text-[10px] text-slate-400 leading-relaxed mt-0.5">
                    Implement advanced paradigms and practical projects based on the theoretical foundation.
                  </p>
                </div>
              </div>

              <div className="flex gap-4 relative">
                <div className="w-6 h-6 rounded-full bg-cyan-950/50 border border-cyan-400 text-cyan-400 flex items-center justify-center font-mono text-[10px] font-bold shrink-0 z-10">
                  3
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-200">Weeks 9-12: Leadership Sandbox</div>
                  <p className="text-[10px] text-slate-400 leading-relaxed mt-0.5">
                    Lead peer reviews inside simulated Agile team networks, validated by mentors.
                  </p>
                </div>
              </div>

            </div>
          </div>

          {/* Connect with Sarah Chen Mentorship */}
          <div className="p-5 bg-slate-900/30 border border-slate-800/80 rounded-2xl space-y-4">
            <h3 className="text-sm font-bold text-slate-100">Recommended Expert Mentor</h3>

            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-4">
              <div className="flex items-center gap-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img 
                  alt="Sarah Chen" 
                  className="w-12 h-12 rounded-full object-cover border-2 border-blue-500/50" 
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuCi_TLzvhCclTCseu8VnpVL8noTcKaYLozp7SfJTKZzJ7Vb4i25VWG2VhNpBGSyCy39Y013zyWUrm2wcgLeLdv7txZNxwxnwFkWrYsBtTT-VgAVJPl5J3KAAplFelX-5RHRJcd2xLVw6wV9DJ-N14XbLXQ3svS-M_HjDE4GKsO-aPXtvOoMray_msllYwFNV5B4rMttJt_mXpQ_eClmMJr-oeipJAL67jcupJZzZKd95HGb7vIxvS7njQ" 
                />
                <div>
                  <h4 className="text-sm font-bold text-slate-200">Sarah Chen</h4>
                  <p className="text-[10px] text-slate-400">Director of UX Operations, Nexus Systems</p>
                  <p className="text-[9px] font-mono text-indigo-400 font-bold mt-0.5">Specialty: Scale & Architecture</p>
                </div>
              </div>

              <p className="text-[10px] text-slate-400 leading-relaxed">
                &quot;I specialize in bridging advanced concepts with corporate metrics. I have 2 slots available for mentorship sprints this quarter.&quot;
              </p>

              <button 
                onClick={() => setMentorModalOpen(true)}
                className="w-full py-2 bg-blue-600/20 text-blue-400 border border-blue-500/30 font-bold text-xs rounded-lg hover:bg-blue-600/30 transition-colors flex items-center justify-center gap-1.5"
              >
                <Users className="w-3.5 h-3.5" />
                Connect with Sarah
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* Mentor Connection Modal */}
      {mentorModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 relative animate-in zoom-in-95 duration-200">
            
            <button 
              onClick={() => setMentorModalOpen(false)}
              className="absolute top-4 right-4 text-slate-500 hover:text-slate-300 p-1"
              aria-label="Close mentor modal"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img 
                alt="Sarah Chen" 
                className="w-10 h-10 rounded-full object-cover" 
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuCi_TLzvhCclTCseu8VnpVL8noTcKaYLozp7SfJTKZzJ7Vb4i25VWG2VhNpBGSyCy39Y013zyWUrm2wcgLeLdv7txZNxwxnwFkWrYsBtTT-VgAVJPl5J3KAAplFelX-5RHRJcd2xLVw6wV9DJ-N14XbLXQ3svS-M_HjDE4GKsO-aPXtvOoMray_msllYwFNV5B4rMttJt_mXpQ_eClmMJr-oeipJAL67jcupJZzZKd95HGb7vIxvS7njQ" 
              />
              <div>
                <h3 className="font-extrabold text-slate-100 text-sm">Send Connection Request</h3>
                <p className="text-[10px] text-slate-400">To: Sarah Chen • Director of UX Operations</p>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Introductory Message</label>
              <textarea 
                value={mentorMessage}
                onChange={(e) => setMentorMessage(e.target.value)}
                rows={4}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-300 focus:outline-none focus:border-blue-500/50"
              />
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <button 
                onClick={() => setMentorModalOpen(false)}
                className="px-4 py-2 border border-slate-700 rounded-xl text-xs font-bold text-slate-300 hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              
              <button 
                onClick={handleSendRequest}
                disabled={mentorSent}
                className="px-5 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {mentorSent ? (
                  <><CheckCircle2 className="w-4 h-4 text-white" /> Request Dispatched</>
                ) : (
                  <><Send className="w-3.5 h-3.5" /> Send Request</>
                )}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
