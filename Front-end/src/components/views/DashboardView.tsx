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
  Zap,
  Star,
  ArrowRight,
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
      <div className="space-y-6 animate-in fade-in duration-500 max-w-4xl">
        {/* Hero welcome */}
        <div className="relative overflow-hidden rounded-2xl border border-blue-500/20 bg-gradient-to-br from-blue-950/40 to-indigo-950/30 p-8">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.12),transparent_60%)]" />
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/15 border border-blue-500/25 text-blue-400 text-xs font-bold">
                <Sparkles className="w-3.5 h-3.5" />
                AI Career Partner Ready
              </div>
              <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-100">
                Welcome, <span className="bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">{name}</span> 👋
              </h1>
              <p className="text-sm text-slate-400 max-w-lg leading-relaxed">
                Upload your CV to generate a semantic profile and unlock AI job matching, skill gap analysis, cover letter generation, and more.
              </p>
            </div>
            <button
              onClick={() => router.push("/dashboard/cv")}
              className="group shrink-0 flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm transition-all shadow-lg shadow-blue-500/30 hover:-translate-y-0.5 duration-200"
            >
              <FileText className="w-4 h-4" />
              Upload CV to Start
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        </div>

        {/* What you unlock */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            { icon: Briefcase, color: "text-blue-400 bg-blue-500/10 border-blue-500/20", title: "Semantic Job Matching", desc: "pgvector cosine similarity against thousands of live postings." },
            { icon: TrendingUp, color: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20", title: "Skill Gap Analysis", desc: "Identify exactly what skills are blocking your target role." },
            { icon: Activity, color: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20", title: "Application Tracker", desc: "Kanban pipeline from saved → interview → offer." },
            { icon: Sparkles, color: "text-violet-400 bg-violet-500/10 border-violet-500/20", title: "AI Cover Letters", desc: "Personalized cover letters in seconds, any tone." },
          ].map(item => (
            <div key={item.title} className="p-5 bg-slate-900/30 border border-slate-800/80 rounded-2xl flex items-start gap-4">
              <div className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 ${item.color}`}>
                <item.icon className="w-4.5 h-4.5" />
              </div>
              <div>
                <div className="text-sm font-bold text-slate-200 mb-0.5">{item.title}</div>
                <p className="text-xs text-slate-500 leading-relaxed">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Checklist */}
        <div className="p-6 bg-slate-900/30 border border-slate-800/80 rounded-2xl space-y-4">
          <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
            <Target className="w-4 h-4 text-blue-400" /> Getting Started Checklist
          </h3>
          <div className="space-y-2">
            {goals.map((g) => (
              <div
                key={g.id}
                className="flex items-center gap-3 p-3 rounded-xl bg-slate-900/40 border border-slate-800/50 hover:border-slate-700 transition-colors"
              >
                <div className="h-5 w-5 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-500 text-[10px] font-black shrink-0">
                  {g.id}
                </div>
                <span className="text-sm text-slate-300 font-medium flex-1">{g.text}</span>
                <ChevronRight className="w-4 h-4 text-slate-600" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── 2. If CV IS uploaded, show the Advanced Dashboard ──
  return (
    <div className="space-y-6 select-none animate-in fade-in duration-500">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-blue-500/15 bg-gradient-to-br from-blue-950/30 to-[#070b14] p-6 md:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(59,130,246,0.12),transparent_60%)]" />
        <div className="absolute bottom-0 right-0 w-48 h-48 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/15 border border-blue-500/25 text-blue-400">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Semantic Profile Active</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-100">
            Welcome back, <span className="bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">{profile.name || name}</span>
          </h1>
          <p className="text-sm text-slate-400 max-w-xl">
            {profile.target_role ? (
              <>Targeting <strong className="text-blue-400 font-bold">{profile.target_role}</strong>. </>
            ) : null}
            Your semantic profile is live. Found <strong className="text-slate-200 font-bold">{matches.length}</strong> high-match positions for you.
          </p>
        </div>

        <div className="relative z-10 flex gap-3 shrink-0">
          <button
            onClick={() => router.push("/dashboard/jobs")}
            className="px-4 py-2.5 rounded-xl border border-slate-700 bg-slate-800/60 hover:bg-slate-800 transition-all font-bold text-xs flex items-center gap-2 text-slate-200 hover:border-slate-600"
          >
            <Briefcase className="w-3.5 h-3.5" />
            Job Matches
          </button>
          
          <button
            onClick={() => router.push("/dashboard/skills")}
            className="px-4 py-2.5 rounded-xl bg-blue-600 text-white hover:bg-blue-500 transition-all font-bold text-xs flex items-center gap-2 shadow-lg shadow-blue-500/25"
          >
            <TrendingUp className="w-3.5 h-3.5" />
            Skill Gaps
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
            
            <div className="p-5 bg-slate-900/30 border border-slate-800/80 rounded-2xl flex items-center justify-between hover:border-slate-700 transition-colors">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Top Match</span>
                <span className="text-3xl font-black text-blue-400 block">
                  {statsLoading ? "…" : (topMatches[0]?.match_percentage || "0")}%
                </span>
                <span className="text-[10px] text-emerald-400 flex items-center gap-1 font-bold mt-1">
                  <Zap className="w-3 h-3" /> Best fit found
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
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <Star className="w-4 h-4 text-amber-400" /> Top Semantic Matches
              </h3>
              <button
                onClick={() => router.push("/dashboard/jobs")}
                className="text-[11px] text-blue-400 font-bold hover:text-blue-300 flex items-center gap-1"
              >
                See All <ChevronRight className="w-3 h-3" />
              </button>
            </div>

            <div className="space-y-2">
              {statsLoading ? (
                <div className="flex justify-center py-6">
                  <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
                </div>
              ) : topMatches.length === 0 ? (
                <div className="py-6 text-center">
                  <Briefcase className="w-8 h-8 text-slate-700 mx-auto mb-2" />
                  <p className="text-xs text-slate-500">No matches yet. Head to Job Matches to fetch live jobs.</p>
                </div>
              ) : (
                topMatches.map((job, idx) => (
                  <div 
                    key={job.id} 
                    onClick={() => router.push("/dashboard/jobs")}
                    className="group p-3 rounded-xl bg-slate-800/30 hover:bg-blue-950/20 border border-slate-700/40 hover:border-blue-500/30 flex items-center justify-between cursor-pointer transition-all"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-xs font-black ${
                        idx === 0 ? "bg-amber-500/15 text-amber-400 border border-amber-500/20" :
                        idx === 1 ? "bg-blue-500/15 text-blue-400 border border-blue-500/20" :
                        "bg-slate-700/50 text-slate-400 border border-slate-600/50"
                      }`}>
                        #{idx + 1}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-200 truncate">{job.job_title}</div>
                        <div className="text-[10px] text-slate-500 truncate">{job.company}</div>
                      </div>
                    </div>
                    
                    <span className={`shrink-0 px-2 py-0.5 rounded-md text-[10px] font-mono font-black border ${
                      job.match_percentage >= 90
                        ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                        : "bg-indigo-500/10 border-indigo-500/20 text-indigo-400"
                    }`}>
                      {job.match_percentage}%
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Active Career Goals */}
          <div className="p-5 bg-slate-900/30 border border-slate-800/80 rounded-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <Target className="w-4 h-4 text-blue-400" /> Goal Tracker
              </h3>
              <span className="text-[10px] text-slate-500 font-mono">
                {goals.filter(g => g.done).length}/{goals.length} done
              </span>
            </div>

            {/* Progress bar */}
            <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-700"
                style={{ width: `${(goals.filter(g => g.done).length / goals.length) * 100}%` }}
              />
            </div>

            <div className="space-y-2">
              {goals.map(g => (
                <div 
                  key={g.id} 
                  onClick={() => toggleGoal(g.id)}
                  className={`flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-all border ${
                    g.done
                      ? "border-green-500/10 bg-green-500/5"
                      : "border-slate-800/60 hover:border-slate-700 hover:bg-slate-800/40"
                  }`}
                >
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                    g.done
                      ? "bg-blue-500 border-blue-500"
                      : "border-slate-600"
                  }`}>
                    {g.done && (
                      <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  <span className={`text-xs leading-relaxed flex-1 ${
                    g.done ? "text-slate-500 line-through" : "text-slate-300 font-medium"
                  }`}>
                    {g.text}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Live System Activity Feed */}
          <div className="p-5 bg-slate-900/30 border border-slate-800/80 rounded-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-400" /> Live Match Feed
              </h3>
              <div className="flex items-center gap-1.5 text-[10px] text-emerald-400 font-mono font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                LIVE
              </div>
            </div>

            <div className="space-y-2 max-h-52 overflow-y-auto custom-scrollbar pr-1">
              {statsLoading ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                </div>
              ) : recentFeed.length === 0 ? (
                <p className="text-[11px] text-slate-500 text-center py-4">Sync jobs to see your live feed.</p>
              ) : (
                recentFeed.map((feed, idx) => (
                  <div
                    key={feed.id || idx}
                    className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-800/30 border border-slate-700/30 hover:border-slate-600/50 transition-colors"
                  >
                    <div className="w-1.5 h-8 rounded-full bg-gradient-to-b from-blue-500 to-indigo-500 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold text-slate-200 truncate">{feed.job_title}</div>
                      <div className="text-[10px] text-slate-500 truncate">{feed.company}</div>
                    </div>
                    <span className="text-[10px] font-mono font-black text-indigo-400 shrink-0">
                      {feed.match_percentage}%
                    </span>
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
