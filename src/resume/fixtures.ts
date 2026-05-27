import type { ResumeLibrary } from './types';

// Synthetic library exercising: a `&` in a title, a `%` + bold in a bullet,
// a project with a link, a default:false bullet, and all three sections.
export const fixtureLibrary: ResumeLibrary = {
  profile: {
    name: 'Ada Test',
    phone: '+1-000-000-0000',
    email: 'ada@example.com',
    links: [{ label: 'gh/ada', href: 'https://github.com/ada', icon: 'github' }],
  },
  skills: [{ category: 'Languages', items: ['Python', 'C++'] }],
  entries: [
    {
      id: 'lab',
      section: 'experience',
      title: 'R&D Lab',
      role: 'Developer',
      location: 'Edmonton',
      dateLabel: 'July 2025 - Sept 2025',
      bullets: [
        { id: 'a', text: 'Cut latency by **40%** in **Python**' },
        { id: 'b', text: 'A dropped bullet', default: false },
      ],
    },
    {
      id: 'sol',
      section: 'projects',
      title: 'SolShare',
      subtitle: 'Won at Hack the North',
      dateLabel: 'Sept 2025',
      links: [{ label: 'repo', href: 'https://github.com/x/sol' }],
      bullets: [{ id: 'a', text: 'Built an **iOS** app' }],
    },
    {
      id: 'uw',
      section: 'education',
      title: 'University of Waterloo',
      role: 'BSE',
      location: 'Waterloo',
      dateLabel: 'Sept 2024 - May 2029',
      bullets: [{ id: 'a', text: 'GPA: 3.90/4.00' }],
    },
  ],
};
