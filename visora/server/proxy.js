/**
 * Visora Proxy Server
 * ───────────────────
 * Keeps all API keys server-side. Exposes safe endpoints to the frontend.
 *
 * Endpoints:
 *   GET /api/health            — verify keys are loaded
 *   GET /api/fetch?url=        — fetch any external URL (HTML, robots.txt, sitemap)
 *   GET /api/pagespeed?url=    — Google PageSpeed Insights v5
 *   GET /api/w3c?url=          — W3C HTML Validator (no key needed)
 *   GET /api/bing-indexnow?url= — check IndexNow implementation
 *   GET /api/etsy-shop?shopId= — Etsy shop public data
 *   GET /api/shopify-store?shop= — Shopify store public JSON
 */
import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import { config } from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { readFile, writeFile } from "fs/promises";
import { checkRateLimit, setRateLimitEnabled, setRateLimitValue, getRateLimitValue, getRateLimitEnabled } from "./rateLimit.js";
// Load .env from project root (one level up from server/)
const __dirname = dirname(fileURLToPath(import.meta.url));
const ENV_PATH = resolve(__dirname, "../.env");
config({ path: ENV_PATH });
const app = express();
app.use(cors({ origin: "*" }));
app.use(express.json());
// Rate limit middleware
app.use((req, res, next) => {
  // Only rate limit API endpoints, not admin endpoints
  if (req.path.startsWith("/api/")) {
    const ip = req.headers["x-forwarded-for"]?.split(",")[0] || req.socket.remoteAddress;
    if (ip === "127.0.0.1" || ip === "::1" || ip === "::ffff:127.0.0.1") {
      return next();
    }
    const rate = checkRateLimit(ip);
    if (!rate.allowed) {
      return res.status(429).json({ error: `Rate limit exceeded. Try again in ${Math.ceil(rate.retryAfter/1000/60)} min.` });
    }
  }
  next();
});
// Admin API for toggling rate limit and setting value
app.post("/admin/rate-limit", (req, res) => {
  const { enabled, limit } = req.body;
  if (typeof enabled === "boolean") {
    setRateLimitEnabled(enabled);
  }
  if (typeof limit === "number" && Number.isFinite(limit) && limit > 0) {
    setRateLimitValue(Math.floor(limit));
  }
  res.json({ enabled: getRateLimitEnabled(), limit: getRateLimitValue() });
});
app.get("/admin/rate-limit", (_req, res) => {
  res.json({ enabled: getRateLimitEnabled(), limit: getRateLimitValue() });
});

app.get("/admin/env-status", (_req, res) => {
  res.json({
    pagespeed: PSI_KEY ? "loaded" : "missing",
    bing: BING_KEY ? "loaded" : "missing",
    etsy: ETSY_KEY ? "loaded" : "missing",
  });
});

