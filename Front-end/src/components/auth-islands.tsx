"use client";

import React from "react";
import { useSupabaseAuth } from "@/providers/supabase-auth-provider";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

/** Small client island: Hero CTA buttons that change based on auth state */
export const HeroCTA = () => {
  const { user, loading } = useSupabaseAuth();

  const href = user ? "/dashboard" : "/sign-up";
  const label = user ? "Go to Dashboard" : "Get Started Free";

  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 pt-4">
      <Button
        asChild
        className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold px-8 py-6 text-base rounded-xl shadow-lg shadow-blue-500/20 hover:shadow-blue-500/35 transition-all duration-300"
        disabled={loading}
      >
        <Link href={href} prefetch={true}>
          {label}
          <ArrowRight className="ml-2 h-5 w-5" />
        </Link>
      </Button>
      <a href="#how-it-works" className="w-full sm:w-auto">
        <Button variant="outline" className="w-full sm:w-auto border-slate-700 hover:border-blue-500/50 hover:bg-blue-950/10 text-slate-300 font-semibold px-8 py-6 text-base rounded-xl transition-all duration-200">
          See How It Works
        </Button>
      </a>
    </div>
  );
};

/** Small client island: Final CTA button */
export const FinalCTA = () => {
  const { user, loading } = useSupabaseAuth();

  return (
    <div className="pt-4">
      <Button
        asChild
        size="lg"
        className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold px-10 py-7 text-lg rounded-xl shadow-xl shadow-blue-500/20 hover:shadow-blue-500/35 transition-all duration-300"
        disabled={loading}
      >
        <Link href={user ? "/dashboard" : "/sign-up"} prefetch={true}>
          {user ? "Go to Dashboard" : "Create Free Account"}
        </Link>
      </Button>
    </div>
  );
};

/** Small client island: Footer auth-aware links */
export const FooterAuthLinks = () => {
  const { user } = useSupabaseAuth();

  if (user) {
    return <span className="text-slate-600 font-sans">Logged In</span>;
  }

  return (
    <>
      <Link href="/sign-in" prefetch={true} className="hover:text-blue-400 transition-colors">Login</Link>
      <Link href="/sign-up" prefetch={true} className="hover:text-blue-400 transition-colors">Sign Up</Link>
    </>
  );
};
