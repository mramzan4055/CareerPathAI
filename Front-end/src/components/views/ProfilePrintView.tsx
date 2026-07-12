"use client";

import { useState, useEffect } from "react";
import { useSupabaseAuth } from "@/providers/supabase-auth-provider";
import { supabase } from "@/lib/supabase-browser";
import { getCV } from "@/lib/api";
import { Loader2, Printer, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface PrintProject {
  title: string;
  tech_stack: string;
  points: string[];
}

interface PrintExperience {
  title: string;
  company: string;
  location: string;
  dates: string;
  points: string[];
}

interface PrintEducation {
  degree: string;
  institution: string;
  location: string;
  dates: string;
  highlights: string;
}

interface PrintCert {
  title: string;
  issuer: string;
  date: string;
}

export default function PrintCVPage() {
  const { user } = useSupabaseAuth();
  const [loading, setLoading] = useState(true);
  
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [phone, setPhone] = useState("");
  const [linkedin, setLinkedin] = useState("");
  const [github, setGithub] = useState("");
  const [summary, setSummary] = useState("");
  
  const [languages, setLanguages] = useState("");
  const [frameworks, setFrameworks] = useState("");
  const [databases, setDatabases] = useState("");
  const [mlDomain, setMlDomain] = useState("");
  
  const [projects, setProjects] = useState<PrintProject[]>([]);
  const [experience, setExperience] = useState<PrintExperience[]>([]);
  const [education, setEducation] = useState<PrintEducation[]>([]);
  const [certifications, setCertifications] = useState<PrintCert[]>([]);

  useEffect(() => {
    const loadCVData = async () => {
      if (!user) return;
      setLoading(true);
      
      try {
        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .maybeSingle();

        if (profile) {
          setName(profile.name || "");
          setLocation(profile.location || "");
          setPhone(profile.phone || "");
          setLinkedin(profile.linkedin || "");
          setGithub(profile.github || "");
          setSummary(profile.summary || "");

          // Load lists
          if (profile.projects) {
            try {
              const list = JSON.parse(profile.projects);
              setProjects(list.map((p: { title: string; tech_stack: string; points: string }) => ({
                title: p.title,
                tech_stack: p.tech_stack,
                points: p.points.split("\n").filter(Boolean)
              })));
            } catch {
              setProjects([]);
            }
          }
          if (profile.certifications) {
            try {
              setCertifications(JSON.parse(profile.certifications));
            } catch {
              setCertifications([]);
            }
          }

          // Load from active CV details
          if (profile.cv_id) {
            const cvData = await getCV(profile.cv_id);
            if (cvData) {
              if (!profile.name) setName(cvData.name);
              if (!profile.location) setLocation(cvData.location || "");
              if (!profile.phone) setPhone(cvData.phone || "");
              if (!profile.linkedin) setLinkedin(cvData.linkedin || "");
              if (!profile.github) setGithub(cvData.github || "");
              if (!profile.summary) setSummary(cvData.summary || "");

              if (cvData.skills_breakdown) {
                setLanguages(cvData.skills_breakdown.languages?.join(", ") || "");
                setFrameworks(cvData.skills_breakdown.frameworks?.join(", ") || "");
                setDatabases(cvData.skills_breakdown.databases?.join(", ") || "");
                setMlDomain(cvData.skills_breakdown.ml_domain?.join(", ") || "");
              }

              if (cvData.projects && cvData.projects.length > 0 && !profile.projects) {
                setProjects(cvData.projects.map(p => ({
                  title: p.title,
                  tech_stack: p.tech_stack.join(", "),
                  points: p.points
                })));
              }

              if (cvData.experience_details && cvData.experience_details.length > 0) {
                setExperience(cvData.experience_details.map(e => ({
                  title: e.title,
                  company: e.company,
                  location: e.location || "",
                  dates: e.dates || "",
                  points: e.points
                })));
              }

              if (cvData.education && cvData.education.length > 0) {
                setEducation(cvData.education.map(e => ({
                  degree: e.degree,
                  institution: e.institution,
                  location: e.location || "",
                  dates: e.dates || "",
                  highlights: e.highlights || ""
                })));
              }

              if (cvData.certifications && cvData.certifications.length > 0 && !profile.certifications) {
                setCertifications(cvData.certifications.map(c => ({
                  title: c.title,
                  issuer: c.issuer,
                  date: c.date || ""
                })));
              }
            }
          }
        }
      } catch (err) {
        console.error("Failed to load CV for print:", err);
      } finally {
        setLoading(false);
      }
    };

    loadCVData();
  }, [user]);

  // Trigger print dialog automatically after component renders with loaded data
  useEffect(() => {
    if (!loading && name) {
      const timer = setTimeout(() => {
        window.print();
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [loading, name]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-3 text-slate-300">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        <p className="text-sm font-semibold">Generating print preview...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-black font-serif text-[11pt] leading-normal relative p-6 max-w-[8.5in] mx-auto print:p-0">
      
      {/* Print-specific media styles */}
      <style jsx global>{`
        @media print {
          body {
            background-color: white !important;
            color: black !important;
          }
          @page {
            size: letter;
            margin: 0.5in;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* Floating Action Bar (Hidden on print) */}
      <div className="no-print fixed bottom-6 right-6 bg-slate-900 border border-slate-800 p-3 rounded-2xl flex items-center gap-3 shadow-2xl z-50">
        <Button asChild variant="outline" className="border-slate-800 hover:border-slate-700 bg-slate-950 text-slate-400 hover:text-slate-200 rounded-xl">
          <Link href="/dashboard/profile">
            <ArrowLeft className="h-4 w-4 mr-1.5" /> Back to Edit
          </Link>
        </Button>
        <Button onClick={() => window.print()} className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl border-none">
          <Printer className="h-4 w-4 mr-1.5" /> Save PDF / Print
        </Button>
      </div>

      {/* Header Info */}
      <header className="text-center space-y-2 mb-6">
        <h1 className="text-2xl font-bold uppercase tracking-wider">{name || "Your Name"}</h1>
        <div className="text-[10pt] text-slate-700 space-y-1">
          <p>
            {location && `📍 ${location}`}
            {phone && ` | 📞 ${phone}`}
            {user?.email && ` | ✉️ ${user.email}`}
          </p>
          <p>
            {linkedin && `🔗 ${linkedin}`}
            {github && ` | 💻 ${github}`}
          </p>
        </div>
      </header>

      {/* Professional Summary */}
      {summary && (
        <section className="space-y-1.5 mb-5">
          <h2 className="text-[11pt] font-bold uppercase tracking-wide border-b border-black pb-0.5">
            Professional Summary
          </h2>
          <p className="text-[10pt] text-slate-800 text-justify leading-relaxed">{summary}</p>
        </section>
      )}

      {/* Technical Skills */}
      {(languages || frameworks || databases || mlDomain) && (
        <section className="space-y-2 mb-5">
          <h2 className="text-[11pt] font-bold uppercase tracking-wide border-b border-black pb-0.5">
            Technical Skills
          </h2>
          <div className="text-[10pt] text-slate-800 space-y-1">
            {languages && <p><strong>Languages:</strong> {languages}</p>}
            {frameworks && <p><strong>Frameworks & Libraries:</strong> {frameworks}</p>}
            {databases && <p><strong>Databases & Tools:</strong> {databases}</p>}
            {mlDomain && <p><strong>Machine Learning / Domain:</strong> {mlDomain}</p>}
          </div>
        </section>
      )}

      {/* Projects */}
      {projects.length > 0 && (
        <section className="space-y-2.5 mb-5">
          <h2 className="text-[11pt] font-bold uppercase tracking-wide border-b border-black pb-0.5">
            Projects
          </h2>
          <div className="space-y-3">
            {projects.map((proj, i) => (
              <div key={i} className="text-[10pt] space-y-1">
                <div className="flex justify-between font-bold text-slate-900">
                  <span>{proj.title}</span>
                  <span className="font-normal text-slate-600 text-[9pt] italic">{proj.tech_stack}</span>
                </div>
                <ul className="list-disc pl-5 text-[9.5pt] text-slate-800 space-y-0.5">
                  {proj.points.map((pt, idx) => (
                    <li key={idx} className="leading-snug">{pt}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Experience */}
      {experience.length > 0 && (
        <section className="space-y-2.5 mb-5">
          <h2 className="text-[11pt] font-bold uppercase tracking-wide border-b border-black pb-0.5">
            Experience
          </h2>
          <div className="space-y-3">
            {experience.map((exp, i) => (
              <div key={i} className="text-[10pt] space-y-1">
                <div className="flex justify-between font-bold text-slate-900">
                  <span>{exp.title} | {exp.company}</span>
                  <span className="font-semibold text-slate-600 text-[9pt]">
                    {exp.location && `${exp.location} | `}{exp.dates}
                  </span>
                </div>
                <ul className="list-disc pl-5 text-[9.5pt] text-slate-800 space-y-0.5">
                  {exp.points.map((pt, idx) => (
                    <li key={idx} className="leading-snug">{pt}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Education */}
      {education.length > 0 && (
        <section className="space-y-2.5 mb-5">
          <h2 className="text-[11pt] font-bold uppercase tracking-wide border-b border-black pb-0.5">
            Education
          </h2>
          <div className="space-y-2.5">
            {education.map((edu, i) => (
              <div key={i} className="text-[10pt] space-y-0.5">
                <div className="flex justify-between font-bold text-slate-900">
                  <span>{edu.degree} | {edu.institution}</span>
                  <span className="font-semibold text-slate-600 text-[9pt]">
                    {edu.location && `${edu.location} | `}{edu.dates}
                  </span>
                </div>
                {edu.highlights && (
                  <p className="text-[9.5pt] text-slate-700 italic pl-2">
                    Academic Highlights: {edu.highlights}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Certifications */}
      {certifications.length > 0 && (
        <section className="space-y-1.5 mb-5">
          <h2 className="text-[11pt] font-bold uppercase tracking-wide border-b border-black pb-0.5">
            Certifications
          </h2>
          <ul className="list-disc pl-5 text-[9.5pt] text-slate-800 space-y-0.5">
            {certifications.map((c, i) => (
              <li key={i} className="leading-snug">
                <strong>{c.title}</strong> – {c.issuer} {c.date && `(${c.date})`}
              </li>
            ))}
          </ul>
        </section>
      )}

    </div>
  );
}
