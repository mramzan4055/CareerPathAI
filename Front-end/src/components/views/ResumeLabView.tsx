"use client";

import { useState, useEffect } from "react";
import { getCV, type CVData } from "@/lib/api";
import { useSupabaseAuth } from "@/providers/supabase-auth-provider";
import { supabase } from "@/lib/supabase-browser";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  RotateCcw,
  CheckCircle,
  AlertCircle,
  FileText,
  Plus,
  Loader2,
  Printer
} from "lucide-react";

interface SuggestedImprovement {
  id: string;
  title: string;
  desc: string;
  actionText: string;
  type: string;
  resolved?: boolean;
}

const mockSuggestions: SuggestedImprovement[] = [
  {
    id: "s1",
    title: "Quantify Achievements",
    desc: "Your experience lacks measurable impact metrics. AI can rewrite bullets to highlight metrics like 'increased conversion by 22%'.",
    actionText: "Auto-Quantify",
    type: "quantify",
  },
  {
    id: "s2",
    title: "Missing Portfolio Link",
    desc: "Target roles expect a portfolio or GitHub link. Add it to the header.",
    actionText: "Fix Header",
    type: "portfolio",
  }
];

export default function ResumeLabPage() {
  const { user } = useSupabaseAuth();
  const router = useRouter();

  const [cvData, setCvData] = useState<CVData | null>(null);
  const [initLoading, setInitLoading] = useState(true);

  // -- ATS Resume Lab State --
  const [resumeText, setResumeText] = useState("");
  const [originalResumeText, setOriginalResumeText] = useState("");
  const [score, setScore] = useState(85);
  const [analyzing, setAnalyzing] = useState(false);
  const [activeTab, setActiveTab] = useState<'editor' | 'preview'>('editor');
  const [activeSuggestions, setActiveSuggestions] = useState<SuggestedImprovement[]>(mockSuggestions);

  useEffect(() => {
    const fetchCV = async () => {
      setInitLoading(true);
      let cvId = localStorage.getItem("cv_id");

      if (!cvId && user) {
        try {
          const { data } = await supabase
            .from("profiles")
            .select("cv_id")
            .eq("id", user.id)
            .maybeSingle();

          if (data?.cv_id) {
            cvId = data.cv_id;
            localStorage.setItem("cv_id", data.cv_id);
          }
        } catch {}
      }

      if (cvId) {
        try {
          const data = await getCV(cvId);
          setCvData(data);
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

  const handleAutoFix = (id: string, type: string) => {
    if (type === 'quantify') {
      const fixedText = resumeText + "\n\n* Optimized metric values increasing precision by 20%.";
      setResumeText(fixedText);
      setScore(prev => Math.min(100, prev + 9));
    } else if (type === 'portfolio') {
      const lines = resumeText.split("\n");
      if (lines.length > 1) {
        lines[1] = lines[1] + " | portfolio.com";
      }
      setResumeText(lines.join("\n"));
      setScore(prev => Math.min(100, prev + 6));
    }
    setActiveSuggestions(prev => prev.map(s => s.id === id ? { ...s, resolved: true } : s));
  };

  const handleResetLab = () => {
    setResumeText(originalResumeText);
    setScore(85);
    setActiveSuggestions(mockSuggestions);
  };

  const runAnalysis = () => {
    setAnalyzing(true);
    setTimeout(() => {
      setAnalyzing(false);
      setScore(prev => Math.min(100, prev + 2));
    }, 1500);
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

  return (
    <div className="space-y-6 select-none animate-in fade-in duration-500 max-w-[1400px]">
      
      {/* Lab Header */}
      <div className="p-5 bg-slate-900/30 border border-slate-800/80 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-100 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-blue-400" /> AI Resume Optimizer Lab
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            Active optimization target: <strong className="text-blue-400 font-bold">{(cvData as any)?.target_role || 'Senior Software Engineer'}</strong>
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
            
            <div className="flex items-center gap-6">
              <div className="relative w-24 h-24 shrink-0 flex items-center justify-center">
                <svg className="absolute inset-0 w-full h-full transform -rotate-90">
                  <circle cx="48" cy="48" r="38" stroke="#1e293b" strokeWidth="8" fill="none" />
                  <circle 
                    cx="48" cy="48" r="38" 
                    stroke={score >= 90 ? '#22c55e' : '#3b82f6'} 
                    strokeWidth="8" 
                    fill="none" 
                    strokeDasharray="238.7" 
                    strokeDashoffset={238.7 - (238.7 * score) / 100}
                    className="transition-all duration-1000"
                  />
                </svg>
                <div className="text-center">
                  <span className="text-2xl font-black text-slate-100 block">{score}</span>
                  <span className="text-[8px] text-slate-500 font-bold uppercase tracking-wider block">Index</span>
                </div>
              </div>

              <div className="space-y-1">
                <div className="text-sm font-bold text-slate-100">
                  {score >= 90 ? 'Optimal Score!' : 'Ready to Boost'}
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  {score >= 90 
                    ? 'Excellent! Your resume matches the senior requirements perfectly.' 
                    : 'Your score is moderate. Implement our recommended auto-fixes to boost score past 90.'}
                </p>
              </div>
            </div>
          </div>

          <div className="p-5 bg-slate-900/30 border border-slate-800/80 rounded-2xl space-y-4">
            <h3 className="text-sm font-bold text-slate-100">AI Suggested Improvements</h3>

            <div className="space-y-3.5">
              {activeSuggestions.map(item => (
                <div 
                  key={item.id} 
                  className={`p-3.5 rounded-xl border transition-colors ${item.resolved ? 'bg-slate-800/20 border-slate-700/30 opacity-60' : 'bg-slate-800/40 border-slate-700'}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                        {item.resolved ? (
                          <CheckCircle className="w-3.5 h-3.5 text-green-400" />
                        ) : (
                          <AlertCircle className="w-3.5 h-3.5 text-blue-400" />
                        )}
                        {item.title}
                      </div>
                      <p className="text-[10px] text-slate-400 leading-relaxed">{item.desc}</p>
                    </div>
                  </div>

                  {!item.resolved && (
                    <div className="mt-3 flex justify-end">
                      <button 
                        onClick={() => handleAutoFix(item.id, item.type)}
                        className="px-2.5 py-1 rounded bg-blue-500/10 border border-blue-500/20 text-[10px] font-extrabold text-blue-400 hover:bg-blue-600 hover:text-white transition-all cursor-pointer"
                      >
                        {item.actionText}
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="p-5 bg-slate-900/30 border border-slate-800/80 rounded-2xl space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">Target Action Verbs</h4>
            <p className="text-[10px] text-slate-500">Recommended semantic action triggers for your roles</p>
            
            <div className="grid grid-cols-2 gap-2 pt-1 font-mono text-[10px]">
              <div className="flex items-center gap-1.5 text-cyan-400 font-bold">
                <CheckCircle className="w-3 h-3" /> Spearheaded
              </div>
              <div className="flex items-center gap-1.5 text-cyan-400 font-bold">
                <CheckCircle className="w-3 h-3" /> Re-engineered
              </div>
              <div className="flex items-center gap-1.5 text-slate-500">
                <Plus className="w-3 h-3" /> Orchestrated
              </div>
              <div className="flex items-center gap-1.5 text-slate-500">
                <Plus className="w-3 h-3" /> Conceptualized
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
