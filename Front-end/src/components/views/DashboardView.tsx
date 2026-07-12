"use client";

import React, { useState, useEffect } from "react";

import { useRouter } from "next/navigation";
import { useSupabaseAuth } from "@/providers/supabase-auth-provider";
import { supabase } from "@/lib/supabase-browser";
import { matchJobs, getSavedJobs, type MatchedJob } from "@/lib/api";
import {
  Sparkles,
  Target,
  FileText,
  TrendingUp,
  Briefcase,
  ChevronRight,
  Activity,
  Loader2,
  MapPin,
  GraduationCap,
} from "lucide-react";

export default function DashboardPage() {
  const { user } = useSupabaseAuth();
  const router = useRouter();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [profile, setProfile] = useState<any>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [matches, setMatches] = useState<MatchedJob[]>([]);
  const [statsLoading, setStatsLoading] = useState(true);

  const [goals, setGoals] = useState([
    { id: 1, text: "Upload your CV PDF", done: false },
    { id: 2, text: "Browse & match jobs to your profile", done: false },
    { id: 3, text: "Run skill gap analysis on your target role", done: false },
    { id: 4, text: "Save interesting positions", done: false },
  ]);

  const name =
    user?.user_metadata?.name ||
    user?.user_metadata?.full_name ||
    user?.email?.split("@")[0] ||
    "there";

  const toggleGoal = (id: number) => {
    setGoals(goals.map((g) => (g.id === id ? { ...g, done: !g.done } : g)));
  };

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;
      setProfileLoading(true);
      try {
        const { data } = await supabase
          .from("profiles")
          .select("name, target_role, location, skills, education, cv_id")
          .eq("id", user.id)
          .maybeSingle();

        if (data?.cv_id) {
          setProfile(data);
          setGoals((g) => g.map(goal => goal.id === 1 ? { ...goal, done: true } : goal));
        } else {
          setProfile(null);
        }
      } catch {
        setProfile(null);
      } finally {
        setProfileLoading(false);
      }
    };
    fetchProfile();
  }, [user]);

  useEffect(() => {
    const fetchStats = async () => {
      if (!profile?.cv_id || !user) {
        setStatsLoading(false);
        return;
      }
      setStatsLoading(true);

      try {
        const [matchRes, savedRes] = await Promise.allSettled([
          matchJobs(profile.cv_id as string, 10),
          getSavedJobs(),
        ]);
        if (matchRes.status === "fulfilled") {
          setMatches(matchRes.value.matches);
        }
        if (savedRes.status === "fulfilled") {
          if (savedRes.value.data.length > 0) {
            setGoals((g) => g.map(goal => goal.id === 4 ? { ...goal, done: true } : goal));
          }
        }
      } catch {
        // Best effort
      }

      setStatsLoading(false);
    };
    fetchStats();
  }, [profile, user]);

  const hasCv = !!profile?.cv_id;
  const topMatches = matches.slice(0, 3);
  const recentFeed = matches.slice(0, 5); // Use first 5 as "live feed"

  const skillsCount = profile?.skills
    ? profile.skills.split(",").map((s: string) => s.trim()).filter(Boolean).length
    : 0;

  if (profileLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  // ── 1. If NO CV is uploaded, show a simplified onboarding view ──
  if (!hasCv) {
    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        <div className="relative overflow-hidden rounded-2xl border border-slate-800/80 bg-[#070b14] p-6 md:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.1),transparent_50%)]" />
          <div className="relative z-10 space-y-2">
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-100">
              Welcome, <span className="bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">{name}</span> 👋
            </h1>
            <p className="text-sm text-slate-400 max-w-xl">
              Your AI career partner is ready. Upload your CV to generate a semantic profile and unlock personalized job matching, skill gap analysis, and more.
            </p>
          </div>
          <div className="relative z-10 shrink-0">
            <button
              onClick={() => router.push("/dashboard/cv")}
              className="px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white transition-all font-bold text-sm flex items-center gap-2 shadow-lg shadow-blue-500/25"
            >
              <FileText className="w-4 h-4" />
              Upload CV to Start
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-6 bg-slate-900/30 border border-slate-800/80 rounded-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-100">Getting Started Checklist</h3>
            <div className="space-y-3">
              {goals.map((g) => (
                <div
                  key={g.id}
                  className="flex items-start gap-3 p-3 rounded-xl bg-slate-900/40 border border-slate-800/50"
                >
                  <div className="h-5 w-5 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 text-xs shrink-0 mt-0.5">
                    {g.id}
                  </div>
                  <span className="text-sm text-slate-300 font-medium">{g.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── 2. If CV IS uploaded, show the Advanced Dashboard ──
  return (
    <div className="space-y-6 select-none animate-in fade-in duration-500">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-800/80 bg-[#070b14] p-6 md:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.1),transparent_50%)]" />
        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-950/30 border border-blue-500/20 text-blue-400">
            <Sparkles className="w-3.5 h-3.5" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Semantic Profile Active</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-100">
            Welcome back, <span className="bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">{profile.name || name}</span>
          </h1>
          <p className="text-sm text-slate-400 max-w-xl">
            {profile.target_role ? (
              <>Targeting <strong className="text-blue-400 font-bold">{profile.target_role}</strong>. </>
            ) : null}
            Your semantic profile is synchronized. We have found <strong className="text-blue-400 font-bold">{matches.length} high-match positions</strong> for you.
          </p>
        </div>

        <div className="relative z-10 flex gap-3 shrink-0">
          <button
            onClick={() => router.push("/dashboard/jobs")}
            className="px-4 py-2.5 rounded-xl border border-slate-700 bg-slate-800/50 hover:bg-slate-800 transition-all font-bold text-xs flex items-center gap-2 text-slate-200"
          >
            <Briefcase className="w-3.5 h-3.5" />
            View Job Matches
          </button>
          
          <button
            onClick={() => router.push("/dashboard/skills")}
            className="px-4 py-2.5 rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-all font-bold text-xs flex items-center gap-2 shadow-lg shadow-blue-500/20"
          >
            <TrendingUp className="w-3.5 h-3.5" />
            Analyze Skill Gaps
          </button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Trajectory and Stats Panel */}
        <div className="col-span-1 lg:col-span-8 space-y-6">
          
          {/* Trajectory */}
          <div className="p-6 bg-slate-900/30 border border-slate-800/80 rounded-2xl space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold text-slate-100">Career Trajectory Analysis</h3>
                <p className="text-xs text-slate-400">Continuous semantic affinity tracking vs. key tech sectors</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1.5 text-xs text-cyan-400 font-bold">
                  <TrendingUp className="w-3.5 h-3.5" /> Profile Indexed
                </span>
              </div>
            </div>

            {/* Custom Interactive Trajectory SVG Chart */}
            <div className="relative h-48 w-full border-b border-l border-slate-800 pt-4 flex items-end">
              <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="chart-glow" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.2" />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0" />
                  </linearGradient>
                </defs>
                {/* Grid Lines */}
                <line x1="0" y1="20%" x2="100%" y2="20%" stroke="#1e293b" strokeWidth="1" strokeDasharray="4" />
                <line x1="0" y1="50%" x2="100%" y2="50%" stroke="#1e293b" strokeWidth="1" strokeDasharray="4" />
                <line x1="0" y1="80%" x2="100%" y2="80%" stroke="#1e293b" strokeWidth="1" strokeDasharray="4" />
                
                {/* Area under curve */}
                <path 
                  d="M 0 160 Q 150 140 300 110 T 600 50 T 900 30 L 900 180 L 0 180 Z" 
                  fill="url(#chart-glow)" 
                />
                
                {/* Line Path */}
                <path 
                  d="M 0 160 Q 150 140 300 110 T 600 50 T 900 30" 
                  fill="none" 
                  stroke="#3b82f6" 
                  strokeWidth="3.5" 
                  strokeLinecap="round"
                />

                {/* Hotspots */}
                <circle cx="300" cy="110" r="5" fill="#3b82f6" />
                <circle cx="600" cy="50" r="5" fill="#6366f1" />
                <circle cx="900" cy="30" r="6" fill="#22d3ee" />
              </svg>

              {/* Trajectory Legends */}
              <div className="absolute top-2 left-4 px-2 py-1 rounded bg-slate-900/80 border border-slate-700/50 text-[10px] font-mono text-slate-300 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500" /> Uploaded CV
              </div>
              <div className="absolute top-2 left-[40%] px-2 py-1 rounded bg-slate-900/80 border border-slate-700/50 text-[10px] font-mono text-slate-300 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" /> Embedded Profile
              </div>
              <div className="absolute top-2 right-4 px-2 py-1 rounded bg-slate-900/80 border border-slate-700/50 text-[10px] font-mono text-slate-300 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" /> Semantic DB Match
              </div>

              {/* X Axis Labels */}
              <div className="absolute bottom-[-22px] left-0 right-0 flex justify-between px-2 font-mono text-[9px] text-slate-500">
                <span>Phase 1</span>
                <span>Phase 2</span>
                <span>Phase 3</span>
                <span>Current Matches</span>
              </div>
            </div>

            <div className="pt-2 flex justify-between items-center text-xs text-slate-500">
              <span>Vector Score Range: 0.00 - 1.00</span>
              <span className="font-mono text-[10px]">Model: Supabase bg-small-en-v1.5</span>
            </div>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            
            <div className="p-5 bg-slate-900/30 border border-slate-800/80 rounded-2xl flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Top Match</span>
                <span className="text-3xl font-black text-blue-400 block">
                  {statsLoading ? "..." : (topMatches[0]?.match_percentage || "0")}%
                </span>
                <span className="text-[10px] text-cyan-400 flex items-center gap-1 font-bold mt-1">
                  <Activity className="w-3 h-3" /> Optimum
                </span>
              </div>
              <div className="w-14 h-14 relative shrink-0">
                <svg className="w-full h-full transform -rotate-90">
                  <circle cx="28" cy="28" r="22" stroke="#1e293b" strokeWidth="4" fill="none" />
                  <circle cx="28" cy="28" r="22" stroke="#3b82f6" strokeWidth="4" fill="none" strokeDasharray="138" strokeDashoffset={statsLoading ? 138 : 138 - (138 * (topMatches[0]?.match_percentage || 0)) / 100} className="transition-all duration-1000" />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center font-mono text-[10px] font-bold text-slate-200">
                  {statsLoading ? "..." : `${topMatches[0]?.match_percentage || 0}%`}
                </div>
              </div>
            </div>

            <div 
              onClick={() => router.push("/dashboard/jobs")}
              className="p-5 bg-slate-900/30 border border-slate-800/80 rounded-2xl flex items-center justify-between cursor-pointer hover:border-blue-500/40 transition-colors"
            >
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Matched Roles</span>
                <span className="text-3xl font-black text-indigo-400 block">{statsLoading ? "..." : matches.length}</span>
                <span className="text-[10px] text-slate-400 mt-1 block">In database</span>
              </div>
              <div className="h-10 w-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 border border-indigo-500/20 shrink-0">
                <Briefcase className="w-5 h-5" />
              </div>
            </div>

            <div 
              onClick={() => router.push("/dashboard/skills")}
              className="p-5 bg-slate-900/30 border border-slate-800/80 rounded-2xl flex items-center justify-between cursor-pointer hover:border-blue-500/40 transition-colors"
            >
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Skills Found</span>
                <span className="text-3xl font-black text-cyan-400 block">{skillsCount}</span>
                <span className="text-[10px] text-slate-400 mt-1 block">Extracted from CV</span>
              </div>
              <div className="h-10 w-10 rounded-xl bg-cyan-500/10 flex items-center justify-center text-cyan-400 border border-cyan-500/20 shrink-0">
                <FileText className="w-5 h-5" />
              </div>
            </div>

          </div>

          {/* User Info Bento */}
          <div className="p-6 bg-slate-900/30 border border-slate-800/80 rounded-2xl space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-base font-bold text-slate-100">Profile Overview</h3>
                <p className="text-xs text-slate-400 font-medium">Your parsed CV details used for semantic matching</p>
              </div>
              <button onClick={() => router.push("/dashboard/profile")} className="text-xs font-bold text-blue-400 flex items-center gap-1 hover:text-blue-300">
                Edit Profile <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="p-4 rounded-xl bg-slate-800/30 border border-slate-700/50 space-y-2">
                <div className="flex items-center gap-2 text-slate-300 mb-1">
                  <Target className="w-4 h-4 text-blue-400" />
                  <span className="font-bold text-sm">Target Role</span>
                </div>
                <p className="text-sm text-slate-400">{profile.target_role || "Not set"}</p>
              </div>
              
              <div className="p-4 rounded-xl bg-slate-800/30 border border-slate-700/50 space-y-2">
                <div className="flex items-center gap-2 text-slate-300 mb-1">
                  <MapPin className="w-4 h-4 text-indigo-400" />
                  <span className="font-bold text-sm">Location</span>
                </div>
                <p className="text-sm text-slate-400">{profile.location || "Not set"}</p>
              </div>

              <div className="p-4 rounded-xl bg-slate-800/30 border border-slate-700/50 space-y-2 sm:col-span-2">
                <div className="flex items-center gap-2 text-slate-300 mb-2">
                  <GraduationCap className="w-4 h-4 text-cyan-400" />
                  <span className="font-bold text-sm">Education History</span>
                </div>
                <p className="text-sm text-slate-400">{profile.education || "No education extracted"}</p>
              </div>
            </div>
          </div>

        </div>

        {/* Right Matches and Checklist Panel */}
        <div className="col-span-1 lg:col-span-4 space-y-6">
          
          {/* Top Matches */}
          <div className="p-5 bg-slate-900/30 border border-slate-800/80 rounded-2xl space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-bold text-slate-100">Top Semantic Matches</h3>
              <button onClick={() => router.push("/dashboard/jobs")} className="text-xs text-blue-400 font-bold hover:text-blue-300">
                See All
              </button>
            </div>

            <div className="space-y-3">
              {statsLoading ? (
                <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-slate-500" /></div>
              ) : topMatches.length === 0 ? (
                <p className="text-xs text-slate-500 py-2">No matches found yet.</p>
              ) : (
                topMatches.map(job => (
                  <div 
                    key={job.id} 
                    onClick={() => router.push("/dashboard/jobs")}
                    className="p-3.5 rounded-xl bg-slate-800/30 hover:bg-slate-800/60 border border-slate-700/40 flex items-center justify-between cursor-pointer transition-all hover:border-blue-500/30"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-blue-950/30 border border-blue-500/20 flex items-center justify-center shrink-0 text-blue-400">
                        <Briefcase className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 pr-2">
                        <div className="text-xs font-bold text-slate-200 truncate">{job.job_title}</div>
                        <div className="text-[10px] text-slate-400 truncate">{job.company} • {job.location}</div>
                      </div>
                    </div>
                    
                    <div className="text-right shrink-0">
                      <span className="px-2 py-0.5 rounded-md bg-green-500/10 border border-green-500/20 text-green-400 text-[10px] font-mono font-bold block">
                        {job.match_percentage}%
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Active Career Goals */}
          <div className="p-5 bg-slate-900/30 border border-slate-800/80 rounded-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-100">Career Goal Tracker</h3>
            
            <div className="space-y-3">
              {goals.map(g => (
                <div 
                  key={g.id} 
                  onClick={() => toggleGoal(g.id)}
                  className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-slate-800/40 cursor-pointer transition-colors border border-transparent hover:border-slate-700/50"
                >
                  <input 
                    type="checkbox" 
                    checked={g.done}
                    onChange={() => {}} 
                    className="mt-0.5 accent-blue-500 shrink-0 cursor-pointer"
                  />
                  <span className={`text-xs leading-relaxed ${g.done ? 'text-slate-500 line-through' : 'text-slate-300 font-medium'}`}>
                    {g.text}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Live System Activity Feed */}
          <div className="p-5 bg-slate-900/30 border border-slate-800/80 rounded-2xl space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-bold text-slate-100">Live Match Feed</h3>
              <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
            </div>

            <div className="space-y-3 max-h-48 overflow-y-auto custom-scrollbar pr-1">
              {statsLoading ? (
                <div className="flex justify-center"><Loader2 className="h-4 w-4 animate-spin text-slate-500" /></div>
              ) : recentFeed.length === 0 ? (
                 <p className="text-xs text-slate-500">Waiting for matches...</p>
              ) : (
                recentFeed.map((feed, idx) => (
                  <div key={feed.id || idx} className="text-[10px] font-mono leading-relaxed text-slate-400 border-l border-blue-500/30 pl-3 py-1 space-y-1 relative">
                    <div className="absolute -left-[3px] top-2 w-1.5 h-1.5 rounded-full bg-blue-500" />
                    <div className="flex justify-between font-bold text-slate-200">
                      <span className="truncate pr-2">{feed.job_title}</span>
                      <span className="text-blue-400 shrink-0">{feed.match_percentage}% match</span>
                    </div>
                    <div className="truncate">Found at <strong className="text-slate-300">{feed.company}</strong></div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
