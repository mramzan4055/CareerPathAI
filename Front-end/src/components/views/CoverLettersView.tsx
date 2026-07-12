"use client";

import { useState, useEffect } from "react";
import {
  matchJobs,
  generateCoverLetter,
  getCoverLetters,
  deleteCoverLetter,
  type MatchedJob,
  type CoverLetter,
} from "@/lib/api";
import { useSupabaseAuth } from "@/providers/supabase-auth-provider";
import { supabase } from "@/lib/supabase-browser";
import { useRouter } from "next/navigation";
import {
  Mail,
  Sparkles,
  Loader2,
  FileText,
  Copy,
  Trash2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { toast } from "sonner";

const TONE_OPTIONS = ["Professional", "Enthusiastic", "Formal", "Conversational"];

export default function CoverLettersView() {
  const { user } = useSupabaseAuth();
  const router = useRouter();

  const [cvId, setCvId] = useState<string | null>(null);
  const [hasCv, setHasCv] = useState(false);
  const [initLoading, setInitLoading] = useState(true);

  const [matches, setMatches] = useState<MatchedJob[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string>("");
  const [useCustomJob, setUseCustomJob] = useState(false);
  const [customJobDescription, setCustomJobDescription] = useState("");
  const [tone, setTone] = useState(TONE_OPTIONS[0]);

  const [generating, setGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<string | null>(null);

  const [savedLetters, setSavedLetters] = useState<CoverLetter[]>([]);
  const [loadingSaved, setLoadingSaved] = useState(false);
  const [expandedLetterId, setExpandedLetterId] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
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

      setHasCv(Boolean(resolvedCvId));
      setCvId(resolvedCvId);

      if (resolvedCvId) {
        try {
          const res = await matchJobs(resolvedCvId, 10);
          setMatches(res.matches);
          if (res.matches.length > 0) setSelectedJobId(res.matches[0].id || "");
        } catch (err) {
          console.error("Failed to load matched jobs:", err);
        }
      }
      setInitLoading(false);
    };
    init();
  }, [user]);

  const fetchSavedLetters = async () => {
    if (!user) return;
    setLoadingSaved(true);
    try {
      const res = await getCoverLetters();
      setSavedLetters(res.data);
    } catch (err) {
      console.error("Failed to load saved cover letters:", err);
    } finally {
      setLoadingSaved(false);
    }
  };

  useEffect(() => {
    fetchSavedLetters();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const handleGenerate = async () => {
    if (!cvId) {
      toast.error("No CV found. Please upload your CV first.");
      return;
    }
    if (!useCustomJob && !selectedJobId) {
      toast.error("Select a job or switch to a custom job description.");
      return;
    }
    if (useCustomJob && !customJobDescription.trim()) {
      toast.error("Paste a job description first.");
      return;
    }

    setGenerating(true);
    setGeneratedContent(null);
    try {
      const result = await generateCoverLetter(cvId, {
        jobId: useCustomJob ? undefined : selectedJobId,
        jobDescription: useCustomJob ? customJobDescription : undefined,
        tone: tone.toLowerCase(),
      });
      setGeneratedContent(result.content);
      toast.success("Cover letter generated and saved!");
      fetchSavedLetters();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to generate cover letter");
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = (content: string) => {
    navigator.clipboard.writeText(content);
    toast.success("Copied to clipboard");
  };

  const handleDelete = async (letterId: string) => {
    const previous = savedLetters;
    setSavedLetters(prev => prev.filter(l => l.id !== letterId));
    try {
      await deleteCoverLetter(letterId);
      toast.success("Cover letter deleted");
    } catch {
      setSavedLetters(previous);
      toast.error("Failed to delete cover letter");
    }
  };

  if (initLoading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!hasCv) {
    return (
      <div className="space-y-6 max-w-3xl">
        <div className="p-8 bg-slate-900/30 border border-slate-800/80 rounded-2xl flex flex-col items-center text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-blue-950/20 border border-blue-500/20 flex items-center justify-center">
            <Mail className="w-8 h-8 text-blue-400" />
          </div>
          <h1 className="text-xl font-extrabold text-slate-100">Upload your CV to generate cover letters</h1>
          <p className="text-sm text-slate-400 max-w-lg mx-auto">
            We use your parsed resume data to write a personalized, job-specific cover letter.
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
    <div className="space-y-6 max-w-[1200px] animate-in fade-in duration-500">

      {/* Header */}
      <div className="p-5 bg-slate-900/30 border border-slate-800/80 rounded-2xl">
        <h1 className="text-xl font-extrabold text-slate-100 flex items-center gap-2">
          <Mail className="w-5 h-5 text-blue-400" /> AI Cover Letter Generator
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Generates a personalized cover letter from your parsed CV and a job description, using the same AI as your skill-gap analysis.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Left: Generator form */}
        <div className="col-span-12 lg:col-span-5 space-y-4">
          <div className="p-5 bg-slate-900/30 border border-slate-800/80 rounded-2xl space-y-4">
            <h3 className="text-sm font-bold text-slate-100">Target Job</h3>

            <div className="flex gap-2 text-xs">
              <button
                onClick={() => setUseCustomJob(false)}
                className={`flex-1 py-2 rounded-lg font-bold transition-colors ${!useCustomJob ? 'bg-blue-600 text-white' : 'bg-slate-900 text-slate-400 border border-slate-800'}`}
              >
                From Matches
              </button>
              <button
                onClick={() => setUseCustomJob(true)}
                className={`flex-1 py-2 rounded-lg font-bold transition-colors ${useCustomJob ? 'bg-blue-600 text-white' : 'bg-slate-900 text-slate-400 border border-slate-800'}`}
              >
                Paste Description
              </button>
            </div>

            {!useCustomJob ? (
              matches.length === 0 ? (
                <p className="text-xs text-slate-500">No matched jobs yet. Search jobs first, or paste a description instead.</p>
              ) : (
                <select
                  value={selectedJobId}
                  onChange={(e) => setSelectedJobId(e.target.value)}
                  className="w-full bg-slate-900/60 border border-slate-700/50 rounded-xl px-3 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-blue-500/50"
                >
                  {matches.map(job => (
                    <option key={job.id} value={job.id} className="bg-slate-900">
                      {job.job_title} at {job.company}
                    </option>
                  ))}
                </select>
              )
            ) : (
              <textarea
                value={customJobDescription}
                onChange={(e) => setCustomJobDescription(e.target.value)}
                placeholder="Paste the job description here..."
                rows={6}
                className="w-full bg-slate-900/60 border border-slate-700/50 rounded-xl p-3 text-xs text-slate-100 focus:outline-none focus:border-blue-500/50 resize-none"
              />
            )}

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tone</label>
              <select
                value={tone}
                onChange={(e) => setTone(e.target.value)}
                className="w-full bg-slate-900/60 border border-slate-700/50 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-blue-500/50"
              >
                {TONE_OPTIONS.map(t => (
                  <option key={t} value={t} className="bg-slate-900">{t}</option>
                ))}
              </select>
            </div>

            <button
              onClick={handleGenerate}
              disabled={generating}
              className="w-full py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 disabled:opacity-50 transition-colors shadow-lg shadow-blue-500/20"
            >
              {generating ? (
                <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Generating...</>
              ) : (
                <><Sparkles className="w-3.5 h-3.5" /> Generate Cover Letter</>
              )}
            </button>
          </div>
        </div>

        {/* Right: Generated content + saved letters */}
        <div className="col-span-12 lg:col-span-7 space-y-4">
          <div className="p-5 bg-slate-900/30 border border-slate-800/80 rounded-2xl min-h-[200px]">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-400" /> Generated Letter
              </h3>
              {generatedContent && (
                <button
                  onClick={() => handleCopy(generatedContent)}
                  className="flex items-center gap-1 text-[10px] text-blue-400 hover:text-blue-300 font-bold"
                >
                  <Copy className="w-3 h-3" /> Copy
                </button>
              )}
            </div>
            {generating ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                <p className="text-xs text-slate-400">Writing your personalized cover letter…</p>
              </div>
            ) : generatedContent ? (
              <div className="text-xs text-slate-300 leading-relaxed whitespace-pre-line">{generatedContent}</div>
            ) : (
              <p className="text-xs text-slate-500 text-center py-12">Fill in the form and click &quot;Generate Cover Letter&quot; to get started.</p>
            )}
          </div>

          {/* Saved letters list */}
          <div className="p-5 bg-slate-900/30 border border-slate-800/80 rounded-2xl space-y-3">
            <h3 className="text-sm font-bold text-slate-100">Saved Cover Letters {savedLetters.length > 0 && `(${savedLetters.length})`}</h3>
            {loadingSaved ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
              </div>
            ) : savedLetters.length === 0 ? (
              <p className="text-xs text-slate-500">No saved cover letters yet.</p>
            ) : (
              <div className="space-y-2">
                {savedLetters.map(letter => (
                  <div key={letter.id} className="rounded-xl bg-slate-900/40 border border-slate-800/80 overflow-hidden">
                    <div className="flex items-center justify-between gap-2 p-3">
                      <button
                        onClick={() => setExpandedLetterId(expandedLetterId === letter.id ? null : letter.id)}
                        className="flex items-center gap-2 text-left min-w-0 flex-1"
                      >
                        {expandedLetterId === letter.id ? <ChevronUp className="w-3.5 h-3.5 text-slate-500 shrink-0" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-500 shrink-0" />}
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-slate-200 truncate">{letter.title}</div>
                          <div className="text-[10px] text-slate-500">
                            {new Date(letter.created_at).toLocaleDateString(undefined, { dateStyle: "medium" })}
                          </div>
                        </div>
                      </button>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => handleCopy(letter.content)}
                          title="Copy"
                          className="p-1.5 rounded-lg text-slate-500 hover:text-blue-400 hover:bg-blue-500/10 transition-colors"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(letter.id)}
                          title="Delete"
                          className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                    {expandedLetterId === letter.id && (
                      <div className="px-3 pb-3 text-xs text-slate-300 leading-relaxed whitespace-pre-line border-t border-slate-800/60 pt-3">
                        {letter.content}
                      </div>
                    )}
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
