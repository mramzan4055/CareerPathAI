"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface SkillTagBuilderProps {
  label: string;
  skills: string[];
  setSkills: (skills: string[]) => void;
  icon: React.ReactNode;
  placeholder: string;
}

export function SkillTagBuilder({ label, skills, setSkills, icon, placeholder }: SkillTagBuilderProps) {
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
