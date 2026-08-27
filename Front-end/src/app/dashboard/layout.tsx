"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useSupabaseAuth } from "@/providers/supabase-auth-provider";
import Link from "next/link";
import {
  Bot,
  LayoutDashboard,
  FileText,
  Briefcase,
  Bookmark,
  TrendingUp,
  Mail,
  LogOut,
  Loader2,
  Menu,
  Send,
  Settings,
  Bell,
  Shield,
  Sparkles,
  User,
  X,
} from "lucide-react";
import { useState } from "react";

// ── Nav structure: grouped sections ──────────────────────────────────────────

const NAV_SECTIONS = [
  {
    label: "Workspace",
    items: [
      { href: "/dashboard",             label: "Overview",       icon: LayoutDashboard },
      { href: "/dashboard/cv",          label: "Upload CV",      icon: FileText },
      { href: "/dashboard/resume",      label: "Resume Lab",     icon: Sparkles },
      { href: "/dashboard/profile",     label: "Profile",        icon: User },
    ],
  },
  {
    label: "Opportunities",
    items: [
      { href: "/dashboard/jobs",        label: "Job Matches",    icon: Briefcase },
      { href: "/dashboard/saved",       label: "Saved Jobs",     icon: Bookmark },
      { href: "/dashboard/applications",label: "Applications",   icon: Send },
    ],
  },
  {
    label: "Intelligence",
    items: [
      { href: "/dashboard/skills",      label: "Skill Gap",      icon: TrendingUp },
      { href: "/dashboard/cover-letters",label: "Cover Letters", icon: Mail },
    ],
  },
  {
    label: "System",
    items: [
      { href: "/dashboard/notifications", label: "Notifications", icon: Bell },
      { href: "/dashboard/data-rights",   label: "Privacy & Data", icon: Shield },
      { href: "/dashboard/admin",         label: "Job Sources",    icon: Settings },
    ],
  },
];

// Flat list used by the mobile header "current page" label
const ALL_NAV_ITEMS = NAV_SECTIONS.flatMap(s => s.items);

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, signOut } = useSupabaseAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/sign-in");
    }
  }, [user, loading, router]);

  if (!loading && !user) return null;

  const name =
    user?.user_metadata?.name ||
    user?.user_metadata?.full_name ||
    user?.email?.split("@")[0] ||
    "Loading...";
  const avatarChar = user ? name.charAt(0).toUpperCase() : "";

  const handleSignOut = async () => {
    await signOut();
    router.push("/");
  };

  const currentPage = ALL_NAV_ITEMS.find(i => i.href === pathname)?.label ?? "Dashboard";

  const Sidebar = ({ mobile = false }: { mobile?: boolean }) => (
    <aside
      className={`flex flex-col bg-[#070b14] border-r border-white/[0.05] ${
        mobile ? "w-full h-full" : "w-60 h-screen sticky top-0"
      }`}
    >
      {/* Logo */}
      <div className="px-5 py-5 border-b border-white/[0.05] flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
            <Bot className="h-4.5 w-4.5 text-white" />
          </div>
          <span className="text-base font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 tracking-tight leading-none">
            CareerPath<br />
            <span className="text-[11px] font-semibold text-slate-500 tracking-widest uppercase bg-none bg-clip-border [-webkit-text-fill-color:_rgb(100_116_139)]">AI v2.1</span>
          </span>
        </div>
        {mobile && (
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-1 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-800/60 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Nav Links — grouped */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto space-y-5">
        {NAV_SECTIONS.map(section => (
          <div key={section.label}>
            <p className="px-3 mb-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-600">
              {section.label}
            </p>
            <div className="space-y-0.5">
              {section.items.map(({ href, label, icon: Icon }) => {
                const active = pathname === href;
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-150 group ${
                      active
                        ? "bg-blue-600/15 text-blue-400 border border-blue-500/20 shadow-sm"
                        : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                    }`}
                  >
                    <Icon
                      className={`h-4 w-4 shrink-0 transition-colors ${
                        active ? "text-blue-400" : "text-slate-500 group-hover:text-slate-300"
                      }`}
                    />
                    <span className="truncate">{label}</span>
                    {/* Notification dot placeholder – could be wired to unread count */}
                    {href === "/dashboard/notifications" && (
                      <span className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* User Footer */}
      <div className="px-3 pb-4 pt-3 border-t border-white/[0.05] space-y-1">
        <Link
          href="/dashboard/profile"
          className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-slate-900/40 border border-slate-800/60 hover:border-blue-500/20 hover:bg-slate-900/60 transition-all duration-200 group"
        >
          <div className="h-7 w-7 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 shadow-sm shadow-blue-500/30">
            {avatarChar}
          </div>
          <div className="flex-1 min-w-0">
            {loading ? (
              <>
                <div className="h-3.5 w-20 bg-slate-800 rounded animate-pulse mb-1" />
                <div className="h-2.5 w-28 bg-slate-800 rounded animate-pulse" />
              </>
            ) : (
              <>
                <div className="text-xs font-semibold text-slate-200 truncate group-hover:text-blue-400 transition-colors leading-snug">
                  {name}
                </div>
                <div className="text-[10px] text-slate-500 truncate leading-snug">{user?.email}</div>
              </>
            )}
          </div>
        </Link>

        <button
          onClick={handleSignOut}
          className="flex items-center gap-2 w-full px-3 py-2 text-xs text-slate-500 hover:text-red-400 hover:bg-red-500/5 rounded-xl transition-all duration-200"
        >
          <LogOut className="h-3.5 w-3.5" />
          Sign Out
        </button>
      </div>
    </aside>
  );

  return (
    <div className="min-h-screen bg-[#030712] text-slate-100 flex">
      {/* Desktop Sidebar */}
      <div className="hidden md:flex">
        <Sidebar />
      </div>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          <div className="absolute left-0 top-0 h-full w-72 z-10 shadow-2xl shadow-black/50">
            <Sidebar mobile />
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
        {/* Mobile Header */}
        <header className="md:hidden sticky top-0 z-40 flex items-center justify-between px-4 h-14 bg-[#070b14]/95 backdrop-blur-md border-b border-white/[0.05]">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors"
          >
            <Menu className="h-5 w-5" />
          </button>
          <span className="text-sm font-bold text-slate-200">{currentPage}</span>
          <Link
            href="/dashboard/profile"
            className="h-8 w-8 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white text-sm font-bold shadow-sm shadow-blue-500/30 hover:scale-105 transition-transform"
          >
            {avatarChar}
          </Link>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-5 md:p-8 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-full min-h-[400px]">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                <p className="text-sm text-slate-500">Loading your workspace…</p>
              </div>
            </div>
          ) : (
            children
          )}
        </main>
      </div>
    </div>
  );
}
