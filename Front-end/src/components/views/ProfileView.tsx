"use client";

import { useState, useEffect } from "react";
import { useSupabaseAuth } from "@/providers/supabase-auth-provider";
import { supabase } from "@/lib/supabase-browser";
import { getCV, updateCV } from "@/lib/api";
import {
  User,
  Mail,
  GraduationCap,
  Briefcase,
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
  Plus,
  Trash2,
  Printer,
  BookOpen,
  FolderKanban,
  Award,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import Link from "next/link";

interface FormProject {
  title: string;
  tech_stack: string;
  points: string;
}

interface FormExperience {
  title: string;
  company: string;
  location: string;
  dates: string;
  points: string;
}

interface FormEducation {
  degree: string;
  institution: string;
  location: string;
  dates: string;
  highlights: string;
}

interface FormCert {
  title: string;
  issuer: string;
  date: string;
}

type TabType = "bio" | "skills" | "projects" | "education";

// ── Interactive Skills Chip Sub-component ───────────────────────────────
interface SkillTagBuilderProps {
  label: string;
  skills: string[];
  setSkills: (skills: string[]) => void;
  icon: React.ReactNode;
  placeholder: string;
}

function SkillTagBuilder({ label, skills, setSkills, icon, placeholder }: SkillTagBuilderProps) {
  const [inputValue, setInputValue] = useState("");

  const handleAddSkill = () => {
    const trimmed = inputValue.trim();
    if (trimmed && !skills.includes(trimmed)) {
      setSkills([...skills, trimmed]);
      setInputValue("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddSkill();
    }
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    setSkills(skills.filter(s => s !== skillToRemove));
  };

  return (
    <div className="space-y-2 bg-slate-900/10 border border-slate-800/40 p-4 rounded-xl">
      <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
        {icon} {label}
      </label>
      
      {/* Dynamic Skill Chips list */}
      <div className="flex flex-wrap gap-1.5 min-h-[45px] p-2 rounded-xl bg-slate-950/40 border border-slate-900">
        {skills.length === 0 ? (
          <span className="text-xs text-slate-600 my-auto pl-1">
            No skills added. Type in the input below to add some.
          </span>
        ) : (
          skills.map((skill, idx) => (
            <span
              key={idx}
              className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800 text-slate-300 hover:border-red-500/30 hover:text-red-400 cursor-pointer transition-all duration-200"
              onClick={() => handleRemoveSkill(skill)}
              title="Click to remove"
            >
              {skill}
              <X className="h-3 w-3 opacity-60 group-hover:opacity-100" />
            </span>
          ))
        )}
      </div>

      {/* Inputs */}
      <div className="flex gap-2">
        <Input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="bg-slate-900/40 border-slate-800 text-slate-200 focus:border-blue-500/50 rounded-xl"
        />
        <Button
          type="button"
          onClick={handleAddSkill}
          className="bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 rounded-xl px-4"
        >
          Add
        </Button>
      </div>
    </div>
  );
}

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
            <div className="space-y-8 animate-in fade-in duration-300">
              
              {/* Projects section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                  <h3 className="text-sm font-bold text-slate-200 flex items-center gap-1.5">
                    <FolderKanban className="h-4 w-4 text-cyan-400" /> Projects ({projectsList.length})
                  </h3>
                  <Button type="button" onClick={handleAddProject} variant="outline" className="border-cyan-500/20 hover:border-cyan-500/40 text-cyan-400 hover:text-cyan-300 rounded-xl py-1 px-3 text-xs h-8">
                    <Plus className="h-3.5 w-3.5 mr-1" /> Add Project
                  </Button>
                </div>

                {projectsList.length === 0 ? (
                  <p className="text-xs text-slate-500">No projects added yet.</p>
                ) : (
                  <div className="space-y-4">
                    {projectsList.map((project, i) => (
                      <div key={i} className="bg-slate-900/20 border border-slate-800 p-4 rounded-xl space-y-4 relative">
                        <Button
                          type="button"
                          onClick={() => handleRemoveProject(i)}
                          variant="ghost"
                          className="absolute top-2 right-2 text-slate-500 hover:text-red-400 h-8 w-8 p-0"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pr-8">
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Project Title</label>
                            <Input
                              type="text"
                              value={project.title}
                              onChange={(e) => handleProjectChange(i, "title", e.target.value)}
                              placeholder="Project Name"
                              className="bg-slate-900/40 border-slate-800 text-slate-200 rounded-xl"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tech Stack Used</label>
                            <Input
                              type="text"
                              value={project.tech_stack}
                              onChange={(e) => handleProjectChange(i, "tech_stack", e.target.value)}
                              placeholder="e.g. Next.js, Python, PostgreSQL"
                              className="bg-slate-900/40 border-slate-800 text-slate-200 rounded-xl"
                            />
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Bullet Points (One per line)</label>
                          <Textarea
                            value={project.points}
                            onChange={(e) => handleProjectChange(i, "points", e.target.value)}
                            placeholder="[Action Verb] + [What you built] using [specific tools] to achieve [metric/goal]..."
                            rows={3}
                            className="bg-slate-900/40 border-slate-800 text-slate-200 rounded-xl resize-none"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Experience Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                  <h3 className="text-sm font-bold text-slate-200 flex items-center gap-1.5">
                    <Briefcase className="h-4 w-4 text-emerald-400" /> Work & Internships ({experienceList.length})
                  </h3>
                  <Button type="button" onClick={handleAddExperience} variant="outline" className="border-emerald-500/20 hover:border-emerald-500/40 text-emerald-400 hover:text-emerald-300 rounded-xl py-1 px-3 text-xs h-8">
                    <Plus className="h-3.5 w-3.5 mr-1" /> Add Experience
                  </Button>
                </div>

                {experienceList.length === 0 ? (
                  <p className="text-xs text-slate-500">No work experience listed yet.</p>
                ) : (
                  <div className="space-y-4">
                    {experienceList.map((exp, i) => (
                      <div key={i} className="bg-slate-900/20 border border-slate-800 p-4 rounded-xl space-y-4 relative">
                        <Button
                          type="button"
                          onClick={() => handleRemoveExperience(i)}
                          variant="ghost"
                          className="absolute top-2 right-2 text-slate-500 hover:text-red-400 h-8 w-8 p-0"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pr-8">
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Job Title</label>
                            <Input
                              type="text"
                              value={exp.title}
                              onChange={(e) => handleExperienceChange(i, "title", e.target.value)}
                              placeholder="Software Engineer Intern"
                              className="bg-slate-900/40 border-slate-800 text-slate-200 rounded-xl"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Company Name</label>
                            <Input
                              type="text"
                              value={exp.company}
                              onChange={(e) => handleExperienceChange(i, "company", e.target.value)}
                              placeholder="Google Inc."
                              className="bg-slate-900/40 border-slate-800 text-slate-200 rounded-xl"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Location</label>
                            <Input
                              type="text"
                              value={exp.location}
                              onChange={(e) => handleExperienceChange(i, "location", e.target.value)}
                              placeholder="Silicon Valley, USA"
                              className="bg-slate-900/40 border-slate-800 text-slate-200 rounded-xl"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Dates (e.g. 2023 - 2024)</label>
                            <Input
                              type="text"
                              value={exp.dates}
                              onChange={(e) => handleExperienceChange(i, "dates", e.target.value)}
                              placeholder="June 2023 - Present"
                              className="bg-slate-900/40 border-slate-800 text-slate-200 rounded-xl"
                            />
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Bullet Points (One per line)</label>
                          <Textarea
                            value={exp.points}
                            onChange={(e) => handleExperienceChange(i, "points", e.target.value)}
                            placeholder="[Action Verb] + [Core responsibility] resulting in [quantifiable improvement]..."
                            rows={3}
                            className="bg-slate-900/40 border-slate-800 text-slate-200 rounded-xl resize-none"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Tab 4: Education & Certifications ── */}
          {activeTab === "education" && (
            <div className="space-y-8 animate-in fade-in duration-300">
              
              {/* Education section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                  <h3 className="text-sm font-bold text-slate-200 flex items-center gap-1.5">
                    <GraduationCap className="h-4 w-4 text-indigo-400" /> Education History ({educationList.length})
                  </h3>
                  <Button type="button" onClick={handleAddEducation} variant="outline" className="border-indigo-500/20 hover:border-indigo-500/40 text-indigo-400 hover:text-indigo-300 rounded-xl py-1 px-3 text-xs h-8">
                    <Plus className="h-3.5 w-3.5 mr-1" /> Add Education
                  </Button>
                </div>

                {educationList.length === 0 ? (
                  <p className="text-xs text-slate-500">No education entries listed yet.</p>
                ) : (
                  <div className="space-y-4">
                    {educationList.map((edu, i) => (
                      <div key={i} className="bg-slate-900/20 border border-slate-800 p-4 rounded-xl space-y-4 relative">
                        <Button
                          type="button"
                          onClick={() => handleRemoveEducation(i)}
                          variant="ghost"
                          className="absolute top-2 right-2 text-slate-500 hover:text-red-400 h-8 w-8 p-0"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pr-8">
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Degree (e.g. BS in IT)</label>
                            <Input
                              type="text"
                              value={edu.degree}
                              onChange={(e) => handleEducationChange(i, "degree", e.target.value)}
                              placeholder="BS in Information Technology"
                              className="bg-slate-900/40 border-slate-800 text-slate-200 rounded-xl"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Institution</label>
                            <Input
                              type="text"
                              value={edu.institution}
                              onChange={(e) => handleEducationChange(i, "institution", e.target.value)}
                              placeholder="The University of Lahore"
                              className="bg-slate-900/40 border-slate-800 text-slate-200 rounded-xl"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Location</label>
                            <Input
                              type="text"
                              value={edu.location}
                              onChange={(e) => handleEducationChange(i, "location", e.target.value)}
                              placeholder="Lahore, Pakistan"
                              className="bg-slate-900/40 border-slate-800 text-slate-200 rounded-xl"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Dates (e.g. 2022 - 2026)</label>
                            <Input
                              type="text"
                              value={edu.dates}
                              onChange={(e) => handleEducationChange(i, "dates", e.target.value)}
                              placeholder="2022 - 2026"
                              className="bg-slate-900/40 border-slate-800 text-slate-200 rounded-xl"
                            />
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Academic Highlights (GPA, Electives)</label>
                          <Input
                            type="text"
                            value={edu.highlights}
                            onChange={(e) => handleEducationChange(i, "highlights", e.target.value)}
                            placeholder="e.g. Current CGPA: 3.82, Relevant courses: Database Systems, Machine Learning"
                            className="bg-slate-900/40 border-slate-800 text-slate-200 rounded-xl"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Certifications section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                  <h3 className="text-sm font-bold text-slate-200 flex items-center gap-1.5">
                    <Award className="h-4 w-4 text-amber-400" /> Certifications ({certificationsList.length})
                  </h3>
                  <Button type="button" onClick={handleAddCert} variant="outline" className="border-amber-500/20 hover:border-amber-500/40 text-amber-400 hover:text-amber-300 rounded-xl py-1 px-3 text-xs h-8">
                    <Plus className="h-3.5 w-3.5 mr-1" /> Add Certification
                  </Button>
                </div>

                {certificationsList.length === 0 ? (
                  <p className="text-xs text-slate-500">No certifications added yet.</p>
                ) : (
                  <div className="space-y-4">
                    {certificationsList.map((cert, i) => (
                      <div key={i} className="bg-slate-900/20 border border-slate-800 p-4 rounded-xl space-y-4 relative">
                        <Button
                          type="button"
                          onClick={() => handleRemoveCert(i)}
                          variant="ghost"
                          className="absolute top-2 right-2 text-slate-500 hover:text-red-400 h-8 w-8 p-0"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pr-8">
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Certification Title</label>
                            <Input
                              type="text"
                              value={cert.title}
                              onChange={(e) => handleCertChange(i, "title", e.target.value)}
                              placeholder="AWS Certified Developer"
                              className="bg-slate-900/40 border-slate-800 text-slate-200 rounded-xl"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Issuing Organization</label>
                            <Input
                              type="text"
                              value={cert.issuer}
                              onChange={(e) => handleCertChange(i, "issuer", e.target.value)}
                              placeholder="Amazon Web Services"
                              className="bg-slate-900/40 border-slate-800 text-slate-200 rounded-xl"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Date (Month Year)</label>
                            <Input
                              type="text"
                              value={cert.date}
                              onChange={(e) => handleCertChange(i, "date", e.target.value)}
                              placeholder="October 2024"
                              className="bg-slate-900/40 border-slate-800 text-slate-200 rounded-xl"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
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
