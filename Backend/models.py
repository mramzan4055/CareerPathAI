# pyrefly: ignore [missing-import]
from typing import List, Optional

from pydantic import BaseModel


# CV Parser Models
class CVEducation(BaseModel):
    degree: str
    institution: str
    location: Optional[str] = ""
    dates: Optional[str] = ""
    highlights: Optional[str] = ""

class CVProject(BaseModel):
    title: str
    tech_stack: List[str] = []
    points: List[str] = []

class CVSkillsBreakdown(BaseModel):
    languages: List[str] = []
    frameworks: List[str] = []
    databases: List[str] = []
    ml_domain: List[str] = []

class CVExperienceItem(BaseModel):
    title: str
    company: str
    location: Optional[str] = ""
    dates: Optional[str] = ""
    points: List[str] = []

class CVCertification(BaseModel):
    title: str
    issuer: str
    date: Optional[str] = ""

class CVData(BaseModel):
    name: str
    location: Optional[str] = ""
    phone: Optional[str] = ""
    email: Optional[str] = ""
    linkedin: Optional[str] = ""
    github: Optional[str] = ""
    summary: Optional[str] = ""
    skills: List[str] = []
    skills_breakdown: Optional[CVSkillsBreakdown] = None
    projects: Optional[List[CVProject]] = []
    experience: List[str] = []
    experience_details: Optional[List[CVExperienceItem]] = []
    education: List[CVEducation] = []
    certifications: Optional[List[CVCertification]] = []

class CVResponse(BaseModel):
    status: str
    extracted_data: CVData
    cv_id: Optional[str] = None

# Job Fetcher Models
class CleanedJob(BaseModel):
    job_title: str
    company: str
    location: str
    clean_description: str

class JobResponse(BaseModel):
    status: str
    total_jobs: int
    data: List[CleanedJob]

# Job Matcher Models
class MatchRequest(BaseModel):
    cv_id: str
    limit: int = 5

class MatchedJob(CleanedJob):
    id: str
    similarity: float
    match_percentage: float

class MatchResponse(BaseModel):
    status: str
    matches: List[MatchedJob]

# Saved Jobs Models
class SaveJobRequest(BaseModel):
    job_id: str

class SavedJobResponse(BaseModel):
    status: str
    message: str

class SavedJobListResponse(BaseModel):
    status: str
    data: List[dict]

# Skill Gap Analysis Models
class UpdateTargetRoleRequest(BaseModel):
    cv_id: str
    target_job_id: str

class CustomGapRequest(BaseModel):
    cv_id: str
    job_description: str

class MissingSkill(BaseModel):
    skill: str
    importance: str
    reason: str

class SkillGapResponse(BaseModel):
    status: str
    target_job_id: str
    missing_skills: List[MissingSkill]

# Course Recommendation Models
class Course(BaseModel):
    title: str
    provider: str
    url: str
    difficulty: str

class RecommendCoursesRequest(BaseModel):
    missing_skills: List[MissingSkill]

class RecommendCoursesResponse(BaseModel):
    status: str
    courses: List[Course]

# Resume Review / ATS Score Models
class ResumeSuggestion(BaseModel):
    title: str
    description: str
    category: str
    priority: str

class ResumeReviewResponse(BaseModel):
    status: str
    cv_id: str
    ats_score: int
    suggestions: List[ResumeSuggestion]
