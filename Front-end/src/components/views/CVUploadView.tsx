"use client";

import { useState, useRef, useEffect } from "react";
import { parseResume, getCV, type CVData } from "@/lib/api";
import { useSupabaseAuth } from "@/providers/supabase-auth-provider";
import { supabase } from "@/lib/supabase-browser";
import { useRouter } from "next/navigation";
import {
  UploadCloud,
  FileText,
  Loader2,
  CheckCircle,
  AlertCircle,
  Sparkles,
  RotateCcw,
  Briefcase
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type UploadState = "idle" | "uploading" | "success" | "error";

export default function CVPage() {
  const { user } = useSupabaseAuth();
  const router = useRouter();
  
  const [state, setState] = useState<UploadState>("idle");
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [cvData, setCvData] = useState<CVData | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [initLoading, setInitLoading] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const checkExistingCV = async () => {
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
          setState("success");
        } catch (err) {
          console.error("Error fetching CV data:", err);
          localStorage.removeItem("cv_id");
        }
      }
      setInitLoading(false);
    };

    checkExistingCV();
  }, [user]);

  const handleFile = (file: File) => {
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      setErrorMsg("Only PDF files are supported.");
      setState("error");
      return;
    }
    setSelectedFile(file);
    setErrorMsg("");
    setState("idle");
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    setState("uploading");
    setErrorMsg("");

    try {
      const result = await parseResume(selectedFile);
      setCvData(result.extracted_data);
      
      if (result.cv_id) {
        localStorage.setItem("cv_id", result.cv_id);

        if (user) {
          try {
            const d = result.extracted_data;
            const cvSkills = d.skills?.join(", ") || "";
            const cvExperience = d.experience?.join("\n") || "";
            const cvEducation = d.education
              ?.map((e) => `${e.degree} at ${e.institution}`)
              .join("; ") || "";
            
            const cvProjects = d.projects
              ? JSON.stringify(d.projects.map((p) => ({
                  title: p.title || "",
                  tech_stack: Array.isArray(p.tech_stack) ? p.tech_stack.join(", ") : (p.tech_stack || ""),
                  points: Array.isArray(p.points) ? p.points.join("\n") : (p.points || ""),
                })))
              : null;
            
            const cvCertifications = d.certifications
              ? JSON.stringify(d.certifications.map((c) => ({
                  title: c.title || "",
                  issuer: c.issuer || "",
                  date: c.date || "",
                })))
              : null;

            await supabase
              .from("profiles")
              .upsert({
                id: user.id,
                cv_id: result.cv_id,
                name: d.name || "",
                location: d.location || "",
                phone: d.phone || "",
                linkedin: d.linkedin || "",
                github: d.github || "",
                summary: d.summary || "",
                skills: cvSkills,
                experience: cvExperience,
                education: cvEducation,
                projects: cvProjects,
                certifications: cvCertifications,
              });
          } catch (err) {
            console.error("Failed to sync CV data to profile:", err);
          }
        }
      }

      setState("success");
      toast.success("CV parsed successfully!");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to parse CV";
      setErrorMsg(msg);
      setState("error");
      toast.error(msg);
    }
  };

  const reset = async () => {
    localStorage.removeItem("cv_id");
    if (user) {
      try {
        await supabase
          .from("profiles")
          .update({ cv_id: null })
          .eq("id", user.id);
      } catch {}
    }
    setState("idle");
    setSelectedFile(null);
    setCvData(null);
    setErrorMsg("");
  };

  if (initLoading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-8 select-none animate-in fade-in duration-500 max-w-3xl">
      
      {/* CV Uploader Section */}
      <div className="flex flex-col md:flex-row gap-6 justify-between items-start md:items-end">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-100 flex items-center gap-2">
            <FileText className="h-6 w-6 text-blue-400" /> Resume / CV Management
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Upload your PDF and our AI will extract your career profile instantly.
          </p>
        </div>
        
        {state === "success" && (
          <button 
            onClick={reset}
            className="px-4 py-2 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-bold flex items-center gap-2 transition-colors"
          >
            <RotateCcw className="w-4 h-4" /> Upload Different CV
          </button>
        )}
      </div>

      {state !== "success" ? (
        <div className="max-w-3xl space-y-4">
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
            className={`relative flex flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed p-12 cursor-pointer transition-all duration-300 ${
              dragOver ? "border-blue-500 bg-blue-950/20" : "border-slate-700 hover:border-blue-500/50 hover:bg-slate-900/40 bg-slate-900/20"
            }`}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".pdf"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
            />
            <div className="h-16 w-16 rounded-2xl bg-blue-950/30 border border-blue-500/20 flex items-center justify-center">
              <UploadCloud className="h-8 w-8 text-blue-400" />
            </div>
            <div className="text-center">
              <p className="text-slate-200 font-semibold text-base">{dragOver ? "Drop it here!" : "Drag & drop your PDF here"}</p>
              <p className="text-slate-500 text-sm mt-1">or click to browse</p>
            </div>
            <p className="text-xs text-slate-600 border border-slate-800 px-3 py-1 rounded-full">PDF files only</p>
          </div>

          {selectedFile && (
            <div className="flex items-center justify-between p-4 rounded-xl bg-slate-900/40 border border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-950/20 border border-blue-500/20 text-blue-400">
                  <FileText className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-200">{selectedFile.name}</p>
                  <p className="text-xs text-slate-500">{(selectedFile.size / 1024).toFixed(1)} KB</p>
                </div>
              </div>
            </div>
          )}

          {errorMsg && (
            <div className="flex items-center gap-2 text-sm text-red-400 p-4 rounded-xl bg-red-500/10 border border-red-500/20">
              <AlertCircle className="h-4 w-4" /> {errorMsg}
            </div>
          )}

          <Button
            onClick={handleUpload}
            disabled={!selectedFile || state === "uploading"}
            className="w-full h-12 text-sm font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-lg shadow-blue-500/25"
          >
            {state === "uploading" ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing CV with AI...</>
            ) : "Extract & Save Profile"}
          </Button>
        </div>
      ) : (
        /* Success State */
        <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
          <div className="p-8 bg-slate-900/30 border border-slate-800/80 rounded-2xl flex flex-col items-center text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-green-400" />
            </div>
            
            <div className="space-y-2">
              <h2 className="text-xl font-extrabold text-slate-100">Profile Extracted Successfully!</h2>
              <p className="text-sm text-slate-400 max-w-lg mx-auto">
                Your CV data has been successfully parsed and linked to your profile. You can now use the ATS Resume Lab to optimize it, or head straight to Job Matches.
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full pt-4 border-t border-slate-800/60 mt-6">
              <div className="p-3 bg-slate-900/50 rounded-xl border border-slate-800">
                <div className="text-xs font-bold text-slate-500 uppercase">Skills Found</div>
                <div className="text-lg font-black text-slate-200">{cvData?.skills?.length || 0}</div>
              </div>
              <div className="p-3 bg-slate-900/50 rounded-xl border border-slate-800">
                <div className="text-xs font-bold text-slate-500 uppercase">Experiences</div>
                <div className="text-lg font-black text-slate-200">{cvData?.experience?.length || 0}</div>
              </div>
              <div className="p-3 bg-slate-900/50 rounded-xl border border-slate-800">
                <div className="text-xs font-bold text-slate-500 uppercase">Education</div>
                <div className="text-lg font-black text-slate-200">{cvData?.education?.length || 0}</div>
              </div>
              <div className="p-3 bg-slate-900/50 rounded-xl border border-slate-800">
                <div className="text-xs font-bold text-slate-500 uppercase">Projects</div>
                <div className="text-lg font-black text-slate-200">{cvData?.projects?.length || 0}</div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 w-full pt-4">
              <button 
                onClick={() => router.push("/dashboard/resume")}
                className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-500/20"
              >
                <Sparkles className="w-4 h-4" /> Open ATS Optimizer Lab
              </button>
              <button 
                onClick={() => router.push("/dashboard/jobs")}
                className="flex-1 py-3 rounded-xl bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-200 font-bold text-sm flex items-center justify-center gap-2 transition-all"
              >
                <Briefcase className="w-4 h-4" /> Find Job Matches
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
