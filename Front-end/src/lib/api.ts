/**
 * Typed API client for the CareerPath AI FastAPI backend.
 * All functions use NEXT_PUBLIC_BACKEND_URL (defaults to localhost:8000).
 */

import { supabase } from "@/lib/supabase-browser";

const BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://127.0.0.1:8000";

/** Attaches the current Supabase session's access token so the backend can verify the caller. */
async function getAuthHeaders(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error("You must be signed in to do this.");
  }
  return { Authorization: `Bearer ${session.access_token}` };
}

// ── Types ──────────────────────────────────────────────────────────────────

export interface CVEducation {
  degree: string;
  institution: string;
  location?: string;
  dates?: string;
  highlights?: string;
}

export interface CVProject {
  title: string;
  tech_stack: string[];
  points: string[];
}

export interface CVSkills {
  languages: string[];
  frameworks: string[];
  databases: string[];
  ml_domain: string[];
}

export interface CVExperienceItem {
  title: string;
  company: string;
  location?: string;
  dates?: string;
  points: string[];
}

export interface CVCertification {
  title: string;
  issuer: string;
  date?: string;
}

export interface CVData {
  name: string;
  location?: string;
  phone?: string;
  email?: string;
  linkedin?: string;
  github?: string;
  summary?: string;
  skills: string[];
  skills_breakdown?: CVSkills;
  projects?: CVProject[];
  experience: string[];
  experience_details?: CVExperienceItem[];
  education: CVEducation[];
  certifications?: CVCertification[];
}

export interface ParsedCVResponse {
  status: string;
  extracted_data: CVData;
  cv_id?: string;
}

export interface Job {
  id?: string;
  adzuna_id?: string;
  job_title: string;
  company: string;
  location: string;
  clean_description: string;
  salary_min?: number;
  salary_max?: number;
  contract_time?: string;
  contract_type?: string;
  url?: string;
}

export interface JobsResponse {
  status: string;
  source: string;
  total_jobs: number;
  data: Job[];
}

export interface MatchedJob extends Job {
  similarity: number;
  match_percentage: number;
}

export interface MatchResponse {
  status: string;
  matches: MatchedJob[];
}

export interface MissingSkill {
  skill: string;
  importance: "High" | "Medium" | "Low";
  reason: string;
}

export interface SkillGapResponse {
  status: string;
  target_job_id: string;
  missing_skills: MissingSkill[];
}

export interface SavedJobEntry {
  id: string;
  created_at: string;
  jobs: Job;
}

export interface SavedJobsListResponse {
  status: string;
  data: SavedJobEntry[];
}

// ── Helpers ────────────────────────────────────────────────────────────────

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    try {
      const body = await res.json();
      detail = body?.detail || detail;
    } catch {}
    throw new Error(detail);
  }
  return res.json() as Promise<T>;
}

/** Reuses a cached sessionStorage response for `key` if present, otherwise runs `fetcher` and caches its result. */
async function withSessionCache<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
  if (typeof window !== "undefined") {
    const cached = sessionStorage.getItem(key);
    if (cached) return JSON.parse(cached);
  }
  const data = await fetcher();
  if (typeof window !== "undefined") {
    sessionStorage.setItem(key, JSON.stringify(data));
  }
  return data;
}

// ── CV ─────────────────────────────────────────────────────────────────────

/** Upload a PDF resume and get structured JSON + cv_id back. */
export async function parseResume(file: File): Promise<ParsedCVResponse> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${BASE_URL}/api/v1/parser/resume`, {
    method: "POST",
    headers: await getAuthHeaders(),
    body: formData,
  });
  return handleResponse<ParsedCVResponse>(res);
}

/** Retrieve parsed CV data from its ID. */
export async function getCV(cvId: string): Promise<CVData> {
  const res = await fetch(`${BASE_URL}/api/v1/parser/cv/${cvId}`, {
    headers: await getAuthHeaders(),
  });
  return handleResponse<CVData>(res);
}

/** Update parsed CV data by its ID. */
export async function updateCV(cvId: string, data: CVData): Promise<ParsedCVResponse> {
  const res = await fetch(`${BASE_URL}/api/v1/parser/cv/${cvId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...(await getAuthHeaders()) },
    body: JSON.stringify(data),
  });
  return handleResponse<ParsedCVResponse>(res);
}

