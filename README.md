# Briefly

Your college inbox, minus the noise.

## The problem
Students receive deadlines, exam notices and event invites mixed in with birthday wishes, promos and forwards. Important mail gets buried and missed. Briefly reads the inbox and answers one question: **what do I need to deal with, and when?**

## What it does
- Signs in with Google (read-only Gmail access) and reads the last 40 mails from the past 30 days.
- Sorts each mail into **Deadlines, Needs action, Events, Good to know, Noise**.
- Shows a **Due & upcoming** view: overdue, today, next 7 days, later, and tasks with no date.
- Says why each mail was sorted where it was, so the result can be checked.
- Includes a **demo mailbox**, so it works without signing in.

## Run it
```bash
npm start            # serves http://localhost:5500
npm test             # unit tests, no dependencies (Node 20+)
```
Open `http://localhost:5500`, not the file directly: Google sign-in needs a real origin.

**Enable real sign-in**
1. Google Cloud Console: create a project and enable the **Gmail API**.
2. OAuth consent screen: type **External**, add your test users.
3. Credentials: create an **OAuth client ID** (Web application). Add `http://localhost:5500` and your deployed URL to **Authorized JavaScript origins**.
4. Paste the client ID into `config.js`.

## Structure
| File | Responsibility |
| --- | --- |
| `sorter.js` | Pure sorting and date logic. No DOM, no network. |
| `gmail.js` | Read-only Gmail requests and message parsing. |
| `app.js` | State, rendering and sign-in. |
| `demo.js` | Sample mailbox with dates relative to today. |
| `config.js` | Client ID, domain hint, limits. |
| `tests/` | Unit tests for the sorter. |

## Security
- Read-only scope (`gmail.readonly`). The access token lives in memory only: never stored, never logged, revoked on sign-out.
- No backend and no database: mail content never leaves the browser except to talk to Google.
- Mail text is written with `textContent` only, never as HTML. HTML mail bodies are parsed inertly and reduced to text.
- Strict Content Security Policy (no inline scripts, only Google hosts allowed), plus security headers in `vercel.json`.
- The OAuth client ID is public by design. There is no client secret in this code.

## Efficiency
- Mails are fetched 10 at a time to respect Gmail rate limits, and bodies are capped at 3,000 characters.
- Regular expressions are compiled once. Sorting and grouping run once per load, not per render.

## Accessibility
- Semantic landmarks, a skip link, real buttons for everything clickable, `aria-current` on the active folder, and live regions for updates.
- Visible focus rings, 44px touch targets, light and dark themes, and reduced-motion support.

## Known limits
- Sorting uses keyword rules, not a language model. Hinglish or very vague wording can be misclassified; the "why" tag makes this visible.
- Dates are read day-first and only the first date in a mail is used.
- Google shows an "unverified app" warning until the app passes Google's verification. Until then only listed test users can sign in.
- Next step: replace `classify()` with an LLM call behind a small backend, keeping the same return shape.
