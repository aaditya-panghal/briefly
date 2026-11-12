import { CONFIG } from "./config.js";
import { CATEGORIES, countByCategory, dueLabel, summarise, triage } from "./sorter.js";
import { SessionExpired, fetchMails, getProfileEmail } from "./gmail.js";
import { demoMails } from "./demo.js";

const LABELS = Object.fromEntries(CATEGORIES);
const state = { mode: "login", token: "", user: "", mails: [], summary: null, counts: null, view: "summary", selected: null };
const $ = id => document.getElementById(id);

/** Builds an element. Text is only ever set via textContent, so mail content can never run as HTML. */
function el(tag, props = {}, ...kids) {
  const node = document.createElement(tag);
  Object.assign(node, props);
  node.append(...kids);
  return node;
}

/* ---------- State ---------- */
// Sorting and grouping run once per load, not on every render.
function setMails(mails) {
  state.mails = triage(mails);
  state.summary = summarise(state.mails);
  state.counts = countByCategory(state.mails);
  Object.assign(state, { mode: "mail", view: "summary", selected: null });
  render();
}

/* ---------- Rendering ---------- */
const chip = m => (m.days === null || m.category === "noise" ? "" :
  el("span", { className: "chip" + (m.days <= 1 ? " urgent" : ""), textContent: dueLabel(m.days) }));

function row(m) {
  const open = () => { state.selected = m.id; if (state.view === "summary") state.view = "all"; render(); };
  return el("button", { className: "item" + (m.id === state.selected ? " sel" : ""), onclick: open },
    el("span", { className: "from", textContent: m.from }),
    el("span", { className: "subj", textContent: m.subject }),
    chip(m));
}

function renderNav() {
  const items = [["summary", "Due & upcoming", ""], ["all", "All mail", state.mails.length],
    ...CATEGORIES.map(([id, title]) => [id, title, state.counts[id]])];
  $("nav").replaceChildren(...items.map(([id, title, count]) => {
    const btn = el("button", { className: "nav", onclick: () => { state.view = id; state.selected = null; render(); } },
      el("span", { textContent: title }), el("small", { textContent: String(count) }));
    btn.setAttribute("aria-current", String(id === state.view));
    return btn;
  }));
  $("who").textContent = state.user ? `${state.user} · Sign out` : "Demo mode · Exit";
}

function renderSummary() {
  const { overdue, today, week, later, undated } = state.summary;
  const { deadline, action, event, noise } = state.counts;
  const list = $("list");
  list.replaceChildren(
    el("h2", { textContent: "Due & upcoming" }),
    el("p", { className: "sub", textContent: `${state.mails.length} read · ${deadline + action + event} need you · ${noise} ignored` }),
    el("p", { className: "sub", textContent: `${overdue.length} overdue · ${today.length} due today · ${week.length} this week` }));
  const groups = [["Overdue", overdue], ["Today", today], ["Next 7 days", week], ["Later", later], ["Needs action (no date)", undated]];
  for (const [title, items] of groups)
    if (items.length) list.append(el("div", { className: "grp", textContent: title }), ...items.map(row));
  if (groups.every(([, items]) => !items.length)) list.append(el("p", { className: "empty", textContent: "Nothing due. Enjoy it." }));
}

function renderMailView() {
  const items = state.view === "all" ? state.mails : state.mails.filter(m => m.category === state.view);
  $("list").replaceChildren(
    el("h2", { textContent: state.view === "all" ? "All mail" : LABELS[state.view] }),
    el("p", { className: "sub", textContent: `${items.length} messages` }),
    ...(items.length ? items.map(row) : [el("p", { className: "empty", textContent: "Nothing here." })]));
  const m = state.mails.find(x => x.id === state.selected);
  $("reader").replaceChildren(...(m ? [
    el("h2", { textContent: m.subject }),
    el("div", { className: "meta", textContent: `${m.from} · ${m.sent.toLocaleDateString()}` }),
    chip(m),
    el("p", { className: "why", textContent: `Sorted under ${LABELS[m.category]}: ${m.reason}` }),
    el("pre", { textContent: m.body }),
  ] : [el("p", { className: "empty", textContent: "Select a message to read it." })]));
}

function render() {
  $("login").hidden = state.mode !== "login";
  $("app").hidden = state.mode === "login";
  if (state.mode === "login") return;
  $("app").dataset.view = state.view === "summary" ? "summary" : "mail";
  renderNav();
  if (state.view === "summary") renderSummary(); else renderMailView();
}

/* ---------- Auth ---------- */
const setError = msg => { $("err").textContent = msg; };

function setBusy(busy) {
  const btn = $("signin");
  btn.disabled = busy;
  btn.textContent = busy ? "Reading your mail…" : "Sign in with Google";
  $("login").setAttribute("aria-busy", String(busy));
}

async function loadMailbox() {
  setError("");
  setBusy(true);
  try {
    state.user = await getProfileEmail(state.token);
    setMails(await fetchMails(state.token, CONFIG));
  } catch (e) {
    state.token = "";
    setError(e instanceof SessionExpired ? e.message : `Could not load mail: ${e.message}`);
  } finally {
    setBusy(false);
  }
}

function signIn() {
  if (CONFIG.CLIENT_ID.startsWith("PASTE"))
    return setError("You’ll be able to sign in with your college mail shortly, once our Google Client ID is verified. Try the demo until then.");
  if (!window.google) return setError("Google sign-in did not load. Check your connection.");
  google.accounts.oauth2.initTokenClient({
    client_id: CONFIG.CLIENT_ID,
    scope: "https://www.googleapis.com/auth/gmail.readonly", // read-only, nothing more
    hd: CONFIG.DOMAIN || undefined,
    callback: r => { if (r.error) return setError(`Sign-in failed: ${r.error}`); state.token = r.access_token; loadMailbox(); },
    error_callback: e => setError(`Sign-in was cancelled or blocked (${e.type || "error"}).`),
  }).requestAccessToken();
}

function signOut() {
  if (state.token && window.google) google.accounts.oauth2.revoke(state.token);
  Object.assign(state, { mode: "login", token: "", user: "", mails: [], summary: null, counts: null, selected: null });
  render();
}

$("signin").addEventListener("click", signIn);
$("demo").addEventListener("click", () => { state.user = ""; setMails(demoMails()); });
$("who").addEventListener("click", signOut);
