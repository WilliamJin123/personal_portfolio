import type { ResumeLibrary, Selection } from './types';

// JD keyword diff: given a job description, report which of its tech terms the
// résumé already carries (and where), which exist in the library but are off
// the PDFs by default (a selection tweak away), and which are missing outright.
// Matching is literal-with-aliases on purpose — the whole point is to see the
// résumé the way a dumb ATS matcher does, so nothing here "understands" that
// AI/ML implies Machine Learning.

export interface Term {
  name: string;
  aliases?: string[];
}

export type TermStatus = 'on-page' | 'in-library' | 'missing';

export interface TermReport {
  term: string;
  /** occurrences across the JD, all aliases summed */
  count: number;
  status: TermStatus;
  /** chunk labels that matched, e.g. "skills", "bullet:jindon/tests (off)" */
  where: string[];
}

interface Chunk {
  text: string;
  where: string;
  onPage: boolean;
}

// Word-ish boundaries that survive tech spellings: "java" must not hit
// "javascript", "c++" must not hit "libc++", but "node.js," and "(rag)" match.
// `+`/`#` count as word chars so "c" never bleeds out of "c++"/"c#".
function termRegex(alias: string): RegExp {
  const esc = alias.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
  return new RegExp(`(?<![a-z0-9+#])${esc}(?![a-z0-9+#])`, 'gi');
}

function matches(alias: string, text: string): number {
  return text.match(termRegex(alias))?.length ?? 0;
}

// Skill items like "LLM APIs (Anthropic Claude, OpenAI, etc.)" carry terms in
// the parenthetical — explode them so each vendor matches on its own.
function explodeSkillItem(item: string): string[] {
  const m = item.match(/^(.+?) \((.+)\)$/);
  if (!m) return [item];
  const inner = m[2]
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s && s !== 'etc.');
  return [m[1], ...inner];
}

/**
 * Flatten the library into searchable chunks. `selections` are the variants'
 * default selections; content selected by ANY of them counts as on-page,
 * everything else in the library counts as reachable ("in-library").
 */
export function searchableChunks(lib: ResumeLibrary, selections: Selection[]): Chunk[] {
  const chunks: Chunk[] = lib.skills.map((g) => ({
    text: `${g.category}: ${g.items.join(' ')}`,
    where: 'skills',
    onPage: true,
  }));
  for (const e of lib.entries) {
    const entryOn = selections.some((s) => s.entryIds.includes(e.id));
    const header = [e.title, e.role, e.subtitle, ...(e.awards ?? []), ...(e.grants ?? [])]
      .filter(Boolean)
      .join(' | ');
    chunks.push({ text: header, where: `entry:${e.id}`, onPage: entryOn });
    for (const b of e.bullets) {
      const bulletOn = entryOn && selections.some((s) => s.bulletIds[e.id]?.includes(b.id));
      chunks.push({
        text: b.text.replace(/\*\*/g, ''),
        where: `bullet:${e.id}/${b.id}${bulletOn ? '' : ' (off)'}`,
        onPage: bulletOn,
      });
    }
  }
  return chunks;
}

/** Terms already on the résumé — every skills item, exploded. */
export function libraryTerms(lib: ResumeLibrary): Term[] {
  return lib.skills.flatMap((g) => g.items.flatMap(explodeSkillItem)).map((name) => ({ name }));
}

