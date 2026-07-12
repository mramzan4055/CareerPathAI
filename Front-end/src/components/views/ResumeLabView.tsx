"use client";

import { useState, useEffect } from "react";
import { getCV, getResumeReview, type CVData, type ResumeSuggestion } from "@/lib/api";
import { useSupabaseAuth } from "@/providers/supabase-auth-provider";
import { supabase } from "@/lib/supabase-browser";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  RotateCcw,
  AlertCircle,
  FileText,
  Loader2,
  Printer
} from "lucide-react";

const priorityStyles: Record<string, string> = {
  High: 'bg-red-500/15 text-red-400 border-red-500/20',
  Medium: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  Low: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
};

export default function ResumeLabPage() {
  const { user } = useSupabaseAuth();
  const router = useRouter();

  const [cvData, setCvData] = useState<CVData | null>(null);
  const [cvId, setCvId] = useState<string | null>(null);
  const [targetRole, setTargetRole] = useState("");
  const [initLoading, setInitLoading] = useState(true);

  // -- ATS Resume Lab State --
  const [resumeText, setResumeText] = useState("");
  const [originalResumeText, setOriginalResumeText] = useState("");
  const [score, setScore] = useState<number | null>(null);
  const [suggestions, setSuggestions] = useState<ResumeSuggestion[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'editor' | 'preview'>('editor');

  useEffect(() => {
    const fetchCV = async () => {
      setInitLoading(true);
      let resolvedCvId = localStorage.getItem("cv_id");

      if (!resolvedCvId && user) {
        try {
          const { data } = await supabase
            .from("profiles")
            .select("cv_id")
            .eq("id", user.id)
            .maybeSingle();

          if (data?.cv_id) {
            resolvedCvId = data.cv_id;
            localStorage.setItem("cv_id", data.cv_id);
          }
        } catch {}
      }

      if (resolvedCvId) {
        try {
          const data = await getCV(resolvedCvId);
          setCvData(data);
          setCvId(resolvedCvId);
          initializeResumeText(data);
        } catch (err) {
          console.error("Error fetching CV data:", err);
          localStorage.removeItem("cv_id");
        }
      }
      setInitLoading(false);
    };

    fetchCV();
  }, [user]);

  useEffect(() => {
    const fetchTargetRole = async () => {
      if (!user) return;
      try {
        const { data } = await supabase
          .from("profiles")
          .select("target_role")
          .eq("id", user.id)
          .maybeSingle();
        setTargetRole(data?.target_role || "");
      } catch {
        setTargetRole("");
      }
    };
    fetchTargetRole();
  }, [user]);

  const initializeResumeText = (data: CVData) => {
    let md = `# ${data.name || "YOUR NAME"}\n`;

    const contactInfo = [];
    if (data.email) contactInfo.push(data.email);
    if (data.location) contactInfo.push(data.location);
    if (data.phone) contactInfo.push(data.phone);
    if (data.linkedin) contactInfo.push(data.linkedin);

    if (contactInfo.length > 0) {
      md += contactInfo.join(" | ") + "\n\n";
    }

    if (data.summary) {
      md += `## PROFESSIONAL SUMMARY\n${data.summary}\n\n`;
    }

    if (data.experience && data.experience.length > 0) {
      md += `## EXPERIENCE\n${data.experience.join("\n\n")}\n\n`;
    }

    if (data.skills && data.skills.length > 0) {
      md += `## SKILLS\n${data.skills.join(", ")}\n\n`;
    }

    if (data.education && data.education.length > 0) {
      md += `## EDUCATION\n${data.education.map(e => `* ${e.degree} at ${e.institution}`).join("\n")}\n\n`;
    }

    setResumeText(md.trim());
    setOriginalResumeText(md.trim());
  };

  const handleResetLab = () => {
    setResumeText(originalResumeText);
    setScore(null);
    setSuggestions([]);
    setAnalysisError(null);
  };

  const runAnalysis = async () => {
    if (!cvId) {
      setAnalysisError("No CV found. Please upload your CV first.");
      return;
    }
    setAnalyzing(true);
    setAnalysisError(null);
    try {
      const result = await getResumeReview(cvId);
      setScore(result.ats_score);
      setSuggestions(result.suggestions);
    } catch (err) {
      setAnalysisError(err instanceof Error ? err.message : "Failed to run AI audit.");
    } finally {
      setAnalyzing(false);
    }
  };

  if (initLoading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!cvData && !initLoading) {
    return (
      <div className="max-w-2xl space-y-6">
         <div className="p-8 bg-slate-900/30 border border-slate-800/80 rounded-2xl flex flex-col items-center text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-blue-950/20 border border-blue-500/20 flex items-center justify-center">
              <FileText className="w-8 h-8 text-blue-400" />
            </div>
            <h2 className="text-xl font-extrabold text-slate-100">No CV Found</h2>
            <p className="text-sm text-slate-400 max-w-lg mx-auto">
              You need to upload and parse your CV first before you can optimize it in the ATS Lab.
            </p>
            <button
              onClick={() => router.push("/dashboard/cv")}
              className="mt-4 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-500/20"
            >
              Go to CV Upload
            </button>
         </div>
      </div>
    );
  }

  const ringOffset = score !== null ? 238.7 - (238.7 * score) / 100 : 238.7;
  const ringColor = score !== null ? (score >= 90 ? '#22c55e' : '#3b82f6') : '#334155';

  return (
    <div className="space-y-6 select-none animate-in fade-in duration-500 max-w-[1400px]">

      {/* Lab Header */}
      <div className="p-5 bg-slate-900/30 border border-slate-800/80 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-100 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-blue-400" /> AI Resume Optimizer Lab
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Active optimization target: <strong className="text-blue-400 font-bold">{targetRole || "No target role set — add one in your Profile"}</strong>
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => window.open("/dashboard/profile/print", "_blank")}
            className="px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 flex items-center gap-1.5 font-bold cursor-pointer transition-colors"
            title="Print Optimized Resume"
          >
            <Printer className="w-3.5 h-3.5" /> Print
          </button>

          <button
            onClick={handleResetLab}
            className="px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 flex items-center gap-1.5 font-bold cursor-pointer transition-colors"
            title="Reset to default resume template"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Revert Edits
          </button>

          <button
            onClick={runAnalysis}
            disabled={analyzing}
            className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 disabled:opacity-50 transition-colors shadow-lg shadow-blue-500/20"
          >
            {analyzing ? (
              <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Analyzing...</>
            ) : (
              <><Sparkles className="w-3.5 h-3.5" /> Run AI Audit</>
            )}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Left Side: Interactive Editor and Preview */}
        <div className="col-span-1 lg:col-span-8 p-5 bg-slate-900/30 border border-slate-800/80 rounded-2xl flex flex-col h-[650px]">

          <div className="flex justify-between items-center pb-3 border-b border-slate-800/60 shrink-0">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Resume Draft</span>
            </div>

            <div className="flex bg-slate-900 p-0.5 rounded-lg border border-slate-800/80">
              <button
                onClick={() => setActiveTab('editor')}
                className={`px-3 py-1 rounded-md text-xs font-semibold ${activeTab === 'editor' ? 'bg-slate-800 text-slate-100' : 'text-slate-500 hover:text-slate-300'}`}
              >
                Markdown Editor
              </button>
              <button
                onClick={() => setActiveTab('preview')}
                className={`px-3 py-1 rounded-md text-xs font-semibold ${activeTab === 'preview' ? 'bg-slate-800 text-slate-100' : 'text-slate-500 hover:text-slate-300'}`}
              >
                ATS Preview
              </button>
            </div>
          </div>

          <div className="flex-1 py-4 overflow-hidden">
            {activeTab === 'editor' ? (
              <textarea
                value={resumeText}
                onChange={(e) => setResumeText(e.target.value)}
                className="w-full h-full bg-transparent border-0 resize-none text-xs font-mono focus:outline-none focus:ring-0 text-slate-300 leading-relaxed custom-scrollbar"
                placeholder="Paste your markdown resume content here..."
              />
            ) : (
              <div className="w-full h-full overflow-y-auto custom-scrollbar text-xs leading-relaxed text-slate-400 pr-1 space-y-4">
                <div className="whitespace-pre-line text-sm text-slate-300">{resumeText}</div>
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-slate-800/60 flex justify-between items-center text-[10px] font-mono text-slate-500 shrink-0">
            <span>Character Count: {resumeText.length}</span>
            <span>Target Matcher: ATS-Resume-Ranker</span>
          </div>
        </div>

        {/* Right Side: Score Meter & Suggestions */}
        <div className="col-span-1 lg:col-span-4 space-y-6">

          <div className="p-5 bg-slate-900/30 border border-slate-800/80 rounded-2xl space-y-4">
            <h3 className="text-sm font-bold text-slate-100">Live ATS Score</h3>

            {analysisError && (
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-[11px]">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {analysisError}
              </div>
            )}

            <div className="flex items-center gap-6">
              <div className="relative w-24 h-24 shrink-0 flex items-center justify-center">
                <svg className="absolute inset-0 w-full h-full transform -rotate-90">
                  <circle cx="48" cy="48" r="38" stroke="#1e293b" strokeWidth="8" fill="none" />
                  <circle
                    cx="48" cy="48" r="38"
                    stroke={ringColor}
                    strokeWidth="8"
                    fill="none"
                    strokeDasharray="238.7"
                    strokeDashoffset={ringOffset}
                    className="transition-all duration-1000"
                  />
                </svg>
                <div className="text-center">
                  <span className="text-2xl font-black text-slate-100 block">{score ?? '—'}</span>
                  <span className="text-[8px] text-slate-500 font-bold uppercase tracking-wider block">Index</span>
                </div>
              </div>

              <div className="space-y-1">
                <div className="text-sm font-bold text-slate-100">
                  {score === null ? 'Not Yet Analyzed' : score >= 90 ? 'Optimal Score!' : 'Ready to Boost'}
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  {score === null
                    ? 'Run the AI Audit to get your real ATS score and suggestions.'
                    : score >= 90
                    ? 'Excellent! Your resume matches the requirements strongly.'
                    : 'Your score is moderate. Review the suggestions below to boost it.'}
                </p>
              </div>
            </div>
          </div>

          <div className="p-5 bg-slate-900/30 border border-slate-800/80 rounded-2xl space-y-4">
            <h3 className="text-sm font-bold text-slate-100">AI Suggested Improvements</h3>

            {suggestions.length === 0 ? (
              <p className="text-[11px] text-slate-500">
                {analyzing ? 'Analyzing your resume…' : 'Run the AI Audit to get real, content-aware suggestions.'}
              </p>
            ) : (
              <div className="space-y-3.5">
                {suggestions.map((item, i) => (
                  <div
                    key={i}
                    className="p-3.5 rounded-xl border bg-slate-800/40 border-slate-700"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1 min-w-0">
                        <div className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                          <AlertCircle className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                          {item.title}
                        </div>
                        <p className="text-[10px] text-slate-400 leading-relaxed">{item.description}</p>
                      </div>
                      <span className={`shrink-0 px-2 py-0.5 rounded text-[8px] font-bold uppercase border ${priorityStyles[item.priority] || priorityStyles.Low}`}>
                        {item.priority}
                      </span>
                    </div>
                    <div className="mt-2 text-[9px] font-mono text-slate-500 uppercase tracking-wider">{item.category}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
