# CETU PACT Web

Static React frontend for the PACT tool.

## Local Development

```bash
npm install
npm run dev
```

The app reads `VITE_PACT_API_BASE_URL` for the PACT API origin. Frontend env values are public browser configuration only and must not contain secrets.

## Deployment Paths

Staging and production are intentionally separate Cloudflare Pages deployments.

| Target | Env file | Build command | Wrangler deploy command | Pages project | Pages branch |
| --- | --- | --- | --- | --- | --- |
| Staging | `.env.staging` | `npm run build:staging` | `npm run deploy:staging` | `cetu-pact-web-staging` | `staging` |
| Production | `.env.production` | `npm run build:production` | `npm run deploy:production` | `cetu-pact-web` | `production` |

The deployment scripts require `VITE_PACT_API_BASE_URL` to be HTTPS, non-local, and non-placeholder. Staging requires a clearly named staging API host; production rejects staging hosts.

Security headers are served by Cloudflare Pages from `public/_headers`. If PACT API or LMS launch origins change, update the CSP `connect-src`, `form-action`, and `frame-ancestors` directives before deploying.

Use a Cloudflare API token only in the current shell session:

```powershell
$env:CLOUDFLARE_API_TOKEN = "paste-token-here"
npm run deploy:staging
npm run deploy:production
```

## GitHub

GitHub houses repository code only. Deployments are managed intentionally with Wrangler from an authenticated operator workstation or controlled deployment host.