app.post("/admin/env", async (req, res) => {
  try {
    const updates = {};

    if (typeof req.body.pagespeedKey === "string" && req.body.pagespeedKey.trim()) {
      updates.PAGESPEED_API_KEY = req.body.pagespeedKey.trim();
    }
    if (typeof req.body.bingKey === "string" && req.body.bingKey.trim()) {
      updates.BING_WEBMASTER_API_KEY = req.body.bingKey.trim();
    }
    if (typeof req.body.etsyKey === "string" && req.body.etsyKey.trim()) {
      updates.ETSY_API_KEY = req.body.etsyKey.trim();
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: "No valid key updates provided." });
    }

    await updateEnvValues(updates);

    res.json({
      ok: true,
      updated: Object.keys(updates),
      status: {
        pagespeed: PSI_KEY ? "loaded" : "missing",
        bing: BING_KEY ? "loaded" : "missing",
        etsy: ETSY_KEY ? "loaded" : "missing",
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
const PORT = process.env.PORT || 4173;
let PSI_KEY = process.env.PAGESPEED_API_KEY || "";
let BING_KEY = process.env.BING_WEBMASTER_API_KEY || "";
let ETSY_KEY = process.env.ETSY_API_KEY || "";

function upsertEnv(content, key, value) {
  const pattern = new RegExp(`^${key}=.*$`, "m");
  const sanitized = String(value ?? "").replace(/[\r\n]/g, "").trim();
  if (pattern.test(content)) {
    return content.replace(pattern, `${key}=${sanitized}`);
  }
  const newline = content.endsWith("\n") ? "" : "\n";
  return `${content}${newline}${key}=${sanitized}\n`;
}

async function updateEnvValues(updates) {
  let content = "";
  try {
    content = await readFile(ENV_PATH, "utf8");
  } catch {
    content = "";
  }

  for (const [key, value] of Object.entries(updates)) {
    if (typeof value === "string") {
      content = upsertEnv(content, key, value);
      process.env[key] = value;
    }
  }

  await writeFile(ENV_PATH, content, "utf8");
  PSI_KEY = process.env.PAGESPEED_API_KEY || "";
  BING_KEY = process.env.BING_WEBMASTER_API_KEY || "";
  ETSY_KEY = process.env.ETSY_API_KEY || "";
}
// ── Health check ─────────────────────────────────────────────
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    keys: {
      pagespeed : !!PSI_KEY  ? "loaded" : "missing",
      bing      : !!BING_KEY ? "loaded" : "missing",
      etsy      : !!ETSY_KEY ? "loaded" : "missing",
      w3c       : "public (no key needed)",
      shopify   : "public (no key needed)",
    },
  });
});
// ── Generic URL fetcher ───────────────────────────────────────
// Used for: page HTML, robots.txt, sitemap.xml, key files
app.get("/api/fetch", async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: "url param required" });
  try {
    const r = await fetch(url, {
      headers: {
        "User-Agent": "Visora-Scanner/1.0 (+https://visora.ai/bot)",
        Accept: "text/html,application/xhtml+xml,text/plain,*/*",
      },
      signal: AbortSignal.timeout(12000),
      redirect: "follow",
    });
    const text = await r.text();
    res.json({ ok: r.ok, status: r.status, contentType: r.headers.get("content-type"), body: text });
  } catch (err) {
    res.status(500).json({ error: err.message, ok: false });
  }
});
// ── Google PageSpeed Insights v5 ─────────────────────────────
// Docs: https://developers.google.com/speed/docs/insights/v5/get-started
// Returns real Core Web Vitals + Lighthouse scores
app.get("/api/pagespeed", async (req, res) => {
  const { url, strategy = "mobile" } = req.query;
  if (!url) return res.status(400).json({ error: "url param required" });
  const endpoint =
    `https://www.googleapis.com/pagespeedonline/v5/runPagespeed` +
    `?url=${encodeURIComponent(url)}` +
    `&strategy=${strategy}` +
    `&category=performance&category=seo&category=accessibility&category=best-practices` +
    (PSI_KEY ? `&key=${PSI_KEY}` : "");
  try {
    const r = await fetch(endpoint, { signal: AbortSignal.timeout(30000) });
    if (!r.ok) return res.status(r.status).json({ error: await r.text() });
    const data = await r.json();
    const lhr = data.lighthouseResult;
    const cwv = data.loadingExperience?.metrics || {};
    const auditScore = (primary, legacy) => {
      const score = lhr?.audits?.[primary]?.score ?? lhr?.audits?.[legacy]?.score;
      return score === 1;
    };
    res.json({
      // Lighthouse category scores (0-1, multiply by 100 for %)
      performanceScore    : lhr?.categories?.performance?.score          ?? null,
      seoScore            : lhr?.categories?.seo?.score                  ?? null,
      accessibilityScore  : lhr?.categories?.accessibility?.score        ?? null,
      bestPracticesScore  : lhr?.categories?.["best-practices"]?.score   ?? null,
      // Core Web Vitals (real-user CrUX data)
      lcp  : cwv?.LARGEST_CONTENTFUL_PAINT_MS         ?? null,
      cls  : cwv?.CUMULATIVE_LAYOUT_SHIFT_SCORE        ?? null,
      inp  : cwv?.INTERACTION_TO_NEXT_PAINT            ?? null,
      fcp  : cwv?.FIRST_CONTENTFUL_PAINT_MS            ?? null,
      // Binary Lighthouse audits used by Visora rule checks
      hasViewport       : auditScore("viewport", "viewport"),
      hasDocTitle       : auditScore("document-title", "document_title"),
      hasMetaDesc       : auditScore("meta-description", "meta_description"),
      imagesHaveAlt     : auditScore("image-alt", "image_alt"),
      canonicalPresent  : auditScore("canonical", "canonical"),
      structuredData    : auditScore("structured-data", "structured_data"),
      tapTargets        : auditScore("tap-targets", "tap_targets"),
      linksDescriptive  : auditScore("link-text", "link_text"),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// ── W3C HTML Validator ────────────────────────────────────────
// Docs: https://validator.w3.org/docs/api.html  — public, no key
app.get("/api/w3c", async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: "url param required" });
  try {
    const r = await fetch(
      `https://validator.w3.org/nu/?doc=${encodeURIComponent(url)}&out=json`,
      { headers: { "User-Agent": "Visora-Scanner/1.0" }, signal: AbortSignal.timeout(20000) }
    );
    const data = await r.json();
    const errors   = (data.messages || []).filter(m => m.type === "error");
    const warnings = (data.messages || []).filter(m => m.type === "info" || m.type === "warning");
    res.json({ errorCount: errors.length, warningCount: warnings.length, errors: errors.slice(0,10), warnings: warnings.slice(0,10) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// ── IndexNow / Bing check ─────────────────────────────────────
// Checks if robots.txt references IndexNow or a key file exists
app.get("/api/bing-indexnow", async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: "url param required" });
  const origin = new URL(url).origin;
  const localFetch = (u) =>
    fetch(`http://localhost:${PORT}/api/fetch?url=${encodeURIComponent(u)}`).then(r => r.json());
  try {
    const [robots, keyFile] = await Promise.allSettled([
      localFetch(`${origin}/robots.txt`),
      localFetch(`${origin}/indexnow.txt`),
    ]);
    const robotsBody = robots.status === "fulfilled" ? robots.value.body || "" : "";
    const keyFileOk  = keyFile.status === "fulfilled" && keyFile.value.ok &&
                       (keyFile.value.body || "").trim().length >= 32;
    res.json({
      implemented      : /indexnow/i.test(robotsBody) || keyFileOk,
      keyFileFound     : keyFileOk,
      robotsHasIndexNow: /indexnow/i.test(robotsBody),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// ── Etsy Shop public data ─────────────────────────────────────
// Docs: https://developer.etsy.com/documentation/
// Public shop data — no OAuth required for read-only shop info
app.get("/api/etsy-shop", async (req, res) => {
  const { shopId } = req.query;
  if (!shopId) return res.status(400).json({ error: "shopId param required" });
  if (!ETSY_KEY) return res.status(400).json({ error: "ETSY_API_KEY not set in .env" });
  try {
    const r = await fetch(
      `https://openapi.etsy.com/v3/application/shops/${shopId}`,
      { headers: { "x-api-key": ETSY_KEY, Accept: "application/json" }, signal: AbortSignal.timeout(10000) }
    );
    if (!r.ok) return res.status(r.status).json({ error: "Etsy API error", detail: await r.text() });
    const shop = await r.json();
    res.json({
      shopName       : shop.shop_name,
      url            : shop.url,
      title          : shop.title,
      announcement   : shop.announcement,
      listingCount   : shop.listing_active_count,
      hasAbout       : !!(shop.sale_message || shop.digital_sale_message),
      hasPolicy      : shop.policy_welcome !== "",
      externalWebsite: shop.website || null,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// ── Shopify store public JSON ─────────────────────────────────
// Docs: https://shopify.dev/docs/api/storefront
// Uses public /meta.json and /pages.json — no auth needed
app.get("/api/shopify-store", async (req, res) => {
  const { shop } = req.query; // e.g. "mystore.myshopify.com"
  if (!shop) return res.status(400).json({ error: "shop param required" });
  try {
    const [metaR, pagesR] = await Promise.allSettled([
      fetch(`https://${shop}/meta.json`,          { signal: AbortSignal.timeout(8000) }),
      fetch(`https://${shop}/pages.json?limit=10`, { signal: AbortSignal.timeout(8000) }),
    ]);
    const meta  = metaR.status  === "fulfilled" && metaR.value.ok  ? await metaR.value.json()  : null;
    const pages = pagesR.status === "fulfilled" && pagesR.value.ok ? await pagesR.value.json() : null;
    res.json({
      shopName       : meta?.name         || null,
      description    : meta?.description  || null,
      domain         : meta?.domain       || null,
      externalDomain : meta?.domain !== shop ? meta?.domain : null,
      pagesCount     : pages?.pages?.length || 0,
      hasAboutPage   : pages?.pages?.some(p => /about|our story|who we are/i.test(p.title)),
      hasContactPage : pages?.pages?.some(p => /contact|get in touch/i.test(p.title)),
      hasPolicyPage  : pages?.pages?.some(p => /policy|privacy|terms/i.test(p.title)),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.listen(PORT, () => {
  console.log(`\n✅  Visora proxy running → http://localhost:${PORT}`);
  console.log(`    PageSpeed API  : ${PSI_KEY  ? "✓ loaded" : "✗ missing — add PAGESPEED_API_KEY to .env"}`);
  console.log(`    Bing API       : ${BING_KEY ? "✓ loaded" : "✗ missing — add BING_WEBMASTER_API_KEY to .env"}`);
  console.log(`    Etsy API       : ${ETSY_KEY ? "✓ loaded" : "✗ missing — add ETSY_API_KEY to .env"}`);
  console.log(`    W3C Validator  : ✓ public (no key)`);
  console.log(`    Shopify        : ✓ public (no key)\n`);
});
