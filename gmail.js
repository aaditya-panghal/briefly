/** Read-only Gmail access. The token stays in memory and is only sent to Google. */

const API = "https://gmail.googleapis.com/gmail/v1/users/me";
const BATCH_SIZE = 10; // keeps us well inside Gmail's per-user rate limits
const BODY_LIMIT = 3000;

export class SessionExpired extends Error {}

async function request(token, path) {
  const res = await fetch(API + path, { headers: { Authorization: `Bearer ${token}` } });
  if (res.status === 401) throw new SessionExpired("Session expired. Please sign in again.");
  if (!res.ok) throw new Error(`Gmail returned ${res.status}. Is the Gmail API enabled for your project?`);
  return res.json();
}

const decode = data => new TextDecoder().decode(
  Uint8Array.from(atob(data.replace(/-/g, "+").replace(/_/g, "/")), c => c.charCodeAt(0)));

/** Prefers the plain-text part; falls back to HTML parsed inertly (never inserted into the page). */
function bodyText(part) {
  if (part.mimeType === "text/plain" && part.body && part.body.data) return decode(part.body.data);
  for (const child of part.parts || []) {
    const text = bodyText(child);
    if (text) return text;
  }
  if (part.mimeType === "text/html" && part.body && part.body.data) {
    const doc = new DOMParser().parseFromString(decode(part.body.data), "text/html");
    doc.querySelectorAll("style,script").forEach(n => n.remove());
    return doc.body.textContent;
  }
  return "";
}

export function toMail(message) {
  const header = name => {
    const h = message.payload.headers.find(x => x.name.toLowerCase() === name);
    return h ? h.value : "";
  };
  const from = header("from");
  const body = bodyText(message.payload).replace(/[ \t]+/g, " ").replace(/\n\s*\n+/g, "\n\n").trim();
  return {
    id: message.id,
    subject: header("subject") || "(no subject)",
    from: from.replace(/<.*>/, "").replace(/"/g, "").trim() || from,
    sent: new Date(+message.internalDate),
    body: (body || message.snippet || "").slice(0, BODY_LIMIT),
  };
}

export async function getProfileEmail(token) {
  return (await request(token, "/profile")).emailAddress;
}

export async function fetchMails(token, { MAX_MAIL, QUERY }) {
  const list = await request(token, `/messages?maxResults=${MAX_MAIL}&q=${encodeURIComponent(QUERY)}`);
  const ids = (list.messages || []).map(m => m.id);
  const messages = [];
  for (let i = 0; i < ids.length; i += BATCH_SIZE)
    messages.push(...await Promise.all(ids.slice(i, i + BATCH_SIZE).map(id => request(token, `/messages/${id}?format=full`))));
  return messages.map(toMail);
}
