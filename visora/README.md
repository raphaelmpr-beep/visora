# Visora.ai — Website AI Visibility Scanner (MVP)

Visora scans any website and grades its visibility readiness for Google AI Overviews,
Bing Copilot, ChatGPT search, structured data, and UX instrumentation using official
guidance from Google Search Central, Microsoft Clarity, Bing Webmaster Tools,
OpenAI Crawler Docs, Schema.org, WCAG 2.2, and xAI's open-source X Algorithm scoring methodology.

---

## Folder Structure

```
visora/
  index.html              Landing page + scanner UI
  assets/
    css/styles.css        All styles (Perplexity × Grok theme)
    js/config.js          API base URL config (dev vs prod)
    js/apis.js            All API call functions
    js/app.js             Scoring engine + UI wiring
  server/
    proxy.js              Express proxy server (keeps API keys server-side)
    package.json          Server dependencies
  .env                    Your API keys (never committed)
  .env.example            Safe template to share
  .github/
    workflows/
      deploy.yml          Auto-deploy to GitHub Pages on push
  .gitignore
  README.md
```

---

## Quick Start

### 1. Clone & install

```bash
git clone https://github.com/YOUR_USERNAME/visora.git
cd visora
cd server && npm install && cd ..
```

### 2. Set up environment

```bash
cp .env.example .env
# Open .env in VS Code and fill in your API keys
```

### 3. Get API keys

| API | Where to get it | Free tier |
|-----|----------------|-----------|
| Google PageSpeed Insights | [console.cloud.google.com](https://console.cloud.google.com) → Enable PageSpeed API → Credentials | 25k calls/day |
| Bing Webmaster | [bing.com/webmasters](https://www.bing.com/webmasters) → Settings → API Access | Free |
| Etsy API | [etsy.com/developers/register](https://www.etsy.com/developers/register) | Free |
| W3C Validator | No key needed — public REST API | Free |
| Shopify public JSON | No key needed — public store endpoints | Free |

### 4. Run locally

```bash
# Terminal 1 — start proxy server
cd server && node proxy.js
# Terminal 2 — serve frontend
python -m http.server 3000
# Open http://localhost:3000
```

---

## Deploy to GitHub Pages

Push to `main` — GitHub Actions will auto-deploy the frontend to Pages.

The proxy server must be deployed separately (Railway, Render, Fly.io, or Vercel).

---

## Scoring methodology

- **Search Foundation (40%)** — Google SEO Starter Guide + Google AI Optimization Guide (May 2026)
- **AI Visibility (40%)** — OpenAI Crawler Docs + Bing AI Performance + Schema.org
- **UX Instrumentation (20%)** — Microsoft Clarity + WCAG 2.2

Pipeline architecture inspired by [xAI's open-source X Algorithm](https://github.com/xai-org/x-algorithm) (Apache 2.0).

All trademarks are the property of their respective owners. References do not imply endorsement.

---

## Future modules (roadmap)
- X post visibility scoring (xAI algorithm methodology)
- Weekly automated rescans with email diff reports
- Competitor benchmarking
- Stripe billing integration
- Shopify App Store listing
