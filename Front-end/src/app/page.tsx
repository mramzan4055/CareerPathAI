import Link from "next/link";
import {
  Sparkles,
  Briefcase,
  TrendingUp,
  Mail,
  Bot,
  ArrowRight,
  CheckCircle,
  Zap,
  Globe,
  Shield,
  BarChart3,
  Target,
  Users,
  Star,
  ChevronRight,
  Database,
  BrainCircuit,
  Layers,
} from "lucide-react";

// ── Feature data ──────────────────────────────────────────────────────────────

const FEATURES = [
  {
    icon: BrainCircuit,
    color: "from-blue-500 to-indigo-600",
    glow: "shadow-blue-500/20",
    badge: "Core",
    title: "AI Resume Parsing",
    desc: "Upload your PDF and our LLM extracts every detail — skills, roles, education, projects — into a structured profile ready for semantic matching.",
  },
  {
    icon: Target,
    color: "from-indigo-500 to-purple-600",
    glow: "shadow-indigo-500/20",
    badge: "Core",
    title: "Semantic Job Matching",
    desc: "pgvector cosine similarity compares your entire CV embedding against thousands of live job postings. No keyword stuffing — pure meaning.",
  },
  {
    icon: TrendingUp,
    color: "from-cyan-500 to-blue-600",
    glow: "shadow-cyan-500/20",
    badge: "Analysis",
    title: "Skill Gap Analysis",
    desc: "Pinpoint exactly which skills you need for your target role — ranked by impact — and get a personalised week-by-week learning roadmap.",
  },
  {
    icon: Mail,
    color: "from-violet-500 to-purple-600",
    glow: "shadow-violet-500/20",
    badge: "Automation",
    title: "AI Cover Letters",
    desc: "Generate job-specific cover letters in seconds. Choose your tone — Professional, Enthusiastic, Formal, or Conversational — and copy instantly.",
  },
  {
    icon: Globe,
    color: "from-emerald-500 to-teal-600",
    glow: "shadow-emerald-500/20",
    badge: "Live Data",
    title: "4-Source Job Feed",
    desc: "Aggregates Arbeitnow, Jobicy, Greenhouse (14 boards), and Lever (15 companies) — thousands of live listings, zero API key required.",
  },
  {
    icon: BarChart3,
    color: "from-amber-500 to-orange-600",
    glow: "shadow-amber-500/20",
    badge: "Tracker",
    title: "Application Kanban",
    desc: "Track every application from Saved → Applied → Interviewing → Offer with a full audit trail and daily apply-limit enforcement.",
  },
];

const STEPS = [
  {
    num: "01",
    color: "from-blue-600 to-indigo-600",
    title: "Upload your CV",
    desc: "Drop your PDF and our AI parses it into a rich structured profile — skills, roles, projects, education — in under 10 seconds.",
    pill: "< 10 seconds",
  },
  {
    num: "02",
    color: "from-indigo-600 to-purple-600",
    title: "Get AI-matched jobs",
    desc: "Your CV embedding is compared against thousands of live postings via cosine similarity. Top matches appear ranked by semantic fit.",
    pill: "Powered by pgvector",
  },
  {
    num: "03",
    color: "from-purple-600 to-pink-600",
    title: "Apply & track progress",
    desc: "Identify skill gaps, generate tailored cover letters, and track every application through a full Kanban pipeline with reminders.",
    pill: "Full audit trail",
  },
];

const STATS = [
  { value: "4", unit: "Live Sources", sub: "Arbeitnow · Jobicy · Greenhouse · Lever", color: "text-blue-400" },
  { value: "29", unit: "Boards & Orgs", sub: "Curated company boards, always fresh", color: "text-indigo-400" },
  { value: "100%", unit: "Zero Cost", sub: "No paid APIs required to run", color: "text-emerald-400" },
];

const TECH_PILLS = [
  "FastAPI", "Next.js 14", "Supabase", "pgvector", "Groq LLaMA 3.1",
  "Greenhouse API", "Lever API", "Arbeitnow", "Jobicy", "APScheduler", "ReportLab",
];

