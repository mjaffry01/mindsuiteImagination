# MindSuite Offerings Explorer (React)

React + Vite site for MindSuite's capabilities catalogue (9 service families, 49 areas, 231 offerings),
team, careers page, and a "Request a proposal" flow backed by a small Node email server.

```bash
npm install
npm run dev      # site on http://localhost:5173
npm run server   # enquiry server on http://localhost:8787 (run alongside dev to test the form)
npm run build    # static site in dist/
npm start        # build, then serve the site and /api/enquiry from one Node process
```

## Structure
- `src/data/catalogue.json` – all families, areas and offerings (edit content here)
- `src/data/team.js`, `src/data/careers.js`, `src/data/company.js` – team, openings, contact details
- `src/lib/enquiry.js` – proposal request: payload, email text, sending (shared by site and server)
- `server/index.js` – `/api/enquiry` email endpoint; also serves `dist/` in production
- `src/components/` – page sections, dialogs, floating "Talk to an expert" button, careers page

## Proposal requests ("I'm interested" → Request a proposal)

Visitors shortlist offerings, fill in a short form, and get a reference number such as
`MS-261108-K7Q2`. The server emails the request to your team (Reply-To is the visitor, so you can
answer directly) and sends the visitor an acknowledgement.

### Set up email
1. Copy `.env.example` to `.env` (it is git-ignored, so passwords stay local).
2. Fill in your SMTP account:
   ```ini
   VITE_ENQUIRY_URL=/api/enquiry
   SMTP_HOST=smtp.office365.com      # or smtp.gmail.com, smtp.zoho.in, your provider's host
   SMTP_PORT=587
   SMTP_SECURE=false                 # true for port 465
   SMTP_USER=no-reply@mindsuite.in
   SMTP_PASS=app-password-here       # use an app password where the provider requires one
   MAIL_FROM="MindSuite <no-reply@mindsuite.in>"
   MAIL_TO=info@mindsuite.in
   ```
3. `npm start`. The log shows `SMTP ready: …` when the account connects.

### Preview mode (no SMTP yet)
With `SMTP_HOST` empty the server sends nothing. Each email is saved to `server/outbox/*.eml`
(open it in Outlook or any mail app) so you can check content before going live.

### Without the server
If `VITE_ENQUIRY_URL` is empty at build time, submitting opens the visitor's email app with the
full request addressed to info@mindsuite.in, so the form still works on purely static hosting.

### Protection built in
- Offering names come from the catalogue, never from submitted text; unknown ids are dropped.
- Field validation and length limits; 64 KB request limit; HTML in messages is escaped.
- Rate limit: 5 requests per visitor per 15 minutes (`RATE_LIMIT_MAX`, `RATE_LIMIT_MINUTES`).
- Only the site's own address (plus `ALLOWED_ORIGINS`) may post from a browser.
- Hidden spam-trap field: bot submissions get a normal reply but nothing is sent.

## Hosting
- **One Node process (simplest):** `npm start` on any Node 20+ host; put it behind your web server or
  load balancer with HTTPS. Set `NODE_ENV=production`.
- **Static host + separate API:** deploy `dist/` anywhere, run `npm run server` elsewhere, build with
  `VITE_ENQUIRY_URL=https://api.your-domain/api/enquiry`, and set `ALLOWED_ORIGINS` to the site's URL.

## AI recommendations (optional)
The guide matches catalogue terms locally by default. To use an AI backend, set
`VITE_ASSISTANT_URL` to an endpoint that accepts `POST {messages}` and returns
`{message, mode, suggestions: [{id, reason}]}` (and `GET` → `{mode}`).
