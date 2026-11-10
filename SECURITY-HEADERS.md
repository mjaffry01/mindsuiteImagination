# Security headers for dev.mindsuite.in

The website already carries a Content Security Policy and a referrer policy inside every page
(`<meta>` tags), so it is protected on any host. Some protections only work as real HTTP
headers sent by the server. This note lists them for whoever manages the domain.

Build for the domain with:

```
npm run build:mindsuite
```

The build writes `dist/_headers` with the exact values below, matching that build.

## If the site is on Cloudflare Pages

Nothing to do: Cloudflare Pages reads `_headers` from the uploaded folder automatically.

## If the site is a server behind Cloudflare (proxied DNS)

In the Cloudflare dashboard for **mindsuite.in**:

1. **Rules → Transform Rules → Modify Response Header → Create rule**
2. Name: `Website security headers`
3. When incoming requests match: **Custom filter expression**: Hostname equals `dev.mindsuite.in`
   (later also `www.mindsuite.in`)
4. Then: **Set static** for each header below, copying the value from `dist/_headers`:

| Header | Purpose |
| --- | --- |
| `Content-Security-Policy` | Only the site's own scripts run; `frame-ancestors 'none'` stops other sites framing it (clickjacking). |
| `X-Frame-Options: DENY` | The same anti-framing protection for older browsers. |
| `X-Content-Type-Options: nosniff` | Browsers use files only as the type the server states. |
| `Referrer-Policy: strict-origin-when-cross-origin` | Other sites see only the domain a visitor came from. |
| `Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=()` | The site can never ask for these. |
| `Strict-Transport-Security: max-age=31536000; includeSubDomains` | Browsers only use HTTPS for a year. Turn on only once every `dev.` subdomain works over HTTPS. |
| `Cross-Origin-Opener-Policy: same-origin` | Other windows can't reach into this one. |

Also recommended in Cloudflare:

- **SSL/TLS → Overview**: mode **Full (strict)**.
- **SSL/TLS → Edge Certificates**: **Always Use HTTPS** on, **Minimum TLS Version** 1.2.
- **Security → WAF**: switch on the Cloudflare managed rules, and a rate-limiting rule for
  `/api/enquiry` and `/api/assistant` (the server limits these too).
- **DNS → Settings**: enable **DNSSEC**.

## Check

```
curl -sI https://dev.mindsuite.in/ | grep -iE "content-security|x-frame|x-content|referrer|permissions|strict-transport"
```

All seven headers should be listed. Or use https://securityheaders.com.

## When the site changes

If the site starts loading anything from another domain (fonts, analytics, a chat widget),
add that domain in `vite.config.js` (`IMAGE_HOSTS` or `contentSecurityPolicy`) and rebuild,
or browsers will block it. Update the Privacy notice (`src/data/privacy.js`) at the same time.
