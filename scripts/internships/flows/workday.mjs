// Workday apply: one posting on any <tenant>.wdN.myworkdayjobs.com board.
// Same contract and hand-offs as flows/greenhouse.mjs.
//
// Every tenant asks for its own account. The first visit creates it (email +
// the one password in $STATE/workday-password, 0600, never in the repo); the
// tenant is then recorded in $STATE/workday-accounts.json and later visits
// sign in. The wizard is the same on every tenant, driven by Workday's own
// data-automation-id attributes: My Information, My Experience, Application
// Questions, Voluntary Disclosures, Self Identify, Review.
//
// Field kinds (2026-10):
//   text            input / textarea
//   select          button[aria-haspopup=listbox]; options render in a popup while open
//   search          multiSelectContainer: type, then pick a prompt option
//   checkbox, radio click the label
//   date            month / day / year spinbuttons
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { defineFlow } from "@wrenautomation/autobrowse";
import { clean, match } from "../answers.mjs";
import { mailLink } from "./mailcode.mjs";

const STATE = process.env.INTERNSHIPS_STATE || `${process.env.HOME}/.local/share/internships`;
const ACCOUNTS = `${STATE}/workday-accounts.json`;
const EMAIL = "w3jin@uwaterloo.ca";
const id = (s) => `[data-automation-id="${s}"]`;
const NEXT = [id("pageFooterNextButton"), id("bottom-navigation-next-button")].join(", ");