// Common JD vocabulary beyond what the résumé lists — this is where the gaps
// show up. Aliases are deliberately conservative: no bare "go"/"rest"/"c"
// (English-word noise); spelled-out forms match their acronyms and vice versa.
export const COMMON_JD_TERMS: Term[] = [
  { name: 'Machine Learning', aliases: ['machine learning'] },
  { name: 'Artificial Intelligence', aliases: ['artificial intelligence'] },
  { name: 'Deep Learning', aliases: ['deep learning', 'neural network', 'neural networks'] },
  { name: 'NLP', aliases: ['nlp', 'natural language processing'] },
  { name: 'Computer Vision', aliases: ['computer vision'] },
  { name: 'LLM', aliases: ['llm', 'llms', 'large language model', 'large language models'] },
  { name: 'GenAI', aliases: ['genai', 'generative ai'] },
  { name: 'RAG', aliases: ['rag', 'retrieval-augmented generation', 'retrieval augmented generation'] },
  { name: 'AI Agents', aliases: ['ai agents', 'ai agent', 'agentic', 'multi-agent'] },
  { name: 'Prompt Engineering', aliases: ['prompt engineering'] },
  { name: 'Fine-Tuning', aliases: ['fine-tuning', 'fine tuning', 'finetuning'] },
  { name: 'Embeddings', aliases: ['embedding', 'embeddings'] },
  { name: 'Semantic Search', aliases: ['semantic search'] },
  { name: 'Backend', aliases: ['backend', 'back-end', 'back end'] },
  { name: 'Frontend', aliases: ['frontend', 'front-end', 'front end'] },
  { name: 'Vector Search', aliases: ['vector search', 'vector database', 'vector db', 'pgvector'] },
  { name: 'Evals', aliases: ['evals', 'llm evaluation', 'model evaluation'] },
  { name: 'MLOps', aliases: ['mlops'] },
  { name: 'TensorFlow', aliases: ['tensorflow'] },
  { name: 'Keras', aliases: ['keras'] },
  { name: 'CUDA', aliases: ['cuda'] },
  { name: 'OpenCV', aliases: ['opencv'] },
  { name: 'Spark', aliases: ['pyspark', 'apache spark'] },
  { name: 'Airflow', aliases: ['airflow'] },
  { name: 'ETL', aliases: ['etl'] },
  { name: 'C#', aliases: ['c#', 'csharp'] },
  { name: 'Go', aliases: ['golang'] },
  { name: 'Rust', aliases: ['rust'] },
  { name: 'Ruby', aliases: ['ruby', 'rails', 'ruby on rails'] },
  { name: 'PHP', aliases: ['php', 'laravel'] },
  { name: 'Kotlin', aliases: ['kotlin'] },
  { name: 'Scala', aliases: ['scala'] },
  { name: 'HTML', aliases: ['html', 'html5'] },
  { name: 'CSS', aliases: ['css', 'css3'] },
  { name: 'Vue', aliases: ['vue', 'vue.js', 'vuejs'] },
  { name: 'Angular', aliases: ['angular'] },
  { name: 'Svelte', aliases: ['svelte'] },
  { name: 'React Native', aliases: ['react native'] },
  { name: 'Flutter', aliases: ['flutter'] },
  { name: 'Spring Boot', aliases: ['spring boot'] },
  { name: 'Django', aliases: ['django'] },
  { name: 'Flask', aliases: ['flask'] },
  { name: 'FastAPI', aliases: ['fastapi'] },
  { name: 'GraphQL', aliases: ['graphql'] },
  { name: 'gRPC', aliases: ['grpc'] },
  { name: 'WebSockets', aliases: ['websocket', 'websockets'] },
  { name: 'REST APIs', aliases: ['rest api', 'rest apis', 'restful'] },
  { name: 'Microservices', aliases: ['microservice', 'microservices'] },
  { name: 'Distributed Systems', aliases: ['distributed systems', 'distributed system'] },
  { name: 'Serverless', aliases: ['serverless', 'lambda'] },
  { name: 'Event-Driven', aliases: ['event-driven', 'event driven'] },
  { name: 'Kafka', aliases: ['kafka'] },
  { name: 'RabbitMQ', aliases: ['rabbitmq'] },
  { name: 'Redis', aliases: ['redis'] },
  { name: 'Elasticsearch', aliases: ['elasticsearch', 'opensearch'] },
  { name: 'MySQL', aliases: ['mysql'] },
  { name: 'SQLite', aliases: ['sqlite'] },
  { name: 'DynamoDB', aliases: ['dynamodb'] },
  { name: 'Firebase', aliases: ['firebase'] },
  { name: 'Supabase', aliases: ['supabase'] },
  { name: 'NoSQL', aliases: ['nosql'] },
  { name: 'AWS', aliases: ['aws', 'amazon web services', 'ec2', 's3'] },
  { name: 'Kubernetes', aliases: ['kubernetes', 'k8s'] },
  { name: 'Terraform', aliases: ['terraform'] },
  { name: 'Infrastructure as Code', aliases: ['infrastructure as code', 'iac'] },
  { name: 'CI/CD', aliases: ['ci/cd', 'ci cd', 'continuous integration', 'continuous delivery', 'continuous deployment', 'github actions', 'jenkins'] },
  { name: 'DevOps', aliases: ['devops'] },
  { name: 'Observability', aliases: ['observability', 'prometheus', 'grafana', 'datadog'] },
  { name: 'Agile', aliases: ['agile', 'scrum', 'kanban', 'sprint', 'sprints'] },
  { name: 'SDLC', aliases: ['sdlc', 'software development lifecycle', 'software development life cycle'] },
  { name: 'Unit Testing', aliases: ['unit test', 'unit tests', 'unit testing', 'tdd', 'test-driven'] },
  { name: 'Integration Testing', aliases: ['integration test', 'integration tests', 'integration testing'] },
  { name: 'Code Review', aliases: ['code review', 'code reviews'] },
  { name: 'OOP', aliases: ['oop', 'object-oriented', 'object oriented'] },
  { name: 'Functional Programming', aliases: ['functional programming'] },
  { name: 'Data Structures', aliases: ['data structures'] },
  { name: 'Algorithms', aliases: ['algorithms', 'algorithm design'] },
  { name: 'Concurrency', aliases: ['concurrency', 'multithreading', 'multi-threading', 'asyncio'] },
  { name: 'OAuth', aliases: ['oauth', 'oauth2'] },
  { name: 'RBAC', aliases: ['rbac', 'role-based access'] },
  { name: 'Security', aliases: ['application security', 'appsec', 'encryption'] },
  { name: 'Accessibility', aliases: ['accessibility', 'a11y', 'wcag'] },
  { name: 'Figma', aliases: ['figma'] },
  { name: 'Jira', aliases: ['jira'] },
  { name: 'Web Scraping', aliases: ['web scraping', 'scraping', 'scraper'] },
  { name: 'Anthropic', aliases: ['anthropic'] },
  { name: 'Claude', aliases: ['claude'] },
  { name: 'OpenAI', aliases: ['openai', 'gpt', 'gpt-4', 'chatgpt'] },
  { name: 'Gemini', aliases: ['gemini'] },
];

