import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Stable-sorts jobs so that ones whose title matches one of the user's
 * career interests (case-insensitive substring match) come first, keeping
 * the original relative order within each group (e.g. existing match-score
 * ranking). No-op if there are no interests.
 */
export function sortJobsByInterest<T extends { job_title: string }>(jobs: T[], interests: string[]): T[] {
  const lowerInterests = interests.map(i => i.toLowerCase().trim()).filter(Boolean);
  if (lowerInterests.length === 0) return jobs;

  const matchesInterest = (job: T) => {
    const title = job.job_title.toLowerCase();
    return lowerInterests.some(interest => title.includes(interest));
  };

  return [...jobs].sort((a, b) => {
    const aMatch = matchesInterest(a) ? 0 : 1;
    const bMatch = matchesInterest(b) ? 0 : 1;
    return aMatch - bMatch;
  });
}
