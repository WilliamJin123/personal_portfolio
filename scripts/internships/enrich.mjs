// Enrichment rules for a backlog row: ATS, Review tier, Variant, skip.
// Pure; used by push.mjs on new rows and by `node enrich.mjs` for a full pass.
// Decisions behind the rules: docs/superpowers/specs/2026-10-19-internship-apply-pipeline.md

export const COLS = ["Status", "Region", "Company", "Role", "Location", "Posted", "Link", "Tier", "Extra", "Source", "Notes", "ATS", "Review", "Variant", "Applied at", "Confirmation", "Next action", "Due", "Pay", "Pay/hr"];

const BIG = /^(shopify|stripe|databricks|openai|anthropic|cohere|snowflake|palantir|uber|airbnb|coinbase|ramp|figma|notion|vercel|cloudflare|nvidia|apple|google|microsoft|amazon|meta|netflix|tesla|spacex|roblox|datadog|scale ai|perplexity|xai|jane street|citadel( securities)?|hudson river trading|two sigma|jump trading|imc|optiver|drw|bloomberg|robinhood|plaid|brex|rippling|samsara|waymo|anduril|rivian|doordash|lyft|pinterest|linkedin|salesforce|adobe|atlassian|intuit|dropbox|twilio|squarespace|block|square|cash app|affirm|chime|discord|duolingo|epic games|riot games|valve|jpmorgan|goldman sachs|morgan stanley|akuna|five rings|sig|susquehanna|tower research|virtu|point72|millennium|de shaw|d\. e\. shaw)\b/i;

export function ats(link) {
  const u = link.toLowerCase();
  const m = u.match(/zapply\.jobs\/l\/d\/([a-z]+)-/);
  const z = m ? m[1] : "";
  if (u.includes("myworkdayjobs") || u.includes("workday") || z === "workday") return "workday";
  if (u.includes("greenhouse") || u.includes("gh_jid") || z === "greenhouse") return "greenhouse";
  if (u.includes("ashbyhq") || z === "ashby") return "ashby";
  if (u.includes("lever.co") || z === "lever") return "lever";
  if (u.includes("icims")) return "icims";
  if (u.includes("smartrecruiters")) return "smartrecruiters";
  if (u.includes("oraclecloud")) return "oracle";
  if (u.includes("amazon.jobs")) return "amazon";
  return "other";
}

