"use client";

import { useState, useEffect } from "react";
import { useSupabaseAuth } from "@/providers/supabase-auth-provider";
import { supabase } from "@/lib/supabase-browser";
import { getCV, updateCV } from "@/lib/api";
import {
  User,
  Mail,
  Cpu,
  Loader2,
  Sparkles,
  Target,
  ArrowLeft,
  Phone,
  MapPin,
  Linkedin,
  Github,
  FileText,
  Printer,
  BookOpen,
  FolderKanban,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import Link from "next/link";
import { SkillTagBuilder } from "@/components/profile/skill-tag-builder";
import { ProjectsTab } from "@/components/profile/projects-tab";
import { EducationTab } from "@/components/profile/education-tab";
import type {
  FormProject,
  FormExperience,
  FormEducation,
  FormCert,
  TabType,
} from "@/components/profile/types";

// ── Main Profile Page Component ──────────────────────────────────────────
export default function ProfilePage() {
  const { user } = useSupabaseAuth();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>("bio");
  
  // ── Tab 1: Bio & Contact ──────────────────────────────────────────────────
  const [name, setName] = useState("");
  const [targetRole, setTargetRole] = useState("");
  const [location, setLocation] = useState("");
  const [phone, setPhone] = useState("");
  const [linkedin, setLinkedin] = useState("");
  const [github, setGithub] = useState("");
  const [summary, setSummary] = useState("");
  
  // ── Tab 2: Technical Skills (Arrays of strings now!) ──────────────────────
  const [languagesList, setLanguagesList] = useState<string[]>([]);
  const [frameworksList, setFrameworksList] = useState<string[]>([]);
  const [databasesList, setDatabasesList] = useState<string[]>([]);
  const [mlDomainList, setMlDomainList] = useState<string[]>([]);
  
  // ── Tab 3: Projects & Experience ──────────────────────────────────────────
  const [projectsList, setProjectsList] = useState<FormProject[]>([]);
  const [experienceList, setExperienceList] = useState<FormExperience[]>([]);
  
  // ── Tab 4: Education & Certifications ─────────────────────────────────────
  const [educationList, setEducationList] = useState<FormEducation[]>([]);
  const [certificationsList, setCertificationsList] = useState<FormCert[]>([]);
  
  const [cvId, setCvId] = useState<string | null>(null);

  useEffect(() => {
    const loadProfileData = async () => {
      if (!user) return;
      setLoading(true);
      
      try {
        // 1. Fetch user profile from database
        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .maybeSingle();

        if (profile) {
          setName(profile.name || "");
          setTargetRole(profile.target_role || "");
          setLocation(profile.location || "");
          setPhone(profile.phone || "");
          setLinkedin(profile.linkedin || "");
          setGithub(profile.github || "");
          setSummary(profile.summary || "");
          setCvId(profile.cv_id || null);

          // Deserialize projects if stored as JSON in profiles
          if (profile.projects) {
            try {
              setProjectsList(JSON.parse(profile.projects));
            } catch {
              setProjectsList([]);
            }
          }
          // Deserialize certifications if stored as JSON in profiles
          if (profile.certifications) {
            try {
              setCertificationsList(JSON.parse(profile.certifications));
            } catch {
              setCertificationsList([]);
            }
          }

          // Populate Skills from profile table first as a fallback
          if (profile.skills) {
            const list = profile.skills.split(",").map((s: string) => s.trim()).filter(Boolean);
            setLanguagesList(list);
          }

          // 2. Fetch linked CV data to sync and pre-fill form lists
          if (profile.cv_id) {
            const cvData = await getCV(profile.cv_id);
            if (cvData) {
              // Prefill base fields if they are missing on the profile
              if (!profile.name && cvData.name) setName(cvData.name);
              if (!profile.location && cvData.location) setLocation(cvData.location);
              if (!profile.phone && cvData.phone) setPhone(cvData.phone);
              if (!profile.linkedin && cvData.linkedin) setLinkedin(cvData.linkedin);
              if (!profile.github && cvData.github) setGithub(cvData.github);
              if (!profile.summary && cvData.summary) setSummary(cvData.summary);

              // Prefill skills breakdown (Languages, Frameworks, Databases, ML)
              if (cvData.skills_breakdown) {
                setLanguagesList(cvData.skills_breakdown.languages || []);
                setFrameworksList(cvData.skills_breakdown.frameworks || []);
                setDatabasesList(cvData.skills_breakdown.databases || []);
                setMlDomainList(cvData.skills_breakdown.ml_domain || []);
              } else if (cvData.skills && cvData.skills.length > 0) {
                setLanguagesList(cvData.skills);
              }

              // Prefill projects
              if (cvData.projects && cvData.projects.length > 0 && !profile.projects) {
                const formattedProjects = cvData.projects.map((p) => ({
                  title: p.title,
                  tech_stack: p.tech_stack.join(", "),
                  points: p.points.join("\n"),
                }));
                setProjectsList(formattedProjects);
              }

              // Prefill experience details
              if (cvData.experience_details && cvData.experience_details.length > 0) {
                const formattedExp = cvData.experience_details.map((exp) => ({
                  title: exp.title,
                  company: exp.company,
                  location: exp.location || "",
                  dates: exp.dates || "",
                  points: exp.points.join("\n"),
                }));
                setExperienceList(formattedExp);
              } else if (cvData.experience && cvData.experience.length > 0) {
                setExperienceList([{
                  title: "Professional Highlight",
                  company: "Previous Employer",
                  location: "",
                  dates: "",
                  points: cvData.experience.join("\n"),
                }]);
              }

              // Prefill education list
              if (cvData.education && cvData.education.length > 0) {
                const formattedEdu = cvData.education.map((edu) => ({
                  degree: edu.degree,
                  institution: edu.institution,
                  location: edu.location || "",
                  dates: edu.dates || "",
                  highlights: edu.highlights || "",
                }));
                setEducationList(formattedEdu);
              }

              // Prefill certifications
              if (cvData.certifications && cvData.certifications.length > 0 && !profile.certifications) {
                const formattedCerts = cvData.certifications.map((c) => ({
                  title: c.title,
                  issuer: c.issuer,
                  date: c.date || "",
                }));
                setCertificationsList(formattedCerts);
              }
            }
          }
        }
      } catch (err) {
        console.error("Failed to load profile details:", err);
        toast.error("Could not fetch profile details.");
      } finally {
        setLoading(false);
      }
    };

    loadProfileData();
  }, [user]);

  // ── Handlers for list fields ──────────────────────────────────────────────
  const handleAddProject = () => {
    setProjectsList([...projectsList, { title: "", tech_stack: "", points: "" }]);
  };
  const handleRemoveProject = (index: number) => {
    setProjectsList(projectsList.filter((_, i) => i !== index));
  };
  const handleProjectChange = (index: number, field: keyof FormProject, val: string) => {
    const updated = [...projectsList];
    updated[index] = { ...updated[index], [field]: val };
    setProjectsList(updated);
  };

  const handleAddExperience = () => {
    setExperienceList([...experienceList, { title: "", company: "", location: "", dates: "", points: "" }]);
  };
  const handleRemoveExperience = (index: number) => {
    setExperienceList(experienceList.filter((_, i) => i !== index));
  };
  const handleExperienceChange = (index: number, field: keyof FormExperience, val: string) => {
    const updated = [...experienceList];
    updated[index] = { ...updated[index], [field]: val };
    setExperienceList(updated);
  };

  const handleAddEducation = () => {
    setEducationList([...educationList, { degree: "", institution: "", location: "", dates: "", highlights: "" }]);
  };
  const handleRemoveEducation = (index: number) => {
    setEducationList(educationList.filter((_, i) => i !== index));
  };
  const handleEducationChange = (index: number, field: keyof FormEducation, val: string) => {
    const updated = [...educationList];
    updated[index] = { ...updated[index], [field]: val };
    setEducationList(updated);
  };

  const handleAddCert = () => {
    setCertificationsList([...certificationsList, { title: "", issuer: "", date: "" }]);
  };
  const handleRemoveCert = (index: number) => {
    setCertificationsList(certificationsList.filter((_, i) => i !== index));
  };
  const handleCertChange = (index: number, field: keyof FormCert, val: string) => {
    const updated = [...certificationsList];
    updated[index] = { ...updated[index], [field]: val };
    setCertificationsList(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setSaving(true);
    try {
      // 1. Serialize skills lists
      const combinedSkillsList = [
        ...languagesList,
        ...frameworksList,
        ...databasesList,
        ...mlDomainList
      ].filter(Boolean);

      const serializedSkills = combinedSkillsList.join(", ");
      const serializedEdu = educationList.map(e => `${e.degree} at ${e.institution}`).join("; ");
      const serializedExp = experienceList.flatMap(e => e.points.split("\n").map(p => p.trim()).filter(Boolean)).join("\n");

      // Save to public.profiles table
      const { error: profileError } = await supabase
        .from("profiles")
        .upsert({
          id: user.id,
          name,
          target_role: targetRole,
          phone,
          location,
          linkedin,
          github,
          summary,
          skills: serializedSkills,
          education: serializedEdu,
          experience: serializedExp,
          projects: JSON.stringify(projectsList),
          certifications: JSON.stringify(certificationsList),
          cv_id: cvId
        });
        
      if (profileError) throw profileError;

      // 2. Synchronize CV details if cv_id is linked
      if (cvId) {
        const payload = {
          name,
          location,
          phone,
          email: user.email || "",
          linkedin,
          github,
          summary,
          skills: combinedSkillsList,
          skills_breakdown: {
            languages: languagesList,
            frameworks: frameworksList,
            databases: databasesList,
            ml_domain: mlDomainList
          },
          projects: projectsList.map(p => ({
            title: p.title,
            tech_stack: p.tech_stack.split(",").map(s => s.trim()).filter(Boolean),
            points: p.points.split("\n").map(pt => pt.trim()).filter(Boolean)
          })),
          experience: serializedExp.split("\n").filter(Boolean),
          experience_details: experienceList.map(e => ({
            title: e.title,
            company: e.company,
            location: e.location,
            dates: e.dates,
            points: e.points.split("\n").map(pt => pt.trim()).filter(Boolean)
          })),
          education: educationList.map(edu => ({
            degree: edu.degree,
            institution: edu.institution,
            location: edu.location,
            dates: edu.dates,
            highlights: edu.highlights
          })),
          certifications: certificationsList.map(c => ({
            title: c.title,
            issuer: c.issuer,
            date: c.date
          }))
        };

        await updateCV(cvId, payload);
      }
      
      toast.success("Profile saved successfully!");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save profile";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Back button and Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button asChild variant="outline" className="border-slate-800 hover:border-slate-700 p-2.5 rounded-xl text-slate-400 hover:text-slate-200">
            <Link href="/dashboard">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-100 flex items-center gap-2">
              <User className="h-6 w-6 text-blue-400" /> Professional Profile
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Customize your profile details to dynamically update your AI matches and printable ATS CV.
            </p>
          </div>
        </div>
        
        {/* Printable ATS CV Actions */}
        <div className="flex items-center gap-2.5">
          <Button asChild className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl shadow-lg border-none">
            <Link href="/dashboard/profile/print" target="_blank">
              <Printer className="h-4 w-4 mr-2" /> Preview & Print ATS CV
            </Link>
          </Button>
        </div>
      </div>

      {/* Tabs list */}
      <div className="flex flex-wrap gap-2 border-b border-slate-800/80 pb-2">
        <button
          onClick={() => setActiveTab("bio")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
            activeTab === "bio"
              ? "bg-slate-900 text-blue-400 border border-blue-500/20"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/50"
          }`}
        >
          <User className="h-4 w-4" /> Bio & Contact
        </button>
        <button
          onClick={() => setActiveTab("skills")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
            activeTab === "skills"
              ? "bg-slate-900 text-purple-400 border border-purple-500/20"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/50"
          }`}
        >
          <Cpu className="h-4 w-4" /> Technical Skills
        </button>
        <button
          onClick={() => setActiveTab("projects")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
            activeTab === "projects"
              ? "bg-slate-900 text-cyan-400 border border-cyan-500/20"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/50"
          }`}
        >
          <FolderKanban className="h-4 w-4" /> Projects & Experience
        </button>
        <button
          onClick={() => setActiveTab("education")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
            activeTab === "education"
              ? "bg-slate-900 text-indigo-400 border border-indigo-500/20"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/50"
          }`}
        >
          <BookOpen className="h-4 w-4" /> Education & Certs
        </button>
      </div>

      <div className="bg-[#070b14]/65 border border-blue-500/10 rounded-2xl p-6 relative">
        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* ── Tab 1: Bio & Contact ── */}
          {activeTab === "bio" && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5 text-blue-400" /> Full Name
                  </label>
                  <Input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Muhammad Ramzan"
                    required
                    className="bg-slate-900/40 border-slate-800 text-slate-200 focus:border-blue-500/50 rounded-xl"
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5 text-slate-500" /> Email (Cannot be changed)
                  </label>
                  <Input
                    type="email"
                    value={user?.email || ""}
                    disabled
                    className="bg-slate-950/60 border-slate-900 text-slate-500 cursor-not-allowed rounded-xl"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Target className="h-3.5 w-3.5 text-cyan-400" /> Target Job Role
                  </label>
                  <Input
                    type="text"
                    value={targetRole}
                    onChange={(e) => setTargetRole(e.target.value)}
                    placeholder="e.g. AI Engineer"
                    className="bg-slate-900/40 border-slate-800 text-slate-200 focus:border-cyan-500/50 rounded-xl"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-emerald-400" /> Location (City, Country)
                  </label>
                  <Input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Lahore, Pakistan"
                    className="bg-slate-900/40 border-slate-800 text-slate-200 focus:border-emerald-500/50 rounded-xl"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5 text-teal-400" /> Phone Number
                  </label>
                  <Input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+92 300 1234567"
                    className="bg-slate-900/40 border-slate-800 text-slate-200 focus:border-teal-500/50 rounded-xl"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Linkedin className="h-3.5 w-3.5 text-blue-500" /> LinkedIn URL
                  </label>
                  <Input
                    type="text"
                    value={linkedin}
                    onChange={(e) => setLinkedin(e.target.value)}
                    placeholder="linkedin.com/in/username"
                    className="bg-slate-900/40 border-slate-800 text-slate-200 focus:border-blue-500/30 rounded-xl"
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Github className="h-3.5 w-3.5 text-slate-300" /> GitHub or Portfolio URL
                  </label>
                  <Input
                    type="text"
                    value={github}
                    onChange={(e) => setGithub(e.target.value)}
                    placeholder="github.com/username"
                    className="bg-slate-900/40 border-slate-800 text-slate-200 focus:border-slate-500/30 rounded-xl"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5 text-indigo-400" /> Professional Summary
                </label>
                <Textarea
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  placeholder="A 3 to 4 sentence elevator pitch. State your current role/status, core strengths, and achievements..."
                  rows={4}
                  className="bg-slate-900/40 border-slate-800 text-slate-200 focus:border-indigo-500/50 rounded-xl resize-none leading-relaxed"
                />
              </div>
            </div>
          )}

          {/* ── Tab 2: Technical Skills ── */}
          {activeTab === "skills" && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Interactive Tag inputs for Technical Skills breakdown */}
                <SkillTagBuilder
                  label="Languages"
                  skills={languagesList}
                  setSkills={setLanguagesList}
                  icon={<Cpu className="h-3.5 w-3.5 text-blue-400" />}
                  placeholder="e.g. Python, SQL, C++, TypeScript"
                />

                <SkillTagBuilder
                  label="Frameworks & Libraries"
                  skills={frameworksList}
                  setSkills={setFrameworksList}
                  icon={<Cpu className="h-3.5 w-3.5 text-purple-400" />}
                  placeholder="e.g. React, Next.js, Django, FastAPI"
                />

                <SkillTagBuilder
                  label="Databases & Tools"
                  skills={databasesList}
                  setSkills={setDatabasesList}
                  icon={<Cpu className="h-3.5 w-3.5 text-emerald-400" />}
                  placeholder="e.g. Docker, PostgreSQL, SQLite, Git, VS Code"
                />

                <SkillTagBuilder
                  label="Machine Learning / Domain"
                  skills={mlDomainList}
                  setSkills={setMlDomainList}
                  icon={<Cpu className="h-3.5 w-3.5 text-cyan-400" />}
                  placeholder="e.g. NLP, TensorFlow, Scikit-learn, REST APIs"
                />

              </div>
            </div>
          )}

          {/* ── Tab 3: Projects & Experience ── */}
          {activeTab === "projects" && (
            <ProjectsTab
              projectsList={projectsList}
              onAddProject={handleAddProject}
              onRemoveProject={handleRemoveProject}
              onProjectChange={handleProjectChange}
              experienceList={experienceList}
              onAddExperience={handleAddExperience}
              onRemoveExperience={handleRemoveExperience}
              onExperienceChange={handleExperienceChange}
            />
          )}

          {/* ── Tab 4: Education & Certifications ── */}
          {activeTab === "education" && (
            <EducationTab
              educationList={educationList}
              onAddEducation={handleAddEducation}
              onRemoveEducation={handleRemoveEducation}
              onEducationChange={handleEducationChange}
              certificationsList={certificationsList}
              onAddCert={handleAddCert}
              onRemoveCert={handleRemoveCert}
              onCertChange={handleCertChange}
            />
          )}

          {/* Form Actions */}
          <div className="flex items-center gap-3 pt-6 border-t border-slate-800/80">
            <Button
              type="submit"
              disabled={saving}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-xl px-6 py-5 border-none shadow-lg shadow-blue-500/20"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" /> Saving changes…
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" /> Save Profile Details
                </>
              )}
            </Button>
            
            <Button asChild variant="outline" className="border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200 rounded-xl py-5 px-6">
              <Link href="/dashboard">Cancel</Link>
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