// ── Page component ─────────────────────────────────────────────────────────────

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#030712] text-slate-100 overflow-x-hidden">

      {/* ── Sticky Navbar ─────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-[#030712]/80 backdrop-blur-xl border-b border-white/[0.06]">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
              <Bot className="h-4 w-4 text-white" />
            </div>
            <span className="text-base font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 tracking-tight">
              CareerPath AI
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-6 text-sm text-slate-400">
            <a href="#features" className="hover:text-slate-200 transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-slate-200 transition-colors">How It Works</a>
            <a href="#tech" className="hover:text-slate-200 transition-colors">Stack</a>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/sign-in"
              className="hidden sm:block text-sm text-slate-400 hover:text-slate-200 transition-colors font-medium"
            >
              Sign in
            </Link>
            <Link
              href="/sign-up"
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold transition-all shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 hover:-translate-y-0.5 duration-200"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero ──────────────────────────────────────────────────────── */}
      <section className="relative pt-20 pb-28 px-6 overflow-hidden">
        {/* Background glows */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-blue-600/10 rounded-full blur-3xl" />
          <div className="absolute top-20 left-1/4 w-[400px] h-[300px] bg-indigo-600/8 rounded-full blur-2xl" />
          <div className="absolute top-10 right-1/4 w-[300px] h-[200px] bg-purple-600/8 rounded-full blur-2xl" />
        </div>

        <div className="relative max-w-5xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold mb-8 backdrop-blur-sm">
            <Sparkles className="w-3 h-3" />
            Powered by Groq · LLaMA 3.1 · pgvector
          </div>

          {/* Headline */}
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight leading-[1.05] mb-6">
            Land your{" "}
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400">
              dream role
            </span>
            <br />
            <span className="text-slate-300">with AI-powered clarity</span>
          </h1>

          <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed mb-10">
            Parse your CV, match semantically against{" "}
            <strong className="text-slate-300">thousands of live jobs</strong>, close skill gaps,
            generate cover letters — all in one workspace. Zero paid APIs required.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
            <Link
              href="/sign-up"
              className="group flex items-center gap-2 px-8 py-4 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-base transition-all shadow-xl shadow-blue-500/30 hover:shadow-blue-500/50 hover:-translate-y-1 duration-200"
            >
              <Sparkles className="w-5 h-5" />
              Start for free
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              href="/sign-in"
              className="flex items-center gap-2 px-8 py-4 rounded-2xl border border-slate-700 hover:border-slate-600 text-slate-300 hover:text-white font-semibold text-base transition-all hover:bg-slate-800/50 duration-200"
            >
              Sign in
            </Link>
          </div>

          {/* Mini feature pills */}
          <div className="flex flex-wrap justify-center gap-2.5">
            {[
              { icon: CheckCircle, text: "No credit card required" },
              { icon: Zap, text: "Results in under 10s" },
              { icon: Shield, text: "GDPR data rights built-in" },
            ].map(({ icon: Icon, text }) => (
              <div
                key={text}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/60 border border-slate-800 text-slate-400 text-xs font-medium"
              >
                <Icon className="w-3.5 h-3.5 text-blue-400" />
                {text}
              </div>
            ))}
          </div>
        </div>

        {/* Hero visual — Dashboard mockup */}
        <div className="relative max-w-5xl mx-auto mt-20">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#030712] z-10 pointer-events-none rounded-3xl" />
          <div className="relative rounded-3xl border border-white/[0.08] bg-[#070b14]/80 backdrop-blur-sm overflow-hidden shadow-2xl shadow-black/50 ring-1 ring-blue-500/10 shadow-[0_0_80px_-20px_rgba(59,130,246,0.25)]">
            {/* Fake browser chrome */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.06] bg-[#050a12]">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500/70" />
                <div className="w-3 h-3 rounded-full bg-amber-500/70" />
                <div className="w-3 h-3 rounded-full bg-green-500/70" />
              </div>
              <div className="flex-1 mx-4">
                <div className="bg-slate-800/60 rounded-lg px-3 py-1 text-xs text-slate-500 font-mono max-w-sm mx-auto text-center">
                  careerpath.ai/dashboard
                </div>
              </div>
            </div>

            {/* Dashboard preview content */}
            <div className="flex h-[340px] overflow-hidden">
              {/* Sidebar strip */}
              <div className="w-44 border-r border-white/[0.05] bg-[#070b14] flex flex-col p-3 gap-1 shrink-0">
                {[
                  { label: "Overview", active: true, dot: "bg-blue-500" },
                  { label: "Job Matches", active: false, dot: "bg-emerald-500" },
                  { label: "Skill Gap", active: false, dot: "bg-indigo-500" },
                  { label: "Applications", active: false, dot: "bg-amber-500" },
                  { label: "Cover Letters", active: false, dot: "bg-violet-500" },
                ].map(item => (
                  <div
                    key={item.label}
                    className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium ${
                      item.active
                        ? "bg-blue-600/15 text-blue-400"
                        : "text-slate-500"
                    }`}
                  >
                    <div className={`w-1.5 h-1.5 rounded-full ${item.dot} opacity-60`} />
                    {item.label}
                  </div>
                ))}
              </div>

              {/* Main area */}
              <div className="flex-1 p-5 overflow-hidden">
                {/* Welcome row */}
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="text-sm font-bold text-slate-200">Welcome back, Alex 👋</div>
                    <div className="text-[11px] text-slate-500">Your job hunt is ahead of 94% of applicants</div>
                  </div>
                  <div className="px-2 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold">
                    3 new matches
                  </div>
                </div>

                {/* Stat cards row */}
                <div className="grid grid-cols-3 gap-3 mb-4">
                  {[
                    { label: "Match Score", val: "94%", color: "text-blue-400", bg: "bg-blue-500/8" },
                    { label: "Jobs Indexed", val: "2,847", color: "text-indigo-400", bg: "bg-indigo-500/8" },
                    { label: "Skill Gaps", val: "3", color: "text-amber-400", bg: "bg-amber-500/8" },
                  ].map(c => (
                    <div key={c.label} className={`p-3 rounded-xl ${c.bg} border border-white/[0.05]`}>
                      <div className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mb-1">{c.label}</div>
                      <div className={`text-xl font-black ${c.color}`}>{c.val}</div>
                    </div>
                  ))}
                </div>

                {/* Top matches list */}
                <div className="space-y-2">
                  {[
                    { role: "Senior Frontend Engineer", co: "Vercel", pct: "94%", tag: "Remote", tagColor: "text-teal-400 bg-teal-500/10" },
                    { role: "Staff React Developer", co: "Linear", pct: "88%", tag: "Hybrid", tagColor: "text-indigo-400 bg-indigo-500/10" },
                    { role: "Full-Stack Engineer", co: "Supabase", pct: "82%", tag: "Remote", tagColor: "text-teal-400 bg-teal-500/10" },
                  ].map(job => (
                    <div key={job.role} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-800/30 border border-white/[0.04]">
                      <div className="flex items-center gap-2.5">
                        <div className="w-6 h-6 rounded-lg bg-blue-900/40 border border-blue-500/20 flex items-center justify-center">
                          <Briefcase className="w-3 h-3 text-blue-400" />
                        </div>
                        <div>
                          <div className="text-[11px] font-bold text-slate-200">{job.role}</div>
                          <div className="text-[9px] text-slate-500">{job.co}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded border ${job.tagColor} border-current/20`}>
                          {job.tag}
                        </span>
                        <span className="text-[11px] font-black text-indigo-400 font-mono">{job.pct}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats Band ────────────────────────────────────────────────── */}
      <section className="border-y border-white/[0.06] bg-[#070b14]/50">
        <div className="max-w-5xl mx-auto px-6 py-12 grid grid-cols-1 sm:grid-cols-3">
          {STATS.map((stat, i) => (
            <div key={stat.unit} className={`text-center py-4 ${
              i > 0 ? "sm:border-l sm:border-white/[0.06]" : ""
            }`}>
              <div className={`text-5xl font-black ${stat.color} mb-1 tracking-tight`}>{stat.value}</div>
              <div className="text-slate-200 font-bold text-sm mb-1">{stat.unit}</div>
              <div className="text-slate-500 text-xs">{stat.sub}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Problem section ───────────────────────────────────────────── */}
      <section className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-xs font-bold uppercase tracking-widest text-blue-400 mb-3">The problem</p>
            <h2 className="text-3xl md:text-4xl font-extrabold text-slate-100 mb-4">
              Job hunting is broken
            </h2>
            <p className="text-slate-400 text-base max-w-xl mx-auto">
              Candidates waste hours on mismatched applications, keyword-stuffed resumes, and scattered spreadsheets.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-5">
            {[
              {
                icon: "😤",
                title: "Keyword roulette",
                desc: "ATS filters reject 75% of applications before a human ever reads them. Guessing which keywords matter is a full-time job.",
                highlight: "75% rejection rate",
              },
              {
                icon: "⏰",
                title: "Skill blindspots",
                desc: "Most candidates don't know which skills are blocking them. Without a gap analysis, every application is a shot in the dark.",
                highlight: "No targeted learning",
              },
              {
                icon: "📋",
                title: "Scattered tracking",
                desc: "Applied via 6 platforms, follow-up emails in Gmail, status in a spreadsheet. Nothing is connected, nothing is automated.",
                highlight: "Zero visibility",
              },
            ].map(card => (
              <div
                key={card.title}
                className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800/80 hover:border-slate-700 transition-colors group"
              >
                <div className="text-3xl mb-4">{card.icon}</div>
                <div className="inline-block text-[10px] font-bold text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded-full mb-3">
                  {card.highlight}
                </div>
                <h3 className="text-base font-bold text-slate-100 mb-2">{card.title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{card.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features Grid ─────────────────────────────────────────────── */}
      <section id="features" className="py-24 px-6 bg-gradient-to-b from-transparent via-blue-950/5 to-transparent">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-xs font-bold uppercase tracking-widest text-blue-400 mb-3">Features</p>
            <h2 className="text-3xl md:text-4xl font-extrabold text-slate-100 mb-4">
              Everything you need to land the job
            </h2>
            <p className="text-slate-400 text-base max-w-xl mx-auto">
              A unified AI workspace that handles every step — from parsing your CV to tracking your offer.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map(f => (
              <div
                key={f.title}
                className="group relative p-6 rounded-2xl bg-slate-900/40 border border-slate-800/80 hover:border-slate-600 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-black/30 overflow-hidden"
              >
                {/* Subtle glow on hover */}
                <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-br ${f.color} opacity-[0.03] rounded-2xl`} />

                <div className={`relative w-10 h-10 rounded-xl bg-gradient-to-br ${f.color} shadow-lg ${f.glow} flex items-center justify-center mb-4`}>
                  <f.icon className="w-5 h-5 text-white" />
                </div>

                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-sm font-bold text-slate-100">{f.title}</h3>
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                    {f.badge}
                  </span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ──────────────────────────────────────────────── */}
      <section id="how-it-works" className="py-24 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-xs font-bold uppercase tracking-widest text-blue-400 mb-3">Process</p>
            <h2 className="text-3xl md:text-4xl font-extrabold text-slate-100 mb-4">
              From CV to offer in 3 steps
            </h2>
            <p className="text-slate-400 text-base max-w-xl mx-auto">
              No complex setup. Just upload, match, and apply — our AI does the heavy lifting.
            </p>
          </div>

          <div className="space-y-5">
            {STEPS.map((step, i) => (
              <div key={step.num} className="group flex gap-6 p-6 rounded-2xl bg-slate-900/40 border border-slate-800/80 hover:border-slate-700 transition-all">
                <div className={`shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br ${step.color} flex items-center justify-center font-black text-white text-sm shadow-lg`}>
                  {step.num}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-3 mb-2">
                    <h3 className="text-base font-bold text-slate-100">{step.title}</h3>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                      {step.pill}
                    </span>
                  </div>
                  <p className="text-sm text-slate-400 leading-relaxed">{step.desc}</p>
                </div>
                {i < STEPS.length - 1 && (
                  <ChevronRight className="shrink-0 self-center w-4 h-4 text-slate-700 group-hover:text-slate-500 transition-colors hidden sm:block" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Tech Stack ────────────────────────────────────────────────── */}
      <section id="tech" className="py-20 px-6 border-y border-white/[0.06] bg-[#070b14]/30">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3 flex items-center justify-center gap-2">
            <Layers className="w-3.5 h-3.5" /> Technology Stack
          </p>
          <h2 className="text-2xl font-extrabold text-slate-200 mb-3">
            Built on proven open infrastructure
          </h2>
          <p className="text-slate-400 text-sm mb-8 max-w-xl mx-auto">
            Every component is production-grade and zero-cost to operate. No vendor lock-in, no hidden fees.
          </p>
          <div className="flex flex-wrap justify-center gap-2.5">
            {TECH_PILLS.map(t => (
              <span
                key={t}
                className="px-3 py-1.5 rounded-full bg-slate-900/60 border border-slate-800 text-slate-400 text-xs font-semibold hover:border-slate-600 hover:text-slate-300 transition-colors"
              >
                {t}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Social Proof / Testimonial strip ─────────────────────────── */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="grid sm:grid-cols-3 gap-5">
            {[
              {
                quote: "The semantic matching is genuinely impressive. It found roles I would never have searched for but were perfect fits.",
                name: "Senior Engineer",
                sub: "Placed at a Series-B startup",
                stars: 5,
              },
              {
                quote: "Skill gap analysis told me exactly what to learn. Three weeks later I had the certifications and landed the interview.",
                name: "Career Switcher",
                sub: "Data → ML Engineering",
                stars: 5,
              },
              {
                quote: "The Greenhouse + Lever feed surfaces roles that never appear on generic boards. Huge competitive advantage.",
                name: "Product Manager",
                sub: "FAANG-adjacent role",
                stars: 5,
              },
            ].map(t => (
              <div key={t.name} className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800/80 space-y-4">
                <div className="flex gap-0.5">
                  {Array.from({ length: t.stars }).map((_, i) => (
                    <Star key={i} className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                  ))}
                </div>
                <p className="text-xs text-slate-300 leading-relaxed italic">&ldquo;{t.quote}&rdquo;</p>
                <div>
                  <div className="text-xs font-bold text-slate-200">{t.name}</div>
                  <div className="text-[10px] text-slate-500">{t.sub}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ─────────────────────────────────────────────────── */}
      <section className="py-24 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <div className="relative p-12 rounded-3xl bg-gradient-to-br from-blue-950/60 to-indigo-950/60 border border-blue-500/20 overflow-hidden">
            {/* Glows */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-48 bg-blue-500/15 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 right-1/4 w-48 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

            <div className="relative">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center mx-auto mb-6 shadow-xl shadow-blue-500/30">
                <Bot className="w-7 h-7 text-white" />
              </div>
              <h2 className="text-3xl md:text-4xl font-extrabold text-slate-100 mb-4">
                Your next role is waiting
              </h2>
              <p className="text-slate-400 text-base mb-8 max-w-lg mx-auto">
                Join the AI-powered job hunt. Upload your CV and get semantic matches in under a minute — completely free.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="/sign-up"
                  className="group flex items-center justify-center gap-2 px-8 py-4 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-base transition-all shadow-xl shadow-blue-500/30 hover:shadow-blue-500/50 hover:-translate-y-1 duration-200"
                >
                  <Sparkles className="w-5 h-5" />
                  Get started free
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
              <p className="text-xs text-slate-500 mt-4 flex items-center justify-center gap-4">
                <span className="flex items-center gap-1"><CheckCircle className="w-3 h-3 text-green-500" /> No credit card</span>
                <span className="flex items-center gap-1"><Shield className="w-3 h-3 text-blue-400" /> GDPR compliant</span>
                <span className="flex items-center gap-1"><Database className="w-3 h-3 text-indigo-400" /> Data is yours</span>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────────────── */}
      <footer className="border-t border-white/[0.06] py-10 px-6 bg-[#070b14]/50">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow-sm shadow-blue-500/30">
              <Bot className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="text-sm font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-400">
              CareerPath AI
            </span>
            <span className="text-slate-600 text-xs font-mono">v2.1</span>
          </div>

          <div className="flex items-center gap-6 text-xs text-slate-500">
            <span className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" />
              Zero-Cost Edition
            </span>
            <span className="flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5" />
              GDPR Art. 15/17/20
            </span>
            <span className="flex items-center gap-1.5">
              <BrainCircuit className="w-3.5 h-3.5" />
              Groq · pgvector
            </span>
          </div>

          <div className="text-xs text-slate-600">
            &copy; {new Date().getFullYear()} CareerPath AI. All rights reserved.
          </div>
        </div>
      </footer>

    </div>
  );
}