export const applyUrl = (link) => link.replace(/[?#].*$/, "").replace(/\/apply(\/.*)?$/, "").replace(/\/$/, "") + "/apply/applyManually";

const accounts = () => (existsSync(ACCOUNTS) ? JSON.parse(readFileSync(ACCOUNTS, "utf8")) : {});
const remember = (host) => { mkdirSync(STATE, { recursive: true }); writeFileSync(ACCOUNTS, JSON.stringify({ ...accounts(), [host]: new Date().toISOString() }, null, 1)); };

/** Every visible form field: label, kind, required, id (data-wf). Selects get their options later. */
const FIELDS = `(() => {
  const txt = (e) => (e?.innerText || e?.textContent || "").replace(/\\s+/g, " ").trim();
  const out = [];
  [...document.querySelectorAll('[data-automation-id^="formField-"]')].forEach((f, k) => {
    if (f.parentElement?.closest('[data-automation-id^="formField-"]')) return;
    if (!f.getBoundingClientRect().height) return;
    const label = txt(f.querySelector("label")) || txt(f.querySelector("legend")) || txt(f).split("\\n")[0];
    const q = (s) => f.querySelector(s);
    let kind = null;
    if (q("button[aria-haspopup=listbox]")) kind = "select";
    else if (q('[data-automation-id="multiSelectContainer"]') || q('input[data-automation-id="searchBox"]')) kind = "search";
    else if (f.querySelectorAll('input[type=checkbox]').length > 1) kind = "checkboxes";
    else if (q('input[type=checkbox]')) kind = "checkbox";
    else if (q('input[type=radio]')) kind = "radio";
    else if (q('[data-automation-id^="dateSection"]')) kind = "date";
    else if (q("textarea, input[type=text], input:not([type])")) kind = "text";
    if (!kind) return;
    f.setAttribute("data-wf", String(k));
    const radios = kind === "radio" || kind === "checkboxes" ? [...f.querySelectorAll(kind === "radio" ? "input[type=radio]" : "input[type=checkbox]")].map((r) => txt(document.querySelector('label[for="' + CSS.escape(r.id) + '"]')) || r.value) : [];
    out.push({ id: String(k), label, kind, required: /\\*/.test(label) || !!f.querySelector("[aria-required=true], [required]"), options: radios, value: kind === "text" ? (q("textarea, input")?.value || "") : kind === "search" ? txt(q('[data-automation-id="selectedItemList"]')) : kind === "select" ? txt(q("button[aria-haspopup=listbox]")) : "" });
  });
  return out;
})()`;

/** A multiSelect search: type the term, pick the closest prompt option; a hierarchy (source categories) goes down until a leaf. */
async function pickSearch(page, fp, el, term) {
  const input = el.locator("input").first();
  await input.click({ force: true });
  // A failed term stays in the box: clear it, or the next term types onto it.
  await input.fill("").catch(() => {});
  await page.keyboard.type(term, { delay: 40 });
  await page.keyboard.press("Enter");
  for (let level = 0; level < 4; level++) {
    await fp.wait(level ? 1_200 : 2_500);
    // Enter alone can already pick the first match.
    if (await el.locator('[data-automation-id="selectedItem"]').count()) { await page.keyboard.press("Escape"); return true; }
    let texts = await page.locator('[data-automation-id="activeListContainer"] [data-automation-id="promptOption"]').evaluateAll((os) => os.filter((o) => o.getBoundingClientRect().height).map((o) => (o.innerText || "").replace(/\s+/g, " ").trim()));
    if (!texts.length) { await page.keyboard.press("Escape"); if (process.env.WD_DEBUG) { await page.screenshot({ path: `${process.env.WD_DEBUG}/pick-${level}.png` }); console.error("PICK empty at", level, await page.evaluate(() => [...document.querySelectorAll("[data-automation-id]")].map((e) => e.getAttribute("data-automation-id")).filter((x) => /prompt|list|menu|option/i.test(x)).join(","))); } return false; }
    if (level === 0 && !texts.some((t) => t.toLowerCase().includes(term.toLowerCase()))) {
      await fp.wait(2_500);
      texts = await page.locator('[data-automation-id="activeListContainer"] [data-automation-id="promptOption"]').evaluateAll((os) => os.filter((o) => o.getBoundingClientRect().height).map((o) => (o.innerText || "").replace(/\s+/g, " ").trim()));
    }
    const want = "job board|career site|external|website|online|internet|linkedin|search|other";
    const pick = texts.find((t) => t.toLowerCase().includes(term.toLowerCase())) || texts.find((t) => new RegExp(want, "i").test(t)) || (level > 0 ? texts[0] : null);
    if (process.env.WD_DEBUG) console.error(`PICK L${level} ${JSON.stringify(texts.slice(0, 12))} -> ${pick}`);
    if (!pick) { await page.keyboard.press("Escape"); return false; }
    await page.locator('[data-automation-id="activeListContainer"] [data-automation-id="promptOption"]', { hasText: pick }).first().click({ force: true });
    await fp.wait(800);
    if (process.env.WD_DEBUG) await page.screenshot({ path: `${process.env.WD_DEBUG}/pick-after-${level}.png` });
    if (await el.locator('[data-automation-id="selectedItem"]').count()) return true;
  }
  return true;
}

export const workdayApply = defineFlow({
  site: "workday",
  name: "workday-apply",
  /**
   * input: { url, answers, region, files: { resume, transcript }, dryRun, screenshot }
   * out:   { status: "submitted" | "filled", filled: [{label, answer}], screenshot? }
   */
  async run(fp, input) {
    const page = fp.page, host = new URL(input.url).host;
    const pw = readFileSync(`${STATE}/workday-password`, "utf8").trim();
    const click = (sel) => page.locator(sel).first().click({ force: true });
    // Field errors, plus the "Errors Found" page banner (its items have no stable id).
    const errors = () => page.evaluate(() => {
      const found = [...document.querySelectorAll('[data-automation-id="errorMessage"], [data-automation-id="errorBanner"], [role=alert]')].map((e) => e.innerText.replace(/\s+/g, " ").trim()).filter((t) => t && !/successfully (uploaded|saved)/i.test(t));
      const body = document.body.innerText.replace(/\s+/g, " "), k = body.indexOf("Errors Found");
      if (!found.length && k >= 0) found.push(body.slice(k + 12, k + 220).trim());
      return found;
    });

    await fp.open(applyUrl(input.url), { allowWall: true });
    // Some tenants show social sign-in buttons first (KLA, NVIDIA): take the email path.
    const EMAIL_BTN = `${id("SignInWithEmailButton")}, button:has-text("Sign in with email")`;
    // A slow tenant (NVIDIA) can sit on a loading skeleton past 30 s: reload once and wait longer.
    const FIRST = `${id("email")}, ${NEXT}, ${id("formField-country")}, ${EMAIL_BTN}`;
    if (!(await page.waitForSelector(FIRST, { timeout: 30_000 }).then(() => true, () => false))) {
      if (/page you are looking for doesn.t exist|no longer (available|accepting)|job (posting )?(has been|is) (closed|filled|removed)/i.test(await fp.text())) fp.human("posting closed");
      await fp.open(applyUrl(input.url), { allowWall: true });
      await page.waitForSelector(FIRST, { timeout: 60_000 }).catch(() => fp.human(`no Workday form at ${fp.url()}`));
    }
    if (await page.locator(EMAIL_BTN).first().isVisible().catch(() => false)) {
      await page.locator(EMAIL_BTN).first().click({ force: true });
      await page.waitForSelector(id("email"), { timeout: 15_000 }).catch(() => fp.human(`no email sign-in form at ${fp.url()}`));
      // The email path opens on sign-in; a new tenant needs the create-account form.
      if (!accounts()[host] && !(await page.locator(id("verifyPassword")).first().isVisible().catch(() => false))) { await click(id("createAccountLink")); await fp.wait(1_500); }
    }

    // --- account -----------------------------------------------------------
    if (await page.locator(id("email")).first().isVisible().catch(() => false)) {
      const signIn = async () => {
        if (await page.locator(EMAIL_BTN).first().isVisible().catch(() => false)) { await page.locator(EMAIL_BTN).first().click({ force: true }); await fp.wait(1_500); }
        const submit = page.locator(id("signInSubmitButton")).first();
        if (!(await submit.isVisible().catch(() => false))) { await click(id("signInLink")); await submit.waitFor({ timeout: 15_000 }).catch(() => fp.human(`no sign-in form at ${fp.url()}`)); }
        await fp.wait(800);
        await page.locator(id("email")).first().fill(EMAIL);
        await page.locator(id("password")).first().fill(pw);
        await click(id("signInSubmitButton"));
        if (process.env.WD_DEBUG) { await fp.wait(5_000); console.error("SIGNIN", fp.url(), JSON.stringify(await errors()), await page.locator(id("email")).first().inputValue().catch(() => "?")); }
      };
      // A tenant that wants the account's email verified: open the link from the UW inbox, then sign in.
      // A second call means the first link did not take (used or expired): ask for a fresh mail.
      const tried = new Set();
      const verify = async () => {
        if (tried.size) {
          await fp.open(applyUrl(input.url), { allowWall: true }); await fp.wait(3_000);
          if (await page.locator(id("email")).first().isVisible().catch(() => false)) { await signIn(); await fp.wait(4_000); }
          // Verified meanwhile (the mail job opened the link): signed in, nothing to resend.
          if (!/verif/i.test((await errors()).join(" "))) return;
          const resend = page.locator('button:has-text("Resend Account Verification"), a:has-text("Resend Account Verification")').first();
          if (!(await resend.isVisible().catch(() => false))) fp.human(`${host}: verification link did not take; no resend control`);
          await resend.click(); await fp.wait(3_000);
        }
        const link = await mailLink({ host, skip: tried });
        if (!link) fp.human(`${host} wants the new account's email verified; no mail with the link`);
        tried.add(link);
        await fp.open(link, { allowWall: true }); await fp.wait(5_000);
        await fp.open(applyUrl(input.url), { allowWall: true }); await fp.wait(3_000);
        await signIn(); await fp.wait(4_000);
      };
      // The tenant has an account under another password (made by hand, or long ago): reset it from the inbox.
      const reset = async () => {
        await click(id("forgotPasswordLink")); await fp.wait(1_500);
        await page.locator(id("email")).first().fill(EMAIL);
        await click(`${id("resetPasswordButton")}, ${id("resetPasswordSubmitButton")}`); await fp.wait(3_000);
        const link = await mailLink({ host, subject: /reset|password/i, linkRe: /reset|password|token/i });
        // No mail: Workday sends one only to an existing account, so the account was never made. Make it now.
        if (!link) {
          await fp.open(applyUrl(input.url), { allowWall: true }); await fp.wait(3_000);
          // The page draws a grey placeholder first: wait for the sign-in or create form itself.
          await page.waitForSelector(`${id("createAccountLink")}, ${id("email")}, ${EMAIL_BTN}`, { timeout: 30_000 }).catch(() => {});
          if (await page.locator(EMAIL_BTN).first().isVisible().catch(() => false)) { await page.locator(EMAIL_BTN).first().click({ force: true }); await fp.wait(1_500); }
          await click(`${id("createAccountLink")}, button:has-text("Create Account"), a:has-text("Create Account")`).catch(() => {}); await fp.wait(2_000);
          if (!(await page.locator(id("verifyPassword")).first().isVisible().catch(() => false))) fp.human(`${host}: password reset sent; no mail with the link; no create-account form`);
          return create();
        }
        await fp.open(link, { allowWall: true }); await fp.wait(4_000);
        for (const f of await page.locator(`${id("password")}, ${id("verifyPassword")}, ${id("newPassword")}, ${id("confirmPassword")}, input[type=password]`).all()) await f.fill(pw).catch(() => {});
        await click(`${id("resetPasswordSubmitButton")}, ${id("changePasswordSubmitButton")}, button[type=submit], button:has-text("Submit")`); await fp.wait(4_000);
        await fp.open(applyUrl(input.url), { allowWall: true }); await fp.wait(3_000);
        await signIn(); await fp.wait(4_000);
      };
      const wrongPassword = async () => /wrong email address or password|account might be locked|invalid (email|password)|reset your password/i.test((await errors()).join(" "));
      const create = async () => {
        await page.locator(id("email")).first().fill(EMAIL);
        await page.locator(id("password")).first().fill(pw);
        await page.locator(id("verifyPassword")).first().fill(pw);
        const box = page.locator(id("createAccountCheckbox")).first();
        if (await box.count()) await box.check({ force: true });
        await click(id("createAccountSubmitButton"));
        await fp.wait(5_000);
        if (process.env.WD_DEBUG) console.error("CREATED", fp.url(), JSON.stringify(await errors()), (await fp.text()).replace(/\s+/g, " ").slice(0, 300));
        if (await page.locator(id("email")).first().isVisible().catch(() => false)) {
          const body = (await fp.text()).toLowerCase();
          if (/already|exists/.test(body)) await signIn();
          else if (/verify|verification/.test(body)) await verify();
        }
      };
      if (accounts()[host]) await signIn();
      else await create();
      await fp.wait(3_000);
      if (process.env.WD_DEBUG) console.error("SIGNIN", fp.url(), JSON.stringify(await errors()));
      if (await wrongPassword()) await reset();
      // Sign-in refused until the account's email is verified.
      if (/verify your account|verification email|email has been sent/i.test((await errors()).join(" ") + " " + (await fp.text()).slice(0, 3000))) await verify();
      // Sign-in lands on the candidate home, not the application: go back to it.
      await fp.wait(5_000);
      remember(host);
      if (!/apply/.test(fp.url())) await fp.open(applyUrl(input.url), { allowWall: true });
      // Workday sometimes answers "Something went wrong" right after sign-in: reload twice before giving up.
      for (let t = 0; t < 2 && /something went wrong/i.test(await fp.text()); t++) { await fp.wait(3_000); await fp.open(applyUrl(input.url), { allowWall: true }); await fp.wait(3_000); }
      const ready = () => page.waitForSelector(`${NEXT}, ${id("formField-country")}`, { timeout: 30_000 }).then(() => true, () => false);
      // A run that submitted but read a false error: the tenant says so now.
      if (/you've already applied for this job/i.test(await fp.text())) return { status: "submitted", filled: [{ label: "note", answer: "already applied (an earlier run submitted)" }], screenshot: undefined };
      if (!(await ready())) {
        // The "verify your account" error shows only after sign-in settles.
        if (/verif|email has been sent/i.test((await errors()).join(" "))) { await verify(); if (!/apply/.test(fp.url())) await fp.open(applyUrl(input.url), { allowWall: true }); }
        // Landed on the tenant's own /login page (after a verification, say): sign in there, then back to the form.
        else if ((await page.locator(id("email")).first().isVisible().catch(() => false)) || (await page.locator(EMAIL_BTN).first().isVisible().catch(() => false))) { await signIn(); await fp.wait(4_000); if (await wrongPassword()) await reset(); await fp.open(applyUrl(input.url), { allowWall: true }); }
        // Still "verify your account": that link did not take; resend once and try the new one.
        if (!(await ready()) && /verif/i.test((await errors()).join(" ")) && tried.size < 2) { await verify(); if (!/apply/.test(fp.url())) await fp.open(applyUrl(input.url), { allowWall: true }); }
        if (!(await ready())) fp.human(`workday sign-in stopped: ${(await errors()).join("; ").slice(0, 200) || (/something went wrong/i.test(await fp.text()) ? "something went wrong" : fp.url())}`);
      }
    }

    // --- wizard ------------------------------------------------------------
    const filled = [];
    let prev = "", stuck = 0, grew = false, reloaded = false;
    const seen = new Set(); // labels met on this page: an answer can reveal the next question (Cisco chains three)
    for (let step = 0; step < 14; step++) {
      await fp.wait(2_000);
      const title = await page.evaluate(() => document.querySelector('[data-automation-id="progressBarActiveStep"]')?.innerText.replace(/\s+/g, " ").trim() || "");
      // Next did not move the page twice: the page refuses a field. Say which, now.
      if (title !== prev) seen.clear();
      stuck = title === prev ? (grew ? stuck : stuck + 1) : 0; prev = title;
      // "A phone number (an address) already exists": the saved draft holds one and the page sent a second. A reload shows the draft's own values; the fill then skips them.
      if (stuck && !reloaded && /already exists for this application/i.test((await errors()).join(" "))) { reloaded = true; await page.reload({ waitUntil: "domcontentloaded" }); await fp.wait(6_000); prev = ""; stuck = 0; seen.clear(); continue; }
      if (stuck >= 2) fp.human(`stuck on "${title}": ${(await errors()).join("; ").slice(0, 300) || "no error shown"}`);
      const last = /review/i.test(title) || (await page.locator(id("bottom-navigation-next-button")).first().innerText().catch(() => "")).toLowerCase().includes("submit");
      if (last) break;
      const raw = await page.evaluate(FIELDS);
      const box = (f) => page.locator(`[data-wf="${f.id}"]`);
      // The sticky footer covers a control near the bottom edge: centre it before any click.
      const centre = (f) => box(f).evaluate((e) => e.scrollIntoView({ block: "center" }));
      // Selects carry their options only while open: read each once, then match.
      for (const f of raw) {
        if (f.kind !== "select") continue;
        // A click right after another list closed can miss: try twice.
        for (let t = 0; t < 3 && !f.options.length; t++) {
          await centre(f);
          await box(f).locator("button[aria-haspopup=listbox]").first().click({ force: true });
          await page.waitForSelector("li[role=option]", { state: "visible", timeout: 4_000 }).catch(() => {});
          await fp.wait(400);
          f.options = await page.locator('li[role=option]').evaluateAll((os) => os.filter((o) => o.getBoundingClientRect().height).map((o) => (o.innerText || "").replace(/\s+/g, " ").trim()).filter((t) => t && !/^select one$/i.test(t)));
          if (!f.options.length) { await page.keyboard.press("Escape"); await fp.wait(500); }
        }
        if (process.env.WD_DEBUG) console.error(`OPTIONS ${f.label}: ${JSON.stringify(f.options)}`);
        await page.keyboard.press("Escape");
        await fp.wait(300);
      }
      const fields = raw.map((f) => ({ ...f, label: clean(f.label) }));
      const { filled: hits, open } = match(fields, input.answers, input.region);
      grew = fields.some((f) => !seen.has(f.label)); fields.forEach((f) => seen.add(f.label));
      if (open.length) fp.human(`no answer for ${open.map((q) => `"${q}"`).join(", ")}`.slice(0, 1500));
      if (process.env.WD_DEBUG) console.error(`STEP ${step} "${title}"\n` + hits.map((f) => `  ${f.kind.padEnd(8)} ${f.label.slice(0, 50)} => ${/SECRET/.test(f.raw) ? "[profile]" : f.answer}`).join("\n"));
      for (const f of hits) {
        let a = f.answer;
        if (/overall result|\bgpa\b/i.test(f.label) && f.kind === "text") a = "3.7"; // a text box takes one number
        if (/^city$/i.test(f.label)) a = a.split(",")[0].trim();
        // A signature date is today, whatever a draft from an earlier day says.
        if (f.kind === "date" && /^(today.s )?date$|signature date|date signed/i.test(f.label)) a = "TODAY";
        // A pay box with no posted pay: Workday takes digits only, so "Flexible" leaves it empty. Market median for an intern.
        if (f.kind === "text" && /salary|compensation|pay (rate|expectation)|hourly (rate|wage)/i.test(f.label) && !/\d/.test(a)) a = /hour/i.test(f.label) ? (input.region === "canada" ? "30" : "40") : input.region === "canada" ? "60000" : "80000";
        // A pay box that takes a number rejects "$25/hr USD": keep the figure, and turn an hourly one into a yearly one for a salary box.
        if (f.kind === "text" && /salary|compensation|pay (rate|expectation)|hourly (rate|wage)/i.test(f.label) && /\d/.test(a) && /[^\d.,\s]/.test(a)) {
          const n = Number(a.match(/\d[\d,]*(?:\.\d+)?/)[0].replace(/,/g, ""));
          a = String(/hour|\/\s*hr/i.test(a) && !/hour/i.test(f.label) ? Math.round(n * 2080) : n);
        }
        if (/^phone number/i.test(f.label)) a = a.replace(/\D/g, "").slice(-10); // the country code is its own field
        // A default already holds the answer (Canada (+1)): leave it.
        if ((f.kind === "search" || f.kind === "select") && f.value && !/^select one$/i.test(f.value) && f.value.toLowerCase().includes(a.toLowerCase().split(/[ (]/)[0])) { filled.push({ label: f.label, answer: f.answer }); continue; }
        // "I currently work here" hides the work block's To box: nothing to fill.
        if (f.kind === "date" && !(await box(f).isVisible().catch(() => false))) continue;
        // A From box with a month is the work block (education From is a year): the current role began Sep 2026.
        if (f.kind === "date" && /^from$/i.test(f.label) && (await box(f).locator('[data-automation-id="dateSectionMonth-input"]').count())) a = "September 2026";
        await centre(f);
        const el = box(f);
        // A saved draft holds the value already: typing it again makes Workday add a second phone and refuse the page.
        const same = (x) => String(x).replace(/[^a-z0-9]/gi, "").toLowerCase();
        if (f.kind === "text") { const t = el.locator("textarea, input").first(); if (same(await t.inputValue().catch(() => "")).endsWith(same(a)) && same(a)) continue; await t.fill(a); }
        else if (f.kind === "select") {
          // No options after three opens: an info block drawn as a select (Ryan's disability text). Nothing to pick; a truly required one shows as "stuck" with its error.
          if (!f.options?.length) continue;
          for (let t = 0; t < 3; t++) {
            await el.locator("button[aria-haspopup=listbox]").first().click({ force: true });
            if (await page.waitForSelector("li[role=option]", { state: "visible", timeout: 4_000 }).then(() => true, () => false)) break;
            await page.keyboard.press("Escape"); await fp.wait(500);
          }
          const esc = a.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+");
          // Exact text first; else the one option that holds it ("Software Engineering" in "Engineering - Software Engineering"). No 30 s wait on a miss.
          const exact = page.locator("li[role=option]").filter({ hasText: new RegExp(`^\\s*${esc}\\s*$`) }).first();
          const part = page.locator("li[role=option]").filter({ hasText: new RegExp(esc, "i") });
          if (await exact.count()) await exact.click({ force: true });
          else if ((await part.count()) === 1) await part.first().click({ force: true });
          else { await page.keyboard.press("Escape"); fp.human(`no option "${a}" in "${f.label}" (options: ${(f.options || []).slice(0, 8).join(" / ")})`); }
        } else if (f.kind === "search") {
          // A source "Other" often asks for a referrer's name: a job-board branch does not.
          const src = /hear about|how did you/i.test(f.label);
          let tries = [a, ...String(f.raw || "").split(" | ").filter((x) => x && x !== a && !/^\/|^[a-z]+:/.test(x))];
          // A skills box takes one skill per pick; a draft gives a comma list. Pick up to five.
          if (/skill/i.test(f.label)) {
            tries = [...new Set(tries.flatMap((t) => t.split(/\s*,\s*/)).filter(Boolean))];
            let n = 0; for (const t of tries) { if (n >= 5) break; if (await pickSearch(page, fp, el, t)) n++; }
            if (!n && f.required) fp.human(`no option for "${a}" in "${f.label}"`);
          } else if (!(src && (await ["LinkedIn", "Careers", "Job Board"].reduce(async (done, t) => (await done) || pickSearch(page, fp, el, t), false))) && !(await tries.reduce(async (done, t) => (await done) || pickSearch(page, fp, el, t), false))) { if (f.required) fp.human(`no option for "${a}" in "${f.label}"`); continue; }
        } else if (f.kind === "date") {
          // "May 2028", "2028" or a numeric month: year-only fields have no month box.
          // TODAY: a signature date (the disability form): month, day and year of today.
          const mdy = a.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
          const now = mdy ? new Date(+mdy[3], +mdy[1] - 1, +mdy[2]) : new Date(), today = a === "TODAY" || !!mdy;
          const yr = today ? String(now.getFullYear()) : a.match(/\d{4}/)?.[0], mo = today ? null : a.match(/[A-Za-z]{3}/)?.[0];
          const mon = today ? String(now.getMonth() + 1).padStart(2, "0") : mo ? String(new Date(`${mo} 1 2000`).getMonth() + 1).padStart(2, "0") : "";
          // A box that drops the first keys (the widget still loading) gets one more try, by click.
          const part = async (n, v) => { const i = el.locator(`[data-automation-id="dateSection${n}-input"]`).first(); if (v && (await i.count())) { await i.evaluate((e) => { e.scrollIntoView({ block: "center" }); e.focus(); }); await page.keyboard.type(v, { delay: 40 }); if (!/\d/.test(await i.inputValue().catch(() => "0"))) { await i.click({ force: true }); await page.keyboard.type(v, { delay: 80 }); } } };
          const day = today ? String(now.getDate()).padStart(2, "0") : mon && "01";
          // A date already typed on an earlier pass (a chained question re-scans the page) stays: typing over it can clear it.
          const have = async (n) => (await el.locator(`[data-automation-id="dateSection${n}-input"]`).first().inputValue().catch(() => "")).replace(/\D/g, "");
          const done = (!mon || +(await have("Month")) === +mon) && (!day || +(await have("Day")) === +day) && (!yr || (await have("Year")) === yr);
          if (!done) { await part("Month", mon); await part("Day", day); await part("Year", yr); await page.keyboard.press("Tab"); } // Tab commits the value
        } else if (f.kind === "checkbox") {
          if (/^yes/i.test(a)) await el.locator("input[type=checkbox]").first().evaluate((c) => { if (!c.checked) c.click(); });
        } else if (f.kind === "checkboxes") {
          // A group (race, shifts): tick each chosen option.
          for (const want of a.split(/\s*;\s*/)) {
            const i = f.options.indexOf(want); if (i < 0) fp.human(`no option "${want}" in "${f.label}"`);
            await el.locator("input[type=checkbox]").nth(i).evaluate((c) => { if (!c.checked) c.click(); });
          }
        } else if (f.kind === "radio") {
          const i = f.options.indexOf(a); if (i < 0) fp.human(`no option "${a}" in "${f.label}"`);
          await el.locator("input[type=radio]").nth(i).evaluate((r) => r.click());
        }
        filled.push({ label: f.label, answer: f.answer });
        await fp.wait(250);
      }
      // My Experience: the résumé goes in once; the tenant's parser fills the rest where it can.
      const up = page.locator("input[type=file]").first();
      if (input.files?.resume && (await up.count()) && !(await page.locator(id("file-upload-successful")).count())) {
        await up.setInputFiles(input.files.resume);
        await page.locator(id("file-upload-successful")).first().waitFor({ timeout: 30_000 }).catch(() => {});
        filled.push({ label: "Resume/CV", answer: "resume" });
      }
      // My Work Availability (an internship is full time): "I'm flexible" covers every slot.
      const flex = page.getByRole("checkbox", { name: /i'?m flexible/i }).first();
      if ((await flex.count()) && !(await flex.isChecked().catch(() => true))) { await flex.check({ force: true }).catch(() => {}); filled.push({ label: "Work availability", answer: "I'm flexible" }); }
      await page.keyboard.press("Escape");
      const stepTitle = () => page.evaluate(() => document.querySelector('[data-automation-id="progressBarActiveStep"]')?.innerText.replace(/\s+/g, " ").trim() || "");
      // The first click can only close an open list: click again when the step did not change.
      for (let t = 0; t < 3; t++) {
        if (process.env.WD_DEBUG) console.error("NEXT", await page.locator(NEXT).evaluateAll((bs) => bs.map((b) => `${b.getAttribute("data-automation-id")}:${b.innerText}:${b.disabled}:${b.getAttribute("aria-disabled")}`)));
        await (t ? page.locator(NEXT).first().evaluate((b) => b.click()) : click(NEXT));
        await fp.wait(3_000);
        if ((await stepTitle()) !== title || (await errors()).length) break;
      }
      if (process.env.WD_DEBUG) { console.error("AFTER NEXT", JSON.stringify(await errors())); await page.screenshot({ path: `${process.env.WD_DEBUG}/after-next-${step}.png`, fullPage: true }); }
    }
    // --- review and submit -------------------------------------------------
    const shoot = async () => { if (input.screenshot) await page.screenshot({ path: input.screenshot, fullPage: true }); return input.screenshot; };
    if (input.dryRun) return { status: "filled", filled, screenshot: await shoot() };
    const agree = page.locator(id("agreementCheckbox")); // some tenants ask a final consent
    if (await agree.count()) await agree.first().check({ force: true }).catch(() => {});
    await click(NEXT);
    const done = /application (has been )?submitted|thank you for (applying|your (application|interest))|we.{0,20}received your application|congratulations/i;
    for (let t = 0; t < 20; t++) {
      await fp.wait(2_000);
      // The "Congratulations" dialog sits outside the main text on some tenants (Toro): read dialogs too.
      const body = `${await fp.text()} ${await page.locator('[role="dialog"]').allInnerTexts().then((t) => t.join(" "), () => "")}`;
      if (done.test(body) || /\/(confirmation|applicationSubmitted)|[?&]Job_Application_ID=/i.test(fp.url())) return { status: "submitted", filled, screenshot: await shoot() };
      const errs = await errors();
      if (errs.length) fp.human(`workday review: ${errs.join("; ").slice(0, 250)}`);
    }
    fp.human("workday: no confirmation after submit");
  },
});
