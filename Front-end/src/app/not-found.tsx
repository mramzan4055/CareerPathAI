import Link from "next/link";
import { ArrowLeft, Compass } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center p-6 text-center relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-600/10 blur-[120px] rounded-full pointer-events-none" />
      
      <div className="relative z-10 space-y-6 max-w-md">
        <div className="mx-auto w-20 h-20 bg-slate-900/80 border border-slate-800 rounded-2xl flex items-center justify-center shadow-2xl">
          <Compass className="w-10 h-10 text-blue-500" />
        </div>
        
        <div className="space-y-2">
          <h1 className="text-4xl font-black text-slate-100 tracking-tight">
            404 - Lost in the Cloud
          </h1>
          <p className="text-slate-400 text-sm leading-relaxed">
            We couldn&apos;t find the page you were looking for. It might have been moved, deleted, or perhaps it never existed at all.
          </p>
        </div>

        <div className="pt-4 flex justify-center">
          <Button asChild className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-lg font-bold">
            <Link href="/dashboard">
              <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