// ── Jobs ───────────────────────────────────────────────────────────────────

/** Fetch jobs from Adzuna (with DB caching). */
export async function findJobs(
  query: string,
  location: string = "us",
  results: number = 10
): Promise<JobsResponse> {
  const params = new URLSearchParams({ query, location, results: String(results) });
  const res = await fetch(`${BASE_URL}/jobs/find?${params}`);
  return handleResponse<JobsResponse>(res);
}

/** Semantic job matching using a stored CV embedding. */
export async function matchJobs(cvId: string, limit: number = 10): Promise<MatchResponse> {
  return withSessionCache(`match_${cvId}_${limit}`, async () => {
    const res = await fetch(`${BASE_URL}/jobs/match`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(await getAuthHeaders()) },
      body: JSON.stringify({ cv_id: cvId, limit }),
    });
    return handleResponse<MatchResponse>(res);
  });
}

/** Save a job for the signed-in user. */
export async function saveJob(jobId: string): Promise<{ status: string; message: string }> {
  const res = await fetch(`${BASE_URL}/jobs/save`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(await getAuthHeaders()) },
    body: JSON.stringify({ job_id: jobId }),
  });
  return handleResponse(res);
}

/** Get all saved jobs for the signed-in user. */
export async function getSavedJobs(): Promise<SavedJobsListResponse> {
  const res = await fetch(`${BASE_URL}/jobs/saved`, {
    headers: await getAuthHeaders(),
  });
  return handleResponse<SavedJobsListResponse>(res);
}

/** Remove a saved job for the signed-in user. */
export async function unsaveJob(jobId: string): Promise<{ status: string; message: string }> {
  const params = new URLSearchParams({ job_id: jobId });
  const res = await fetch(`${BASE_URL}/jobs/unsave?${params}`, {
    method: "DELETE",
    headers: await getAuthHeaders(),
  });
  return handleResponse(res);
}

// ── Skills ─────────────────────────────────────────────────────────────────

/** Set the target job role for a CV. */
export async function setTargetRole(cvId: string, targetJobId: string): Promise<{ status: string; message: string }> {
  const res = await fetch(`${BASE_URL}/api/v1/skills/target-role`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...(await getAuthHeaders()) },
    body: JSON.stringify({ cv_id: cvId, target_job_id: targetJobId }),
  });
  return handleResponse(res);
}

/** Get the skill gap analysis for a CV vs its target job. */
export async function getSkillGapAnalysis(cvId: string): Promise<SkillGapResponse> {
  const res = await fetch(`${BASE_URL}/api/v1/skills/gap-analysis/${cvId}`, {
    headers: await getAuthHeaders(),
  });
  return handleResponse<SkillGapResponse>(res);
}

/** Get the skill gap analysis for a CV vs a custom job description. */
export async function getCustomSkillGapAnalysis(cvId: string, jobDescription: string): Promise<SkillGapResponse> {
  const res = await fetch(`${BASE_URL}/api/v1/skills/gap-analysis/custom`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(await getAuthHeaders()) },
    body: JSON.stringify({ cv_id: cvId, job_description: jobDescription }),
  });
  return handleResponse<SkillGapResponse>(res);
}

export interface Course {
  title: string;
  provider: string;
  url: string;
  difficulty: "Beginner" | "Intermediate" | "Advanced";
}

/** Get course recommendations based on missing skills. */
export async function getCourseRecommendations(skills: MissingSkill[]): Promise<{status: string, courses: Course[]}> {
  const fetcher = async () => {
    const res = await fetch(`${BASE_URL}/api/v1/skills/recommend-courses`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(await getAuthHeaders()) },
      body: JSON.stringify({ missing_skills: skills }),
    });
    return handleResponse<{status: string, courses: Course[]}>(res);
  };
  if (skills.length === 0) return fetcher();
  return withSessionCache(`courses_${skills.map(s => s.skill).join("_")}`, fetcher);
}
