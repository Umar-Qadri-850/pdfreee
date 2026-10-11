# Deployment

Pdfreee builds to static files. There are two supported paths: Docker (nginx)
and any static host.

## 0. Set the site origin first

The origin is baked into canonical URLs, the sitemap and robots.txt at build
time, so set it **before** building:

```bash
# .env
VITE_SITE_URL=https://your-domain.example
```

## 1. Docker

```bash
docker build --build-arg VITE_SITE_URL=https://your-domain.example -t pdfreee .
docker run --rm -p 8080:80 pdfreee
# open http://localhost:8080
```

The image is multi-stage: Node builds the app, then the output is served by
nginx. It includes:

- an nginx config ([`nginx.conf`](nginx.conf)) with SPA fallback, gzip, security
  headers, long-cache for hashed assets, and a `GET /healthz` endpoint;
- a container `HEALTHCHECK` that polls `/healthz`.

## 2. Docker Compose

```bash
VITE_SITE_URL=https://your-domain.example docker compose up --build
```

```yaml
services:
  web:
    build:
      context: .
      args:
        VITE_SITE_URL: ${VITE_SITE_URL:-http://localhost:8080}
    ports:
      - "8080:80"
    restart: unless-stopped
```

## 3. Static hosting (no Docker)

```bash
npm ci
npm run build      # emits dist/ with prerendered routes, sitemap and robots
```

Then publish the `dist/` directory. Because the build writes a real
`index.html` per route, deep links work on hosts that serve directory indexes.

- **Netlify / Cloudflare Pages**: build `npm run build`, publish `dist`.
- **Vercel**: framework preset "Vite", output `dist`.
- **GitHub Pages / S3 + CloudFront**: publish `dist`. If you serve from a
  sub-path (e.g. `/pdfreee/`), set Vite's `base` and adjust `VITE_SITE_URL`
  accordingly — this repository assumes serving from the domain root.

### SPA fallback (optional safety net)

Every known route is prerendered, so a fallback is only needed for unknown
paths. For hosts that support it:

- Netlify — add `dist/_redirects` containing `/* /index.html 200`.
- nginx — already configured via `try_files`.

## 4. Verify a deployment

```bash
# Health endpoint (Docker/nginx path)
curl -fsS https://your-domain.example/healthz

# Deep-link metadata: should print the route's title, not the home title
curl -fsS https://your-domain.example/merge-pdf | grep -o '<title>[^<]*</title>'

# Robots and sitemap should use the real origin
curl -fsS https://your-domain.example/robots.txt
curl -fsS https://your-domain.example/sitemap.xml | head
```

## 5. Caveats

- The nginx Content-Security-Policy allows only same-origin scripts. Adding
  AdSense or any third-party script requires editing `script-src`/`connect-src`.
- Password-protected PDFs are rejected with a clear message; unlocking is not a
  feature.
- There is no backend. If you add analytics later, prefer a privacy-respecting,
  self-hosted option and disclose it in the privacy policy.
