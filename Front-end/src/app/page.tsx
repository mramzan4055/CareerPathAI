import React from "react";
import dynamic from "next/dynamic";
import { HeroCTA, FinalCTA, FooterAuthLinks } from "@/components/auth-islands";
import {
  Briefcase, Search, FileText, CheckCircle, TrendingUp, Bot,
  Clock, XCircle, Compass, UploadCloud, Cpu, CheckCheck,
  Sparkles, Zap, Check
} from "lucide-react";

// Lazy-load the UserButton since it needs auth + dropdown (heavy Radix deps)
const UserButton = dynamic(() => import("@/components/user-button"), {
  ssr: false,
  loading: () => <div className="w-[120px] h-10" />,
});

export default function Home() {
  return (
    <div className="min-h-screen bg-[#030712] text-slate-100 font-sans selection:bg-blue-500/30 selection:text-blue-200 overflow-x-hidden relative">
      {/* Background glow effects — reduced blur radius for GPU perf */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-blue-900/15 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="absolute top-[20%] right-1/4 w-[600px] h-[600px] bg-indigo-900/15 rounded-full blur-3xl pointer-events-none -z-10" />

      {/* HEADER / NAVBAR */}
      <header className="sticky top-0 z-50 w-full border-b border-blue-500/10 bg-[#030712]/85 backdrop-blur-md transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/25">
              <Bot className="h-6 w-6 text-white" />
            </div>
            <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 tracking-tight">
              CareerPath AI
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-300">
            <a href="#problem" className="hover:text-blue-400 transition-colors duration-200">Problem</a>
            <a href="#features" className="hover:text-blue-400 transition-colors duration-200">Features</a>
            <a href="#how-it-works" className="hover:text-blue-400 transition-colors duration-200">How It Works</a>
            <a href="#stats" className="hover:text-blue-400 transition-colors duration-200">Stats</a>
          </nav>

          <div className="flex items-center gap-4">
            <UserButton />
          </div>
        </div>
      </header>

      {/* HERO SECTION */}
      <section className="relative pt-12 pb-24 md:pt-20 md:pb-32 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">

          {/* Left Column Text */}
          <div className="lg:col-span-7 flex flex-col space-y-6 text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-blue-500/20 bg-blue-950/20 text-blue-400 text-xs font-semibold w-fit">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Next-Gen AI Recruiting Ecosystem</span>
            </div>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight leading-none text-slate-100">
              Your AI Career Partner — <br className="hidden sm:inline" />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-indigo-500 to-purple-500">
                From Student to Professional
              </span>
            </h1>
            <p className="text-lg text-slate-400 max-w-2xl leading-relaxed">
              Upload your resume and let CareerPath AI instantly match you with jobs, identify skill gaps, personalize your study roadmaps, and auto-apply 24/7.
            </p>

            {/* Client island: auth-aware CTA buttons */}
            <HeroCTA />
          </div>

          {/* Right Column Mockup Dashboard */}
          <div className="lg:col-span-5 relative mt-6 lg:mt-0">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl blur-lg opacity-30" />
            <div className="relative border border-blue-500/20 rounded-2xl bg-[#090d16]/90 backdrop-blur-sm p-6 shadow-2xl shadow-blue-950/50">

              {/* Mock Dashboard Top Panel */}
              <div className="flex items-center justify-between border-b border-blue-500/10 pb-4 mb-4">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-red-500" />
                  <div className="h-3 w-3 rounded-full bg-yellow-500" />
                  <div className="h-3 w-3 rounded-full bg-green-500" />
                </div>
                <div className="text-xs text-slate-400 font-mono bg-blue-950/20 px-2 py-0.5 rounded border border-blue-500/15">
                  dashboard_mock.dev
                </div>
              </div>

              {/* Mock Profile Stats */}
              <div className="flex gap-4 items-center bg-blue-950/10 border border-blue-500/10 p-3.5 rounded-xl mb-4">
                <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center font-bold text-white shadow">
                  A
                </div>
                <div className="flex-1 text-left">
                  <div className="text-sm font-semibold text-slate-200">Alex Mercer</div>
                  <div className="text-xs text-slate-400">Target: Software Engineer</div>
                </div>
                <div className="bg-green-500/15 text-green-400 text-xs px-2.5 py-1 rounded-full font-bold border border-green-500/20">
                  94% Match Score
                </div>
              </div>

              {/* Match Items */}
              <div className="space-y-3">
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider text-left">Matches &amp; Applications</div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-slate-900/50 border border-slate-800 hover:border-blue-500/30 transition-colors">
                  <div className="flex items-center gap-3 text-left">
                    <div className="p-2 rounded bg-blue-950/20 border border-blue-500/20 text-blue-400">
                      <Briefcase className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-slate-200">Junior Fullstack Developer</div>
                      <div className="text-[10px] text-slate-400">Vercel Inc. • Remote</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-blue-400">98% Match</span>
                    <div className="text-[9px] text-green-400 font-medium">Applied ✓</div>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-slate-900/50 border border-slate-800">
                  <div className="flex items-center gap-3 text-left">
                    <div className="p-2 rounded bg-indigo-950/20 border border-indigo-500/20 text-indigo-400">
                      <Briefcase className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-slate-200">Software Engineer I</div>
                      <div className="text-[10px] text-slate-400">Google • Sunnyvale, CA</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-indigo-400">92% Match</span>
                    <div className="text-[9px] text-blue-400 font-medium">Auto-applying...</div>
                  </div>
                </div>
              </div>

              {/* Skill Gap Check */}
              <div className="mt-4 pt-4 border-t border-blue-500/10">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider text-left">Skill Gap Analysis</span>
                  <span className="text-[10px] text-blue-400 font-semibold bg-blue-950/30 px-2 py-0.5 rounded border border-blue-500/15">3 Gaps Identified</span>
                </div>
                <div className="flex flex-wrap gap-1.5 justify-start">
                  <span className="text-[10px] bg-green-500/10 text-green-400 border border-green-500/20 px-2 py-0.5 rounded-full flex items-center gap-1 font-medium">
                    <Check className="h-3 w-3" /> React
                  </span>
                  <span className="text-[10px] bg-green-500/10 text-green-400 border border-green-500/20 px-2 py-0.5 rounded-full flex items-center gap-1 font-medium">
                    <Check className="h-3 w-3" /> TypeScript
                  </span>
                  <span className="text-[10px] bg-orange-500/10 text-orange-400 border border-orange-500/20 px-2 py-0.5 rounded-full flex items-center gap-1 font-medium">
                    Missing: Docker
                  </span>
                  <span className="text-[10px] bg-orange-500/10 text-orange-400 border border-orange-500/20 px-2 py-0.5 rounded-full flex items-center gap-1 font-medium">
                    Missing: Postgres
                  </span>
                </div>
              </div>

            </div>
          </div>

        </div>
      </section>

      {/* PROBLEM SECTION */}
      <section id="problem" className="py-20 md:py-28 border-t border-blue-500/10 bg-[#010409] relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-xs font-bold text-blue-500 uppercase tracking-wider">The Problem</h2>
            <p className="mt-2 text-3xl sm:text-4xl font-extrabold text-slate-100">
              The Problem Fresh Graduates Face
            </p>
            <p className="mt-4 text-slate-400 text-lg">
              Transitioning from classroom to production environments is harder than ever.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-8 rounded-2xl bg-slate-900/30 border border-slate-800/80 hover:border-blue-500/20 transition-colors group hover:-translate-y-1 duration-300">
              <div className="p-3.5 rounded-xl bg-blue-950/20 border border-blue-500/20 text-blue-400 w-fit mb-6 group-hover:scale-110 transition-transform duration-300">
                <Clock className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-100 mb-3 text-left">Manual job hunting wastes hours daily</h3>
              <p className="text-slate-400 text-sm leading-relaxed text-left">
                Browsing dozens of boards, reading endless job specifications, and manually filling forms drains your energy and wastes hours every single day.
              </p>
            </div>

            <div className="p-8 rounded-2xl bg-slate-900/30 border border-slate-800/80 hover:border-blue-500/20 transition-colors group hover:-translate-y-1 duration-300">
              <div className="p-3.5 rounded-xl bg-indigo-950/20 border border-indigo-500/20 text-indigo-400 w-fit mb-6 group-hover:scale-110 transition-transform duration-300">
                <XCircle className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-100 mb-3 text-left">CVs rejected because they don&apos;t match keywords</h3>
              <p className="text-slate-400 text-sm leading-relaxed text-left">
                Applicant Tracking Systems (ATS) automatically filter out standard resumes because they lack the specific semantic keywords matching the job description.
              </p>
            </div>

            <div className="p-8 rounded-2xl bg-slate-900/30 border border-slate-800/80 hover:border-blue-500/20 transition-colors group hover:-translate-y-1 duration-300">
              <div className="p-3.5 rounded-xl bg-purple-950/20 border border-purple-500/20 text-purple-400 w-fit mb-6 group-hover:scale-110 transition-transform duration-300">
                <Compass className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-100 mb-3 text-left">No clear direction on what skills to learn next</h3>
              <p className="text-slate-400 text-sm leading-relaxed text-left">
                Without a feedback loop, you are left in the dark about what programming languages, packages, or systems you need to study to land your first role.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES SECTION */}
      <section id="features" className="py-20 md:py-28 border-t border-blue-500/10 bg-[#030712] relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-xs font-bold text-blue-500 uppercase tracking-wider">Features</h2>
            <p className="mt-2 text-3xl sm:text-4xl font-extrabold text-slate-100">
              Everything You Need in One Place
            </p>
            <p className="mt-4 text-slate-400 text-lg">
              Powerful tools designed to guide you step-by-step from registration to your first interview.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="p-6 rounded-2xl bg-slate-900/25 border border-slate-800/80 hover:border-blue-500/20 transition-colors hover:bg-slate-900/40">
              <div className="p-3 rounded-lg bg-blue-950/20 border border-blue-500/20 text-blue-400 w-fit mb-4">
                <Search className="h-5 w-5" />
              </div>
              <h4 className="text-lg font-bold text-slate-200 mb-2 text-left">Semantic AI Job Matching</h4>
              <p className="text-slate-400 text-sm text-left">
                Goes beyond basic text searches to analyze the actual semantics of your resume and find matching jobs.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900/25 border border-slate-800/80 hover:border-blue-500/20 transition-colors hover:bg-slate-900/40">
              <div className="p-3 rounded-lg bg-indigo-950/20 border border-indigo-500/20 text-indigo-400 w-fit mb-4">
                <FileText className="h-5 w-5" />
              </div>
              <h4 className="text-lg font-bold text-slate-200 mb-2 text-left">AI Resume Builder</h4>
              <p className="text-slate-400 text-sm text-left">
                Generates resume descriptions and targets descriptions automatically to align with job descriptions.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900/25 border border-slate-800/80 hover:border-blue-500/20 transition-colors hover:bg-slate-900/40">
              <div className="p-3 rounded-lg bg-purple-950/20 border border-purple-500/20 text-purple-400 w-fit mb-4">
                <Bot className="h-5 w-5" />
              </div>
              <h4 className="text-lg font-bold text-slate-200 mb-2 text-left">Skill Gap Analysis</h4>
              <p className="text-slate-400 text-sm text-left">
                Finds missing libraries, frameworks, or databases requested in target postings compared to your profile.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900/25 border border-slate-800/80 hover:border-blue-500/20 transition-colors hover:bg-slate-900/40">
              <div className="p-3 rounded-lg bg-blue-950/20 border border-blue-500/20 text-blue-400 w-fit mb-4">
                <CheckCircle className="h-5 w-5" />
              </div>
              <h4 className="text-lg font-bold text-slate-200 mb-2 text-left">Personalized Learning Plans</h4>
              <p className="text-slate-400 text-sm text-left">
                Recommends customized courses, repos, and documentations to bridge your individual technical gaps.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900/25 border border-slate-800/80 hover:border-blue-500/20 transition-colors hover:bg-slate-950/25">
              <div className="p-3 rounded-lg bg-slate-800/20 border border-slate-500/20 text-slate-300 w-fit mb-4">
                <TrendingUp className="h-5 w-5" />
              </div>
              <h4 className="text-lg font-bold text-slate-200 mb-2 text-left">Career Progression Roadmap</h4>
              <p className="text-slate-400 text-sm text-left">
                Visually diagrams the progression of mid-level, senior, and architect paths matching your skills.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900/25 border border-slate-800/80 hover:border-blue-500/20 transition-colors hover:bg-slate-900/40">
              <div className="p-3 rounded-lg bg-cyan-950/20 border border-cyan-500/20 text-cyan-400 w-fit mb-4">
                <Zap className="h-5 w-5" />
              </div>
              <h4 className="text-lg font-bold text-slate-200 mb-2 text-left">24/7 Auto Apply System</h4>
              <p className="text-slate-400 text-sm text-left">
                Keeps scanning jobs and applying to matched ones in the background even while your computer is off.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS SECTION */}
      <section id="how-it-works" className="py-20 md:py-28 border-t border-blue-500/10 bg-[#010409] relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-xs font-bold text-blue-500 uppercase tracking-wider">How It Works</h2>
            <p className="mt-2 text-3xl sm:text-4xl font-extrabold text-slate-100">
              Three Simple Steps to Success
            </p>
            <p className="mt-4 text-slate-400 text-lg">
              Getting started is easy and completely automated.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            <div className="flex flex-col items-center text-center">
              <div className="h-16 w-16 rounded-2xl bg-blue-950/30 border border-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-xl mb-6 shadow-lg shadow-blue-500/5">
                <UploadCloud className="h-8 w-8" />
              </div>
              <h5 className="text-xl font-bold text-slate-200 mb-2">Step 1: Upload CV &amp; Set Goal</h5>
              <p className="text-slate-400 text-sm max-w-xs leading-relaxed">
                Upload your resume and specify your career goals or role preferences.
              </p>
            </div>

            <div className="flex flex-col items-center text-center">
              <div className="h-16 w-16 rounded-2xl bg-indigo-950/30 border border-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-xl mb-6 shadow-lg shadow-indigo-500/5">
                <Cpu className="h-8 w-8" />
              </div>
              <h5 className="text-xl font-bold text-slate-200 mb-2">Step 2: AI Profile Analysis</h5>
              <p className="text-slate-400 text-sm max-w-xs leading-relaxed">
                Our model scans public directories and profiles to find matching jobs.
              </p>
            </div>

            <div className="flex flex-col items-center text-center">
              <div className="h-16 w-16 rounded-2xl bg-purple-950/30 border border-purple-500/20 text-purple-400 flex items-center justify-center font-bold text-xl mb-6 shadow-lg shadow-purple-500/5">
                <CheckCheck className="h-8 w-8" />
              </div>
              <h5 className="text-xl font-bold text-slate-200 mb-2">Step 3: Auto-Apply &amp; Track</h5>
              <p className="text-slate-400 text-sm max-w-xs leading-relaxed">
                Auto-apply to matches, learn missing skills, and monitor application stages in real-time.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* STATS SECTION */}
      <section id="stats" className="py-16 md:py-24 border-t border-blue-500/10 bg-[#030712] relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div className="p-8 rounded-2xl bg-blue-950/5 border border-blue-500/5 shadow-inner">
              <div className="text-4xl sm:text-5xl font-black text-blue-500 mb-2 flex items-center justify-center gap-1">
                <Briefcase className="h-8 w-8 text-blue-500 inline" /> 500+
              </div>
              <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Jobs Matched Daily</div>
            </div>

            <div className="p-8 rounded-2xl bg-indigo-950/5 border border-indigo-500/5 shadow-inner">
              <div className="text-4xl sm:text-5xl font-black text-indigo-500 mb-2 flex items-center justify-center gap-1">
                <Zap className="h-8 w-8 text-indigo-500 inline" /> 10x
              </div>
              <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Faster Applications</div>
            </div>

            <div className="p-8 rounded-2xl bg-purple-950/5 border border-purple-500/5 shadow-inner">
              <div className="text-4xl sm:text-5xl font-black text-purple-500 mb-2 flex items-center justify-center gap-1">
                <Cpu className="h-8 w-8 text-purple-500 inline" /> AI
              </div>
              <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Powered Matching</div>
            </div>
          </div>
        </div>
      </section>

      {/* FINAL CTA SECTION */}
      <section className="py-20 md:py-28 border-t border-blue-500/10 bg-gradient-to-b from-[#030712] to-[#0b1329] relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[300px] bg-blue-900/10 rounded-full blur-3xl pointer-events-none" />
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8 relative z-10 flex flex-col items-center space-y-6">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-100 tracking-tight">
            Start Your Career Journey Today
          </h2>
          <p className="text-slate-400 text-lg max-w-xl leading-relaxed">
            Create an account in less than a minute and let CareerPath AI accelerate your path from classroom to professional hire.
          </p>
          {/* Client island: auth-aware final CTA */}
          <FinalCTA />
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-blue-500/10 bg-[#010307] py-12 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow">
              <Bot className="h-5 w-5 text-white" />
            </div>
            <span className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 tracking-tight">
              CareerPath AI
            </span>
          </div>

          <p className="text-slate-500 text-xs md:order-last">
            &copy; 2026 CareerPath AI. All rights reserved.
          </p>

          <div className="flex gap-8 text-xs font-medium text-slate-400">
            <a href="#" className="hover:text-blue-400 transition-colors">Home</a>
            <a href="#features" className="hover:text-blue-400 transition-colors">Features</a>
            {/* Client island: auth-aware footer links */}
            <FooterAuthLinks />
          </div>
        </div>
      </footer>
    </div>
  );
}
