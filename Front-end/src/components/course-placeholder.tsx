"use client";

import { BookOpen, ExternalLink, GraduationCap } from "lucide-react";
import type { MissingSkill } from "@/lib/api";

// Future API integration type
export interface Course {
  title: string;
  provider: string;
  url: string;
  difficulty: "Beginner" | "Intermediate" | "Advanced";
}

interface CoursePlaceholderProps {
  missingSkills: MissingSkill[];
  courses?: Course[];  // Ready for future API integration
}

const difficultyFromImportance = (importance: string): string => {
  switch (importance) {
    case "High": return "Advanced";
    case "Medium": return "Intermediate";
    default: return "Beginner";
  }
};

const difficultyColors: Record<string, { text: string; bg: string; border: string }> = {
  Advanced: { text: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/20" },
  Intermediate: { text: "text-orange-400", bg: "bg-orange-500/10", border: "border-orange-500/20" },
  Beginner: { text: "text-green-400", bg: "bg-green-500/10", border: "border-green-500/20" },
};

export function CoursePlaceholder({ missingSkills, courses }: CoursePlaceholderProps) {
  if (missingSkills.length === 0) return null;

  // `courses` prop present (even if empty) means the caller fetched real
  // recommendations. Only fall back to generated placeholders when no prop was
  // passed at all (legacy callers). An empty array => real API returned nothing.
  const usingRealCourses = courses !== undefined;

  if (usingRealCourses && courses!.length === 0) {
    return (
      <div className="space-y-3 mt-6 pt-6 border-t border-slate-800/60">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-amber-950/20 border border-amber-500/20 text-amber-400">
            <BookOpen className="h-4 w-4" />
          </div>
          <h3 className="text-sm font-bold text-slate-200">📚 Recommended Learning Resources</h3>
        </div>
        <p className="text-[11px] text-slate-500 text-center py-2">
          No specific course recommendations available right now — try again in a moment.
        </p>
      </div>
    );
  }

  const displayCourses: Course[] = usingRealCourses
    ? courses!
    : missingSkills.map((skill) => ({
        title: `Learn ${skill.skill}`,
        provider: "Search online courses",
        url: `https://www.coursera.org/search?query=${encodeURIComponent(skill.skill)}`,
        difficulty: difficultyFromImportance(skill.importance) as Course["difficulty"],
      }));

  return (
    <div className="space-y-4 mt-6 pt-6 border-t border-slate-800/60">
      {/* Section Header */}
      <div className="flex items-center gap-2">
        <div className="p-2 rounded-xl bg-amber-950/20 border border-amber-500/20 text-amber-400">
          <BookOpen className="h-4 w-4" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-slate-200 flex items-center gap-1.5">
            📚 Recommended Learning Resources
          </h3>
          <p className="text-[10px] text-slate-500">
            Courses to help you close the skill gaps identified above
          </p>
        </div>
      </div>

      {/* Course Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {displayCourses.map((course, i) => {
          const dc = difficultyColors[course.difficulty] || difficultyColors.Beginner;
          return (
            <div
              key={i}
              className="p-3.5 rounded-xl bg-slate-900/30 border border-slate-800/80 hover:border-amber-500/20 transition-all duration-200 space-y-2 group"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <GraduationCap className="h-3.5 w-3.5 text-amber-400 flex-shrink-0" />
                  <span className="text-xs font-bold text-slate-200 truncate">
                    {course.title}
                  </span>
                </div>
                <span
                  className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${dc.text} ${dc.bg} border ${dc.border} flex-shrink-0`}
                >
                  {course.difficulty}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[10px] text-slate-500 font-medium">
                  {course.provider}
                </span>
                <a
                  href={course.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-[10px] text-amber-400 hover:text-amber-300 font-semibold"
                >
                  View <ExternalLink className="h-2.5 w-2.5" />
                </a>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
