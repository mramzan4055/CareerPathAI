"use client";

import { Briefcase, FolderKanban, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { FormProject, FormExperience } from "./types";

interface ProjectsTabProps {
  projectsList: FormProject[];
  onAddProject: () => void;
  onRemoveProject: (index: number) => void;
  onProjectChange: (index: number, field: keyof FormProject, val: string) => void;
  experienceList: FormExperience[];
  onAddExperience: () => void;
  onRemoveExperience: (index: number) => void;
  onExperienceChange: (index: number, field: keyof FormExperience, val: string) => void;
}

export function ProjectsTab({
  projectsList,
  onAddProject,
  onRemoveProject,
  onProjectChange,
  experienceList,
  onAddExperience,
  onRemoveExperience,
  onExperienceChange,
}: ProjectsTabProps) {
  return (
    <div className="space-y-8 animate-in fade-in duration-300">

      {/* Projects section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
          <h3 className="text-sm font-bold text-slate-200 flex items-center gap-1.5">
            <FolderKanban className="h-4 w-4 text-cyan-400" /> Projects ({projectsList.length})
          </h3>
          <Button type="button" onClick={onAddProject} variant="outline" className="border-cyan-500/20 hover:border-cyan-500/40 text-cyan-400 hover:text-cyan-300 rounded-xl py-1 px-3 text-xs h-8">
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
                  onClick={() => onRemoveProject(i)}
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
                      onChange={(e) => onProjectChange(i, "title", e.target.value)}
                      placeholder="Project Name"
                      className="bg-slate-900/40 border-slate-800 text-slate-200 rounded-xl"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tech Stack Used</label>
                    <Input
                      type="text"
                      value={project.tech_stack}
                      onChange={(e) => onProjectChange(i, "tech_stack", e.target.value)}
                      placeholder="e.g. Next.js, Python, PostgreSQL"
                      className="bg-slate-900/40 border-slate-800 text-slate-200 rounded-xl"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Bullet Points (One per line)</label>
                  <Textarea
                    value={project.points}
                    onChange={(e) => onProjectChange(i, "points", e.target.value)}
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
          <Button type="button" onClick={onAddExperience} variant="outline" className="border-emerald-500/20 hover:border-emerald-500/40 text-emerald-400 hover:text-emerald-300 rounded-xl py-1 px-3 text-xs h-8">
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
                  onClick={() => onRemoveExperience(i)}
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
                      onChange={(e) => onExperienceChange(i, "title", e.target.value)}
                      placeholder="Software Engineer Intern"
                      className="bg-slate-900/40 border-slate-800 text-slate-200 rounded-xl"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Company Name</label>
                    <Input
                      type="text"
                      value={exp.company}
                      onChange={(e) => onExperienceChange(i, "company", e.target.value)}
                      placeholder="Google Inc."
                      className="bg-slate-900/40 border-slate-800 text-slate-200 rounded-xl"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Location</label>
                    <Input
                      type="text"
                      value={exp.location}
                      onChange={(e) => onExperienceChange(i, "location", e.target.value)}
                      placeholder="Silicon Valley, USA"
                      className="bg-slate-900/40 border-slate-800 text-slate-200 rounded-xl"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Dates (e.g. 2023 - 2024)</label>
                    <Input
                      type="text"
                      value={exp.dates}
                      onChange={(e) => onExperienceChange(i, "dates", e.target.value)}
                      placeholder="June 2023 - Present"
                      className="bg-slate-900/40 border-slate-800 text-slate-200 rounded-xl"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Bullet Points (One per line)</label>
                  <Textarea
                    value={exp.points}
                    onChange={(e) => onExperienceChange(i, "points", e.target.value)}
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
  );
}