/**
 * Diff a JD against the résumé. Returns one report per lexicon term that the
 * JD actually mentions, sorted most-mentioned first.
 */
export function analyzeJd(jdText: string, lib: ResumeLibrary, selections: Selection[]): TermReport[] {
  const chunks = searchableChunks(lib, selections);
  const lexicon = new Map<string, Term>();
  for (const t of [...libraryTerms(lib), ...COMMON_JD_TERMS]) {
    const key = t.name.toLowerCase();
    const existing = lexicon.get(key);
    // Merge alias lists when a term appears in both the library and the
    // common lexicon, so résumé terms still benefit from spelled-out aliases.
    if (existing) {
      existing.aliases = [...new Set([...(existing.aliases ?? []), ...(t.aliases ?? [])])];
    } else {
      lexicon.set(key, { ...t });
    }
  }

  const reports: TermReport[] = [];
  for (const term of lexicon.values()) {
    const aliases = term.aliases?.length ? term.aliases : [term.name];
    const count = aliases.reduce((n, a) => n + matches(a, jdText), 0);
    if (count === 0) continue;
    const hits = chunks.filter((c) => aliases.some((a) => termRegex(a).test(c.text)));
    const status: TermStatus = hits.some((h) => h.onPage)
      ? 'on-page'
      : hits.length > 0
        ? 'in-library'
        : 'missing';
    const where = hits.filter((h) => status === 'on-page' ? h.onPage : true).map((h) => h.where);
    reports.push({ term: term.name, count, status, where: [...new Set(where)].slice(0, 4) });
  }
  return reports.sort((a, b) => b.count - a.count);
}