/** One key per posting, whatever list linked it (zapply wraps the ATS link). */
export function jobKey(link) {
  const u = link.toLowerCase();
  // Workday: one req (R26-7568) shows under several locations and as "-1" reposts; one application covers them all.
  const wd = u.match(/^https:\/\/([^/]+)\.myworkdayjobs\.com\/.*\/job\/.*_([a-z]*-?\d[\w-]*?)(?:-\d{1,2})?(?:[/?#]|$)/);
  if (wd) return `workday:${wd[1].split(".")[0]}:${wd[2]}`;
  // zapply wrapper of a Workday posting (workday-<tenant>-<site>-<req>): same key as the real URL, so the duplicate check sees both.
  const zw = u.match(/zapply\.jobs\/l\/d\/workday-([^-/?]+)-.*?-([a-z]{0,3}-?\d[\w]*(?:-\d+)?)(?:[?#]|$)/);
  if (zw) return `workday:${zw[1]}:${zw[2]}`;
  const id = u.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/) || u.match(/gh_jid=(\d+)/) || u.match(/greenhouse\.io\/[^/]+\/jobs\/(\d+)/) || u.match(/zapply\.jobs\/l\/d\/greenhouse-.*-(\d{5,})/) || u.match(/_([a-z]{0,3}-?\d{4,}(?:-\d+)?)(?:[/?]|$)/);
  return id ? `${ats(link)}:${id[1] ?? id[0]}` : u.replace(/[?#].*$/, "").replace(/\/$/, "");
}

export function skipReason(r) {
  const role = r.Role;
  // William is an undergraduate: MS and PhD roles that do not also name a bachelor's are out.
  if (/\b(ph\.?d|doctoral|ms|m\.s\.|masters?)\b/i.test(role) && !/\b(bs|b\.s\.|bachelors?|undergrad\w*)\b/i.test(role)) return /ph\.?d|doctoral/i.test(role) ? "PhD-only" : "MS-only";
  if (/\b(fpga|asic|rtl|verilog|vhdl|silicon|analog|rf\b|hardware|mechanical|electrical|photonics|pcb)\b/i.test(role)) return "hardware";
  if (/high school/i.test(role)) return "high school";
  if (/\b2026\b/.test(role) && !/\b2027\b/.test(role)) return "stale 2026";
  // Next co-op term is May–Aug 2027 (work term record). Winter/Fall 2027 and January starts are academic terms.
  if (/\b(winter|fall|autumn|spring|hiver|automne)\s*(20)?27\b|\bjanuary\b|\bjan\b/i.test(role) && !/\bsummer\b|may\b/i.test(role)) return "wrong term";
  if (/\b(mba|law|legal|nurs|pharm|field test|test engineer\w*|test automation engineer|qa engineer|reliability|micro-grid|manufacturing|supply chain|process engineer|industrial engineer)\b/i.test(role)) return "not SWE";
  return "";
}

export function review(r) {
  const pay = Math.max(parseInt((r.Extra.match(/\$(\d+)\s*\/\s*hr/) || [])[1] || "0", 10), Number(r["Pay/hr"]) || 0);
  if (/FAANG|Quant/i.test(r.Tier) || pay >= 50 || r.Region === "Remote" || BIG.test(r.Company.trim())) return "A";
  return "B";
}

// Role variants (src/resume/selections.ts). The role text decides first; a finance company name only picks fintech for a generic role.
export function variant(r) {
  const role = r.Role, t = `${r.Role} ${r.Company}`;
  if (/\b(ios|swift|mobile|iphone|android|apple platforms)\b/i.test(t)) return "mobile";
  if (/\b(blockchain|crypto|web3|solana|ethereum|defi|wallet|coinbase|bitgo)\b/i.test(t)) return "blockchain";
  if (/\b(machine learning|\bml\b|\bai\b|data science|data engineer|research|llm|genai|nlp|computer vision)\b/i.test(role)) return "ml";
  if (/front[- ]?end|\bui\b|\bweb\b/i.test(role)) return "frontend";
  if (/full[- ]?stack/i.test(role)) return "fullstack";
  if (/back[- ]?end|infrastructure|\binfra\b|platform|distributed|systems|devops|cloud|\bsre\b|reliability|database/i.test(role)) return "backend";
  if (/\b(fintech|bank|trading|quant|capital|payments|finance|securities)\b/i.test(t)) return "fintech";
  return "classic";
}

export function enrich(r) {
  const reason = skipReason(r);
  return {
    ...r,
    Status: r.Status || (reason ? "skip" : ""),
    Notes: r.Notes || reason,
    ATS: ats(r.Link),
    Review: review(r),
    Variant: variant(r),
    "Applied at": r["Applied at"] || "", Confirmation: r.Confirmation || "", "Next action": r["Next action"] || "", Due: r.Due || "", Pay: r.Pay || "", "Pay/hr": r["Pay/hr"] || "",
  };
}

// Full pass over the Backlog tab: `node enrich.mjs`
if (process.argv[1] && process.argv[1].endsWith("enrich.mjs")) {
  const { sheets } = await import("./sheet.mjs");
  const api = await sheets();
  const data = await api.get("Backlog!A1:T");
  const [header, ...rows] = data.values;
  const idx = Object.fromEntries(header.map((h, i) => [h, i]));
  const objs = rows.map(row => Object.fromEntries(COLS.map(c => [c, idx[c] === undefined ? "" : (row[idx[c]] ?? "")])));
  const out = objs.map(enrich);
  // The same posting from two lists: the first row keeps it, later open rows skip.
  const first = new Map();
  out.forEach((o, k) => {
    const key = jobKey(o.Link);
    if (!first.has(key)) return void first.set(key, k);
    if (!o.Status || ["ready", "needs-answer", "todo"].includes(o.Status)) { o.Status = "skip"; o.Notes = `duplicate of row ${first.get(key) + 2}`; }
  });
  await api.put("Backlog!A1", [COLS, ...out.map(o => COLS.map(c => o[c]))]);
  const count = (f) => out.reduce((m, o) => (m[f(o)] = (m[f(o)] || 0) + 1, m), {});
  console.log("rows", out.length, "\nATS", count(o => o.ATS), "\nReview", count(o => o.Review), "\nVariant", count(o => o.Variant), "\nStatus", count(o => o.Status || "(open)"), "\nskip reasons", count(o => o.Status === "skip" ? o.Notes : "-"));
}
