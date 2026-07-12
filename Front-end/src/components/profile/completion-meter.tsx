"use client";

export interface ProfileCompletionInput {
  name: string;
  targetRole: string;
  location: string;
  phone: string;
  linkedin: string;
  github: string;
  summary: string;
  skillsCount: number;
  projectsCount: number;
  educationCount: number;
  experienceCount: number;
}

export interface ProfileCompletionResult {
  percent: number;
  completedCount: number;
  totalCount: number;
  missingLabels: string[];
}

const CHECKS: Array<{ label: string; test: (input: ProfileCompletionInput) => boolean }> = [
  { label: "Full name", test: (i) => Boolean(i.name.trim()) },
  { label: "Target role", test: (i) => Boolean(i.targetRole.trim()) },
  { label: "Location", test: (i) => Boolean(i.location.trim()) },
  { label: "Phone number", test: (i) => Boolean(i.phone.trim()) },
  { label: "LinkedIn URL", test: (i) => Boolean(i.linkedin.trim()) },
  { label: "GitHub/portfolio URL", test: (i) => Boolean(i.github.trim()) },
  { label: "Professional summary", test: (i) => i.summary.trim().length > 20 },
  { label: "At least one skill", test: (i) => i.skillsCount > 0 },
  { label: "At least one project", test: (i) => i.projectsCount > 0 },
  { label: "At least one education entry", test: (i) => i.educationCount > 0 },
  { label: "At least one experience entry", test: (i) => i.experienceCount > 0 },
];

export function computeProfileCompletion(input: ProfileCompletionInput): ProfileCompletionResult {
  const missingLabels: string[] = [];
  let completedCount = 0;

  for (const check of CHECKS) {
    if (check.test(input)) {
      completedCount++;
    } else {
      missingLabels.push(check.label);
    }
  }

  return {
    percent: Math.round((completedCount / CHECKS.length) * 100),
    completedCount,
    totalCount: CHECKS.length,
    missingLabels,
  };
}

export function CompletionMeter({ result }: { result: ProfileCompletionResult }) {
  const { percent, missingLabels } = result;

  return (
    <div className="p-5 bg-slate-900/30 border border-slate-800/80 rounded-2xl space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Profile Completion</span>
        <span className="text-sm font-bold text-slate-100">{percent}%</span>
      </div>

      <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 transition-all duration-500"
          style={{ width: `${percent}%` }}
        />
      </div>

      {percent < 100 && missingLabels.length > 0 && (
        <p className="text-[11px] text-slate-500">
          Still missing: {missingLabels.slice(0, 3).join(", ")}
          {missingLabels.length > 3 ? `, +${missingLabels.length - 3} more` : ""}
        </p>
      )}
    </div>
  );
}
