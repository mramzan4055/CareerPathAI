"use client";

import { Award, GraduationCap, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { FormEducation, FormCert } from "./types";

interface EducationTabProps {
  educationList: FormEducation[];
  onAddEducation: () => void;
  onRemoveEducation: (index: number) => void;
  onEducationChange: (index: number, field: keyof FormEducation, val: string) => void;
  certificationsList: FormCert[];
  onAddCert: () => void;
  onRemoveCert: (index: number) => void;
  onCertChange: (index: number, field: keyof FormCert, val: string) => void;
}

export function EducationTab({
  educationList,
  onAddEducation,
  onRemoveEducation,
  onEducationChange,
  certificationsList,
  onAddCert,
  onRemoveCert,
  onCertChange,
}: EducationTabProps) {
  return (
    <div className="space-y-8 animate-in fade-in duration-300">

      {/* Education section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
          <h3 className="text-sm font-bold text-slate-200 flex items-center gap-1.5">
            <GraduationCap className="h-4 w-4 text-indigo-400" /> Education History ({educationList.length})
          </h3>
          <Button type="button" onClick={onAddEducation} variant="outline" className="border-indigo-500/20 hover:border-indigo-500/40 text-indigo-400 hover:text-indigo-300 rounded-xl py-1 px-3 text-xs h-8">
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
                  onClick={() => onRemoveEducation(i)}
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
                      onChange={(e) => onEducationChange(i, "degree", e.target.value)}
                      placeholder="BS in Information Technology"
                      className="bg-slate-900/40 border-slate-800 text-slate-200 rounded-xl"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Institution</label>
                    <Input
                      type="text"
                      value={edu.institution}
                      onChange={(e) => onEducationChange(i, "institution", e.target.value)}
                      placeholder="The University of Lahore"
                      className="bg-slate-900/40 border-slate-800 text-slate-200 rounded-xl"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Location</label>
                    <Input
                      type="text"
                      value={edu.location}
                      onChange={(e) => onEducationChange(i, "location", e.target.value)}
                      placeholder="Lahore, Pakistan"
                      className="bg-slate-900/40 border-slate-800 text-slate-200 rounded-xl"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Dates (e.g. 2022 - 2026)</label>
                    <Input
                      type="text"
                      value={edu.dates}
                      onChange={(e) => onEducationChange(i, "dates", e.target.value)}
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
                    onChange={(e) => onEducationChange(i, "highlights", e.target.value)}
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
          <Button type="button" onClick={onAddCert} variant="outline" className="border-amber-500/20 hover:border-amber-500/40 text-amber-400 hover:text-amber-300 rounded-xl py-1 px-3 text-xs h-8">
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
                  onClick={() => onRemoveCert(i)}
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
                      onChange={(e) => onCertChange(i, "title", e.target.value)}
                      placeholder="AWS Certified Developer"
                      className="bg-slate-900/40 border-slate-800 text-slate-200 rounded-xl"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Issuing Organization</label>
                    <Input
                      type="text"
                      value={cert.issuer}
                      onChange={(e) => onCertChange(i, "issuer", e.target.value)}
                      placeholder="Amazon Web Services"
                      className="bg-slate-900/40 border-slate-800 text-slate-200 rounded-xl"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Date (Month Year)</label>
                    <Input
                      type="text"
                      value={cert.date}
                      onChange={(e) => onCertChange(i, "date", e.target.value)}
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
  );
}
