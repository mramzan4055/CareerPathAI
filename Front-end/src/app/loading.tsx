import { Loader2 } from "lucide-react";

export default function Loading() {
  return (
    <div className="fixed inset-0 bg-[#020617] flex flex-col items-center justify-center z-50">
      <div className="relative">
        <div className="absolute -inset-4 rounded-full bg-blue-500/20 blur-xl animate-pulse"></div>
        <Loader2 className="h-10 w-10 animate-spin text-blue-500 relative z-10" />
      </div>
      <p className="mt-4 text-sm font-semibold text-slate-400 animate-pulse tracking-wide uppercase">
        Loading KaamYabi AI...
      </p>
    </div>
  );
}
