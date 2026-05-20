import type { ReactNode } from 'react';
import './ProjectPage.css';

export type ProjectStatus = 'shipped' | 'in-progress' | 'sunset';

export interface ProjectMeta {
  title: string;
  summary: string;
  year: string;
  role: string;
  stack: string[];
  status?: ProjectStatus;
  links?: { label: string; href: string }[];
}

interface Props {
  data: ProjectMeta;
  prev?: { slug: string; title: string } | null;
  next?: { slug: string; title: string } | null;
  children?: ReactNode;
}

/**
 * Blog-style project detail page.
 * - Header (year tag, italic title, summary)
 * - Meta block (role, stack, year, status, links)
 * - MDX body via children
 * - Foot navigation (back to index + prev/next)
 *
 * Wrap this in <Base> from an Astro page; pass the MDX <Content /> as children.
 */
export default function ProjectPage({ data, prev, next, children }: Props) {
  return (
    <article className="project-page">
      <div className="pp-container">
        <nav className="pp-topline" aria-label="breadcrumb">
          <a href="/" className="pp-back">← back to index</a>
          <span className="pp-loc">work / {data.title.toLowerCase()}</span>
        </nav>

        <header className="pp-header">
          <div className="pp-year">{data.year}</div>
          <h1 className="pp-title">{data.title}</h1>
          <p className="pp-summary">{data.summary}</p>
        </header>

        <div className="pp-meta">
          <div className="pp-meta-row">
            <span className="lbl">Role</span>
            <span>{data.role}</span>
          </div>
          <div className="pp-meta-row">
            <span className="lbl">Stack</span>
            <span>{data.stack.join(' · ')}</span>
          </div>
          <div className="pp-meta-row">
            <span className="lbl">Year</span>
            <span>{data.year}</span>
          </div>
          {data.status && (
            <div className="pp-meta-row">
              <span className="lbl">Status</span>
              <span>
                <span className="pp-status" data-status={data.status}>{data.status}</span>
              </span>
            </div>
          )}
          {data.links && data.links.length > 0 && (
            <div className="pp-meta-row">
              <span className="lbl">Links</span>
              <span>
                {data.links.map((l) => (
                  <a key={l.href} href={l.href} className="pp-link" target="_blank" rel="noreferrer">
                    {l.label}
                  </a>
                ))}
              </span>
            </div>
          )}
        </div>

        <div className="pp-body">{children}</div>

        <footer className="pp-foot">
          <a href="/" className="pp-back-foot">← back to index</a>
          <span>
            {prev && <a href={`/work/${prev.slug}`}>← {prev.title}</a>}
            {prev && next && <span style={{ padding: '0 12px' }}>·</span>}
            {next && <a href={`/work/${next.slug}`}>{next.title} →</a>}
          </span>
        </footer>
      </div>
    </article>
  );
}
