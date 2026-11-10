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
   MAIL_TO=no-reply@mindsuite.in     # team copy with everything the visitor entered
   MAIL_REPLY_TO=info@mindsuite.in   # where the visitor's replies go
   ```
3. `npm start`. The log shows `SMTP ready: …` when the account connects.

### Microsoft 365 with OAuth2 (when password sign-in is blocked)
If the log shows `535 5.7.3 Authentication unsuccessful`, the tenant blocks password sign-in for
SMTP. Use an app registration instead; the server then fetches a token itself (client credentials)
and signs in to SMTP with it.

1. **Entra admin centre → App registrations → New registration** ("MindSuite website mail",
   single tenant). Copy the **Application (client) ID** and **Directory (tenant) ID**.
2. **Certificates & secrets → New client secret.** Copy the secret's **Value** (shown once).
3. **API permissions → Add a permission → APIs my organization uses → Office 365 Exchange Online →
   Application permissions → `SMTP.SendAsApp`**, then **Grant admin consent**.
4. **Enterprise applications →** open the same app and copy its **Object ID** (this one, not the
   app registration's object ID).
5. In Exchange Online PowerShell, as an admin:
   ```powershell
   Install-Module ExchangeOnlineManagement   # first time only
   Connect-ExchangeOnline
   New-ServicePrincipal -AppId <client-id> -ObjectId <enterprise-app-object-id> -DisplayName "MindSuite website mail"
   Add-MailboxPermission -Identity info@mindsuite.in -User <enterprise-app-object-id> -AccessRights FullAccess
   Set-CASMailbox -Identity info@mindsuite.in -SmtpClientAuthenticationDisabled $false
   Add-RecipientPermission -Identity no-reply@mindsuite.in -Trustee info@mindsuite.in -AccessRights SendAs -Confirm:$false
   ```
   `no-reply@mindsuite.in` must exist; a free shared mailbox is enough.
6. In `.env`, keep `SMTP_HOST=smtp.office365.com`, `SMTP_USER=info@mindsuite.in`, and fill in
   `SMTP_OAUTH_TENANT_ID`, `SMTP_OAUTH_CLIENT_ID` and `SMTP_OAUTH_CLIENT_SECRET`.
7. Restart the server: the log shows `SMTP ready (oauth2): …`. Permission changes can take up to
   an hour to apply. Client secrets expire (default 6–24 months): create a new one before then.

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

## AI recommendations ("Help me choose" guide)
The guide uses Claude (`claude-opus-5-5`) through the same Node server, at `/api/assistant`
(`server/assistant.js`). The whole catalogue is sent as a cached system prompt, so the guide
recommends only real offerings and asks a clarifying question when a need is vague.

1. Create an API key at https://console.anthropic.com and put it in `.env` as `ANTHROPIC_API_KEY`
   (never in the website code: GitHub Pages files are public).
2. Build the site with `VITE_ASSISTANT_URL=/api/assistant` (or the full URL of your API host, and add
   the site's address to `ALLOWED_ORIGINS`).
3. `npm run server` logs `Guide: AI recommendations with claude-opus-5-5` when it is ready.

Without a key, or whenever the server is unreachable, the guide falls back to its built-in keyword
matching, so the website keeps working. Each visitor is limited to `ASSISTANT_RATE_LIMIT_MAX`
messages per `ASSISTANT_RATE_LIMIT_MINUTES`. Every reply logs its token use. The catalogue is about
33,000 tokens: while it is cached a reply costs roughly 1–3 US cents, and the first message after
5 quiet minutes re-caches it for about 15–20 cents.
