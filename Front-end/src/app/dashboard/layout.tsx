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
} from "lucide-react";
import { useState } from "react";

const navItems = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/cv", label: "Upload CV", icon: FileText },
  { href: "/dashboard/jobs", label: "Job Matches", icon: Briefcase },
  { href: "/dashboard/saved", label: "Saved Jobs", icon: Bookmark },
  { href: "/dashboard/skills", label: "Skill Gap", icon: TrendingUp },
  { href: "/dashboard/cover-letters", label: "Cover Letters", icon: Mail },
];

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

  const Sidebar = ({ mobile = false }: { mobile?: boolean }) => (
    <aside
      className={`flex flex-col bg-[#070b14] border-r border-blue-500/10 ${
        mobile ? "w-full h-full" : "w-64 h-screen sticky top-0"
      }`}
    >
      {/* Logo */}
      <div className="p-6 border-b border-blue-500/10 flex items-center gap-2">
        <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/25">
          <Bot className="h-5 w-5 text-white" />
        </div>
        <span className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 tracking-tight">
          CareerPath AI
        </span>
      </div>

      {/* Nav Links */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group ${
                active
                  ? "bg-blue-600/15 text-blue-400 border border-blue-500/20"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
              }`}
            >
              <Icon className={`h-4.5 w-4.5 ${active ? "text-blue-400" : "text-slate-500 group-hover:text-slate-300"}`} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* User Footer */}
      <div className="p-4 border-t border-blue-500/10">
        <Link
          href="/dashboard/profile"
          className="flex items-center gap-3 px-3 py-2 rounded-xl bg-slate-900/40 border border-slate-800/60 mb-2 hover:border-blue-500/20 hover:bg-slate-900/60 transition-all duration-300 group cursor-pointer"
        >
          <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
            {avatarChar}
          </div>
          <div className="flex-1 min-w-0">
            {loading ? (
              <div className="h-4 w-24 bg-slate-800 rounded animate-pulse mb-1"></div>
            ) : (
              <div className="text-sm font-semibold text-slate-200 truncate group-hover:text-blue-400 transition-colors">{name}</div>
            )}
            {loading ? (
              <div className="h-3 w-32 bg-slate-800 rounded animate-pulse"></div>
            ) : (
              <div className="text-xs text-slate-500 truncate">{user?.email}</div>
            )}
          </div>
        </Link>
        <button
          onClick={handleSignOut}
          className="flex items-center gap-2 w-full px-3 py-2 text-sm text-slate-400 hover:text-red-400 hover:bg-red-500/5 rounded-xl transition-all duration-200"
        >
          <LogOut className="h-4 w-4" />
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
          <div className="absolute inset-0 bg-black/60" onClick={() => setSidebarOpen(false)} />
          <div className="absolute left-0 top-0 h-full w-72 z-10">
            <Sidebar mobile />
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
        {/* Mobile Header */}
        <header className="md:hidden sticky top-0 z-40 flex items-center justify-between px-4 h-16 bg-[#070b14]/90 backdrop-blur-md border-b border-blue-500/10">
          <button onClick={() => setSidebarOpen(true)} className="p-2 text-slate-400 hover:text-white transition-colors">
            <Menu className="h-5 w-5" />
          </button>
          <span className="text-sm font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-400">
            CareerPath AI
          </span>
          <Link
            href="/dashboard/profile"
            className="h-8 w-8 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white text-sm font-bold cursor-pointer hover:scale-105 transition-transform"
          >
            {avatarChar}
          </Link>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-6 md:p-8 overflow-y-auto relative">
          {loading ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            </div>
          ) : (
            children
          )}
        </main>
      </div>
    </div>
  );
}
