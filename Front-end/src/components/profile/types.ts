// Form-state shapes for the profile editor. These use flat string fields
// (comma/newline-joined) for easy binding to text inputs; they are serialized
// to the API's structured shapes on save.

export interface FormProject {
  title: string;
  tech_stack: string;
  points: string;
}

export interface FormExperience {
  title: string;
  company: string;
  location: string;
  dates: string;
  points: string;
}

export interface FormEducation {
  degree: string;
  institution: string;
  location: string;
  dates: string;
  highlights: string;
}

export interface FormCert {
  title: string;
  issuer: string;
  date: string;
}

export type TabType = "bio" | "skills" | "projects" | "education";
