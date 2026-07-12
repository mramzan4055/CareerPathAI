"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCcw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Optionally log the error to an error reporting service
    console.error("Global React Error Boundary caught:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center p-6 text-center relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-red-600/10 blur-[120px] rounded-full pointer-events-none" />
      
      <div className="relative z-10 space-y-6 max-w-md bg-slate-900/40 p-8 rounded-3xl border border-slate-800/80 backdrop-blur-sm shadow-2xl">
        <div className="mx-auto w-16 h-16 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center justify-center">
          <AlertTriangle className="w-8 h-8 text-red-500" />
        </div>
        
        <div className="space-y-2">
          <h1 className="text-2xl font-black text-slate-100 tracking-tight">
            Something went wrong!
          </h1>
          <p className="text-slate-400 text-sm leading-relaxed">
            An unexpected error occurred in the application. Our team has been notified. 
          </p>
          <div className="mt-4 p-3 bg-slate-950 rounded-xl border border-slate-800 overflow-hidden text-left">
            <p className="text-xs font-mono text-red-400 break-words line-clamp-3">
              {error.message || "Unknown error component failure"}
            </p>
          </div>
        </div>

        <div className="pt-4 flex flex-col sm:flex-row gap-3 justify-center">
          <Button 
            onClick={() => reset()} 
            variant="outline"
            className="border-slate-700 hover:border-slate-600 text-slate-300 font-bold rounded-xl"
          >
            <RefreshCcw className="w-4 h-4 mr-2" /> Try Again
          </Button>
          <Button asChild className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold">
            <Link href="/dashboard">
              <Home className="w-4 h-4 mr-2" /> Go to Dashboard
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
