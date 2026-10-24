// mailcode: read Greenhouse security-code emails from the UW Outlook inbox.
// Uses autobrowse's own signed-in profile `microsoft@uw` (profilesDir is autobrowse's,
// not ours). The search result list shows each mail's subject, time and a preview
// that holds the 8-character code, so no message is opened.
import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { chromium } from "playwright";

const PROFILE = `${process.env.HOME}/.config/autobrowse/profiles/microsoft@uw`;
const LOCK = `${process.env.INTERNSHIPS_STATE || `${process.env.HOME}/.local/share/internships`}/outlook.lock`;

/**
 * Runs fn(page) on the signed-in Outlook profile. One reader at a time: the apply
 * flows (security codes) and mail.mjs (inbox scan) share the profile, and Chrome
 * allows one process per profile. A lock older than 5 min is a dead run's.
 */
export async function withOutlook(fn) {
  const t0 = Date.now();
  for (;;) {
    try { writeFileSync(LOCK, String(Date.now()), { flag: "wx" }); break; } catch {
      if (existsSync(LOCK) && Date.now() - Number(readFileSync(LOCK, "utf8")) > 300_000) { rmSync(LOCK, { force: true }); continue; }
      if (Date.now() - t0 > 180_000) throw new Error("outlook profile is busy");
      await new Promise((r) => setTimeout(r, 2_000));
    }
  }
  let ctx;
  try {
    ctx = await chromium.launchPersistentContext(PROFILE, { channel: "chrome", headless: true, viewport: { width: 1400, height: 1000 } });
    const page = ctx.pages()[0] || (await ctx.newPage());
    await page.goto("https://outlook.office.com/mail/", { waitUntil: "domcontentloaded" });
    return await fn(page);
  } finally { await ctx?.close(); rmSync(LOCK, { force: true }); }
}

/**
 * The text of the Outlook search result list for `query`. Plain Playwright on the signed-in
 * profile, not an autobrowse flow: autobrowse reads "enter the code" in the mail preview
 * ("After you enter the code, resubmit...") as a verification wall and stops.
 */
export async function mailCode({ query }) {
  return withOutlook(async (page) => {
    const box = page.locator("input[aria-label^='Search'], #topSearchInput, [role=combobox][aria-label^='Search']").first();
    await box.waitFor({ timeout: 45_000 }).catch(() => { throw new Error(`outlook is not signed in at ${page.url()}`); });
    await box.fill(query);
    await box.press("Enter");
    await page.waitForTimeout(4_000);
    return { text: await page.evaluate(() => document.body.innerText) };
  });
}

const minutes = (t) => { const m = t.match(/^(\d{1,2}):(\d\d)\s*([AP])M$/i); return m ? (Number(m[1]) % 12 + (/p/i.test(m[3]) ? 12 : 0)) * 60 + Number(m[2]) : null; };

/**
 * The code in the newest mail for `company` sent at or after `sinceMin` (minutes since
 * midnight, Toronto). Mail from earlier days shows a weekday or date, not a clock time: never newest.
 */
export function codeFor(text, company, sinceMin = 0) {
  const mails = [...text.matchAll(/Security code for your application to ([^\n]+)\n([^\n]+)\nCopy and paste this code[^\n]*?application:\s*([A-Za-z0-9]{8})\b/g)]
    .map((m) => ({ company: m[1].trim(), at: minutes(m[2].trim()), code: m[3] }))
    .filter((m) => m.at !== null && m.at >= sinceMin && m.company.toLowerCase().includes(company.toLowerCase().split(/[\s,]/)[0]));
  return mails.sort((a, b) => b.at - a.at)[0]?.code || null;
}

/** The links in the open mail, Safe Links wrappers undone. */
export async function mailLinks(page) {
  // Anchors, and bare URLs in plain-text mail (a list preview cuts them with "…": drop those).
  const hrefs = await page.evaluate(() => [
    ...[...document.querySelectorAll("[role=main] a[href], #ReadingPaneContainerId a[href]")].map((a) => ({ text: a.innerText.trim(), href: a.href })),
    ...(document.body.innerText.match(/https?:\/\/[^\s<>"]+/g) || []).filter((u) => !u.endsWith("…")).map((href) => ({ text: "", href })),
  ]);
  const all = hrefs.map((h) => { try { const u = new URL(h.href); return { ...h, href: u.hostname.endsWith("safelinks.protection.outlook.com") ? u.searchParams.get("url") || h.href : h.href }; } catch { return h; } });
  // A plain-text mail wraps a long token link: the scan sees the cut piece too. Drop any link a longer one starts with.
  // Longest first: a token link outlasts a cut piece from another line or a preview.
  return all.filter((h) => !all.some((o) => o.href.length > h.href.length && o.href.startsWith(h.href))).sort((a, b) => b.href.length - a.href.length);
}
/** Archive the open mail: a used verification link has no further value in the inbox. */
export async function archive(page) {
  await page.locator("button[aria-label='Archive']").first().click({ timeout: 10_000 }).then(() => page.waitForTimeout(1_500), () => {});
}
export const VERIFY = /verify your (candidate )?(account|email)|confirm your (email|account)|activate your (candidate )?account|email verification|verification (link|code)/i;
const VERIFY_LINK = /verif|confirm|activat|token|setup/i;

/**
 * The account-verification link for `host` (a Workday tenant, say) from the newest
 * matching inbox mail. Waits up to `waitMs` for it to arrive.
 */
export async function mailLink({ host, subject = VERIFY, linkRe = VERIFY_LINK, waitMs = 180_000, skip = new Set() }) {
  const tenant = host.split(".")[0], t0 = Date.now();
  for (;;) {
    const link = await withOutlook(async (page) => {
      const items = page.locator("[role=listbox] [role=option]");
      await items.first().waitFor({ timeout: 45_000 }); await page.waitForTimeout(2_000);
      // Sender names drop the host's run-together form ("Workday Analog Devices" for analogdevices): compare letters only.
      const texts = await items.evaluateAll((es) => es.map((e) => e.innerText));
      const k = texts.findIndex((t) => subject.test(t) && t.toLowerCase().replace(/[^a-z0-9]/g, "").includes(tenant.toLowerCase().replace(/[^a-z0-9]/g, "")));
      if (k < 0) return null;
      await items.nth(k).click(); await page.waitForTimeout(2_500);
      const links = await mailLinks(page);
      const href = (links.find((l) => l.href.includes(host)) || links.find((l) => linkRe.test(l.text + " " + l.href) && !/unsubscribe|privacy|mailto:/i.test(l.href)))?.href || null;
      // Used now or tried already: out of the inbox, so the next look finds the newer mail a resend brings.
      if (href) await archive(page);
      // A link tried already (used, expired): wait for the newer mail a resend brings.
      return skip.has(href) ? null : href;
    });
    if (link || Date.now() - t0 > waitMs) return link;
    await new Promise((r) => setTimeout(r, 15_000));
  }
}
