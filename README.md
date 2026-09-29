# Loophole

A responsive, multi-source video metadata aggregator designed for Cloudflare Workers + D1. Loophole stores permitted metadata and links users to original source pages; it does not bypass authentication, CAPTCHA, DRM, paywalls, anti-bot systems, rate limits, or download restrictions.

## Architecture

Frontend: Vite + React. Backend: Cloudflare Worker + Hono. Data: D1. Scheduled synchronization: Cron Trigger. Source integrations: adapter registry.

## Deploy

1. Install Node.js 20+ and Wrangler.
2. `npm install`
3. `npx wrangler login`
4. Create D1: `npx wrangler d1 create loophole`
5. Put the returned database ID into `wrangler.toml`.
6. Apply migrations locally: `npx wrangler d1 migrations apply loophole --local`
7. Apply migrations remotely: `npx wrangler d1 migrations apply loophole --remote`
8. Set the admin secret: `npx wrangler secret put ADMIN_TOKEN`
9. Build frontend: `npm run build`
10. Deploy Worker: `npx wrangler deploy`

For Pages, deploy `frontend/dist` separately and route `/api/*` to the Worker, or serve the built frontend from a Worker/Pages Functions setup.

## Source adapters

The four requested adult platforms are deliberately not wired to invented endpoints. Configure each only after confirming an official/permitted API, feed, or other authorized integration. Implement an adapter under `worker/adapters/sources/`, register it, normalize results into `NormalizedVideo`, and test it before enabling the source.

Never put source credentials in browser code. Use Worker Secrets. Never re-host third-party media unless the rights and source terms explicitly allow it.

## Production hardening checklist

- Replace bearer admin token with a proper session/OIDC/auth system.
- Add CSRF protection for cookie-authenticated mutations.
- Add durable rate limiting and audit logging.
- Validate source configuration and restrict outbound hosts to configured source domains to reduce SSRF risk.
- Add structured sync jobs with retries/backoff and per-source failure isolation.
- Add age-gate/consent UX and review applicable laws, source terms, and hosting-provider policies before production use.
- Add automated tests for pagination, duplicate constraints, missing metadata, failed adapters, admin authorization, and sync idempotency.

## Admin source testing
The Admin Panel supports API/RSS/Atom/feed/adapter configuration and a server-side Test Connection endpoint. Test requests are restricted to the configured source host or its subdomains, reject private/loopback/metadata hosts, cap response size, and do not expose Worker Secrets. A real source adapter is still required before synchronization can import videos.
