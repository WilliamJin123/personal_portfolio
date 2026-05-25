export type Token =
  | { type: 'text'; value: string }
  | { type: 'bold'; value: string }
  | { type: 'link'; label: string; href: string };

export type ResumeSection = 'experience' | 'projects' | 'education';

export interface ResumeBullet {
  id: string;
  text: string;          // constrained markdown: **bold**, [label](href)
  tags?: string[];       // hand-entered relevance metadata (unused in Phase 1)
  default?: boolean;     // default true; included in a fresh tailoring
}

export interface ResumeEntry {
  id: string;
  section: ResumeSection;
  title: string;         // company / project / school
  role?: string;         // job title / degree
  dateLabel: string;     // e.g. "July 2025 - Sept 2025"
  location?: string;
  subtitle?: string;     // projects: context line (event / grant / "Personal Project")
  awards?: string[];     // wins/honors — amber trophy badges (UI) + \award (LaTeX)
  grants?: string[];     // funding/grants — green money badges (UI) + \grant (LaTeX)
  link?: { label: string; href: string };
  bullets: ResumeBullet[];
  include?: boolean;     // default true; in the résumé pool
}

export interface SkillGroup {
  category: string;      // "Languages"
  items: string[];       // ["Python", "Java", ...]
}

export interface Profile {
  name: string;
  phone?: string;
  email?: string;
  links: { label: string; href: string; icon?: 'linkedin' | 'github' }[];
}

export interface ResumeLibrary {
  profile: Profile;
  skills: SkillGroup[];
  entries: ResumeEntry[];
}

export interface Selection {
  entryIds: string[];                  // order matters
  bulletIds: Record<string, string[]>; // entryId -> ordered bulletIds
}
