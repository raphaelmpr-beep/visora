const runScanBtn = document.getElementById("run-scan");
const urlInput = document.getElementById("url-input");
const resultsEl = document.getElementById("results");
const platformHintEl = document.getElementById("platform-hint");
const platformButtons = document.querySelectorAll(".platform-btn");
const themeToggle = document.getElementById("theme-toggle");

const PLATFORM_CONFIG = {
  web: {
    label: "Website",
    placeholder: "https://yourstore.com",
    hint: "Enter any website URL - blog, SaaS, portfolio, landing page."
  },
  shopify: {
    label: "Shopify",
    placeholder: "mystore.myshopify.com",
    hint: "Enter your Shopify store domain."
  },
  etsy: {
    label: "Etsy",
    placeholder: "ShopName or etsy.com/shop/ShopName",
    hint: "Enter your Etsy shop name, URL, or shop ID."
  }
};

const IMPACT_PRIORITY = { high: 3, medium: 2, low: 1 };
const SCORE_MAP = { pass: 1, warn: 0.5, fail: 0, locked: null };
const PILLARS = [
  { key: "search", name: "Search Foundation", weight: 0.4, className: "search" },
  { key: "ai", name: "AI Visibility", weight: 0.4, className: "ai" },
  { key: "ux", name: "UX Instrumentation", weight: 0.2, className: "ux" }
];

let currentPlatform = "web";
let scanCount = 249;

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function normalizeHttpUrl(raw) {
  const candidate = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  const parsed = new URL(candidate);
  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error("Invalid URL protocol.");
  }
  return parsed.toString();
}

function extractShopifyDomain(raw) {
  const cleaned = raw.trim().replace(/^https?:\/\//i, "").replace(/\/$/, "");
  const domain = cleaned.split("/")[0].toLowerCase();
  if (!domain.includes(".")) {
    throw new Error("Enter a valid Shopify domain.");
  }
  return domain;
}

function extractEtsyShop(raw) {
  const cleaned = raw.trim();
  if (!cleaned) throw new Error("Enter a valid Etsy shop.");
  if (/etsy\.com\/shop\//i.test(cleaned)) {
    const normalized = cleaned.replace(/^https?:\/\//i, "");
    const match = normalized.match(/etsy\.com\/shop\/([^/?#]+)/i);
    if (match && match[1]) return decodeURIComponent(match[1]);
  }
  return cleaned.replace(/^@/, "").replace(/\/$/, "");
}

function setPlatform(platform) {
  currentPlatform = platform;
  const config = PLATFORM_CONFIG[platform];
  urlInput.placeholder = config.placeholder;
  platformHintEl.textContent = config.hint;

  platformButtons.forEach((button) => {
    const active = button.dataset.platform === platform;
    button.classList.toggle("active", active);
    button.setAttribute("aria-selected", String(active));
  });
}

function resolveInput(platform, raw) {
  if (platform === "web") {
    const url = normalizeHttpUrl(raw);
    return { displayTarget: url, url, shop: null, etsyShop: null };
  }

  if (platform === "shopify") {
    const shop = extractShopifyDomain(raw);
    return { displayTarget: shop, url: `https://${shop}`, shop, etsyShop: null };
  }

  const etsyShop = extractEtsyShop(raw);
  return {
    displayTarget: etsyShop,
    url: `https://www.etsy.com/shop/${encodeURIComponent(etsyShop)}`,
    shop: null,
    etsyShop
  };
}

function getRuleLibrary() {
  return [
    {
      id: "title-tag",
      title: "Unique document title",
      pillar: "search",
      source: "google",
      evaluate: (ctx) => ({
        status: ctx.web.ps?.hasDocTitle ? "pass" : "fail",
        impact: "high",
        detail: "Title tags help AI and search engines classify intent."
      })
    },
    {
      id: "meta-description",
      title: "Meta description present",
      pillar: "search",
      source: "google",
      evaluate: (ctx) => ({
        status: ctx.web.ps?.hasMetaDesc ? "pass" : "warn",
        impact: "medium",
        detail: "Descriptions improve snippet quality in search surfaces."
      })
    },
    {
      id: "canonical",
      title: "Canonical URL configured",
      pillar: "search",
      source: "google",
      evaluate: (ctx) => ({
        status: ctx.web.ps?.canonicalPresent ? "pass" : "warn",
        impact: "medium",
        detail: "Canonicals consolidate duplicate URL signals."
      })
    },
    {
      id: "html-valid",
      title: "HTML validation health",
      pillar: "search",
      source: "w3c",
      evaluate: (ctx) => {
        const count = ctx.web.w3c?.errorCount ?? 0;
        const status = count === 0 ? "pass" : count <= 5 ? "warn" : "fail";
        const impact = count > 5 ? "high" : "medium";
        return {
          status,
          impact,
          detail: `${count} validator errors detected.`
        };
      }
    },
    {
      id: "structured-data",
      title: "Structured data available",
      pillar: "ai",
      source: "google",
      evaluate: (ctx) => ({
        status: ctx.web.ps?.structuredData ? "pass" : "fail",
        impact: "high",
        detail: "Schema improves machine readability and rich result eligibility."
      })
    },
    {
      id: "indexnow",
      title: "IndexNow signaling",
      pillar: "ai",
      source: "bing",
      evaluate: (ctx) => ({
        status: ctx.web.bing?.implemented ? "pass" : "warn",
        impact: "medium",
        detail: "Fast URL submission improves recrawl speed for changes."
      })
    },
    {
      id: "viewport",
      title: "Mobile viewport",
      pillar: "ux",
      source: "google",
      evaluate: (ctx) => ({
        status: ctx.web.ps?.hasViewport ? "pass" : "fail",
        impact: "high",
        detail: "Viewport configuration is required for mobile-first rendering."
      })
    },
    {
      id: "tap-targets",
      title: "Tap target sizing",
      pillar: "ux",
      source: "w3c",
      evaluate: (ctx) => ({
        status: ctx.web.ps?.tapTargets ? "pass" : "warn",
        impact: "medium",
        detail: "Tap targets should be large and spaced for touch usage."
      })
    },
    {
      id: "image-alt",
      title: "Image alt semantics",
      pillar: "ux",
      source: "w3c",
      evaluate: (ctx) => ({
        status: ctx.web.ps?.imagesHaveAlt ? "pass" : "warn",
        impact: "medium",
        detail: "Alt text improves assistive reading and model understanding."
      })
    },
    {
      id: "links-descriptive",
      title: "Descriptive links",
      pillar: "ux",
      source: "google",
      evaluate: (ctx) => ({
        status: ctx.web.ps?.linksDescriptive ? "pass" : "warn",
        impact: "low",
        detail: "Clear link text strengthens context extraction."
      })
    },
    {
      id: "seo-score",
      title: "SEO baseline score",
      pillar: "search",
      source: "google",
      evaluate: (ctx) => {
        const value = Math.round((ctx.web.ps?.seoScore ?? 0) * 100);
        return {
          status: value >= 90 ? "pass" : value >= 70 ? "warn" : "fail",
          impact: "high",
          detail: `Lighthouse SEO score is ${value}/100.`
        };
      }
    },
    {
      id: "accessibility-score",
      title: "Accessibility baseline",
      pillar: "ux",
      source: "w3c",
      evaluate: (ctx) => {
        const value = Math.round((ctx.web.ps?.accessibilityScore ?? 0) * 100);
        return {
          status: value >= 90 ? "pass" : value >= 70 ? "warn" : "fail",
          impact: "medium",
          detail: `Accessibility score is ${value}/100.`
        };
      }
    },
    {
      id: "performance-score",
      title: "Performance readiness",
      pillar: "ux",
      source: "google",
      evaluate: (ctx) => {
        const value = Math.round((ctx.web.ps?.performanceScore ?? 0) * 100);
        return {
          status: value >= 80 ? "pass" : value >= 50 ? "warn" : "fail",
          impact: "medium",
          detail: `Performance score is ${value}/100.`
        };
      }
    },
    {
      id: "best-practice-score",
      title: "Best-practice signals",
      pillar: "search",
      source: "google",
      evaluate: (ctx) => {
        const value = Math.round((ctx.web.ps?.bestPracticesScore ?? 0) * 100);
        return {
          status: value >= 85 ? "pass" : value >= 65 ? "warn" : "fail",
          impact: "low",
          detail: `Best-practices score is ${value}/100.`
        };
      }
    },
    {
      id: "lcp-health",
      title: "LCP health",
      pillar: "ux",
      source: "google",
      evaluate: (ctx) => {
        const lcp = ctx.web.ps?.lcp?.percentile ?? null;
        if (!lcp) {
          return { status: "locked", impact: "low", detail: "No CrUX LCP data available." };
        }
        return {
          status: lcp <= 2500 ? "pass" : lcp <= 4000 ? "warn" : "fail",
          impact: "medium",
          detail: `LCP percentile is ${Math.round(lcp)}ms.`
        };
      }
    },
    {
      id: "shopify-trust-pages",
      title: "Trust pages present",
      pillar: "search",
      source: "shopify",
      evaluate: (ctx) => {
        if (ctx.platform !== "shopify") {
          return { status: "locked", impact: "low", detail: "Shopify-only rule." };
        }
        const pass = ctx.shopify?.hasAboutPage && ctx.shopify?.hasContactPage;
        return {
          status: pass ? "pass" : "fail",
          impact: "high",
          detail: "About and Contact pages build trust for shoppers and crawlers."
        };
      }
    },
    {
      id: "shopify-policy-pages",
      title: "Store policies",
      pillar: "ai",
      source: "shopify",
      evaluate: (ctx) => {
        if (ctx.platform !== "shopify") {
          return { status: "locked", impact: "low", detail: "Shopify-only rule." };
        }
        return {
          status: ctx.shopify?.hasPolicyPage ? "pass" : "warn",
          impact: "medium",
          detail: "Policy pages improve buyer confidence and content trust."
        };
      }
    },
    {
      id: "etsy-about",
      title: "Shop About section",
      pillar: "search",
      source: "etsy",
      evaluate: (ctx) => {
        if (ctx.platform !== "etsy") {
          return { status: "locked", impact: "low", detail: "Etsy-only rule." };
        }
        return {
          status: ctx.etsy?.hasAbout ? "pass" : "warn",
          impact: "medium",
          detail: "About content helps with trust and expertise context."
        };
      }
    },
    {
      id: "etsy-policy",
      title: "Shop policies",
      pillar: "ai",
      source: "etsy",
      evaluate: (ctx) => {
        if (ctx.platform !== "etsy") {
          return { status: "locked", impact: "low", detail: "Etsy-only rule." };
        }
        return {
          status: ctx.etsy?.hasPolicy ? "pass" : "warn",
          impact: "medium",
          detail: "Policy completeness strengthens transactional trust."
        };
      }
    },
    {
      id: "etsy-listings",
      title: "Active listings coverage",
      pillar: "ai",
      source: "etsy",
      evaluate: (ctx) => {
        if (ctx.platform !== "etsy") {
          return { status: "locked", impact: "low", detail: "Etsy-only rule." };
        }
        const count = ctx.etsy?.listingCount ?? 0;
        return {
          status: count >= 10 ? "pass" : count >= 3 ? "warn" : "fail",
          impact: count < 3 ? "high" : "low",
          detail: `${count} active listings detected.`
        };
      }
    }
  ];
}

function evaluateRules(context) {
  const rules = getRuleLibrary().map((rule) => {
    const outcome = rule.evaluate(context);
    return {
      ...rule,
      status: outcome.status,
      impact: outcome.impact,
      detail: outcome.detail
    };
  });

  const pillarScores = { search: 0, ai: 0, ux: 0 };

  PILLARS.forEach((pillar) => {
    const relevant = rules.filter((rule) => rule.pillar === pillar.key && SCORE_MAP[rule.status] !== null);
    if (relevant.length === 0) {
      pillarScores[pillar.key] = 0;
      return;
    }
    const total = relevant.reduce((sum, rule) => sum + SCORE_MAP[rule.status], 0);
    pillarScores[pillar.key] = Math.round((total / relevant.length) * 100);
  });

  const overallScore = Math.round(
    (pillarScores.search * 0.4) +
    (pillarScores.ai * 0.4) +
    (pillarScores.ux * 0.2)
  );

  const topFixes = rules
    .filter((rule) => rule.status === "fail" || rule.status === "warn")
    .sort((a, b) => IMPACT_PRIORITY[b.impact] - IMPACT_PRIORITY[a.impact])
    .slice(0, 8);

  return { rules, pillarScores, overallScore, topFixes };
}

function verdictFromScore(score) {
  if (score >= 80) return "Strong Visibility";
  if (score >= 60) return "Moderate Visibility";
  if (score >= 40) return "Limited Visibility";
  return "Critical Visibility Risk";
}

function renderRuleRows(rules, pillar) {
  const rows = rules.filter((rule) => rule.pillar === pillar);
  return rows.map((rule) => {
    const sourceClass = `source-${rule.source}`;
    return `
      <li class="rule-row">
        <p class="rule-title">${escapeHtml(rule.title)}</p>
        <p class="fix-detail">${escapeHtml(rule.detail)}</p>
        <div class="rule-meta">
          <span class="status-chip status-${rule.status}">${rule.status}</span>
          <span class="source-chip ${sourceClass}">${rule.source}</span>
        </div>
      </li>
    `;
  }).join("");
}

function renderFixes(fixes) {
  if (fixes.length === 0) {
    return "<li class=\"fixes-item\"><p class=\"fix-title\">No critical fixes detected.</p></li>";
  }
  return fixes.map((fix, index) => `
    <li class="fixes-item">
      <span class="fix-index">${index + 1}</span>
      <div>
        <p class="fix-title">${escapeHtml(fix.title)}</p>
        <p class="fix-detail">${escapeHtml(fix.detail)}</p>
      </div>
      <span class="impact-badge impact-${fix.impact}">${fix.impact}</span>
    </li>
  `).join("");
}

function buildScanPayload(resolved, evaluation) {
  return {
    scannedUrl: resolved.url,
    score: evaluation.overallScore,
    buckets: {
      searchFoundation: evaluation.pillarScores.search,
      aiVisibility: evaluation.pillarScores.ai,
      uxInstrumentation: evaluation.pillarScores.ux
    },
    issues: evaluation.topFixes.map((fix) => fix.title),
    platform: currentPlatform,
    capturedAt: new Date().toISOString()
  };
}

function animateScore(score) {
  const numberEl = document.getElementById("score-number");
  const progressCircle = document.getElementById("score-progress");
  if (!numberEl || !progressCircle) return;

  const radius = Number(progressCircle.getAttribute("r"));
  const circumference = 2 * Math.PI * radius;
  progressCircle.style.strokeDasharray = String(circumference);
  progressCircle.style.strokeDashoffset = String(circumference);

  requestAnimationFrame(() => {
    const targetOffset = circumference - ((score / 100) * circumference);
    progressCircle.style.strokeDashoffset = String(targetOffset);
  });

  const duration = 1200;
  const start = performance.now();
  function tick(now) {
    const elapsed = now - start;
    const progress = Math.min(elapsed / duration, 1);
    const value = Math.round(score * progress);
    numberEl.textContent = String(value);
    if (progress < 1) {
      requestAnimationFrame(tick);
    }
  }
  requestAnimationFrame(tick);
}

function applyPillarBars(pillarScores) {
  const searchFill = document.querySelector(".fill-search");
  const aiFill = document.querySelector(".fill-ai");
  const uxFill = document.querySelector(".fill-ux");
  if (!searchFill || !aiFill || !uxFill) return;
  searchFill.style.width = `${pillarScores.search}%`;
  aiFill.style.width = `${pillarScores.ai}%`;
  uxFill.style.width = `${pillarScores.ux}%`;
}

function renderResults(resolved, evaluation) {
  const score = evaluation.overallScore;
  const verdict = verdictFromScore(score);
  scanCount += 1;
  const warningHtml = (evaluation.warnings || []).length
    ? `<div class="loading-panel" style="margin-bottom:12px;"><b>Scan Warnings:</b><br>${evaluation.warnings.map((w) => escapeHtml(w)).join("<br>")}</div>`
    : "";

  resultsEl.innerHTML = `
    ${warningHtml}
    <div class="results-grid">
      <article class="score-card">
        <svg class="score-ring" viewBox="0 0 180 180" aria-hidden="true">
          <defs>
            <linearGradient id="scoreRingGrad" x1="0" x2="1" y1="0" y2="1">
              <stop offset="0%" stop-color="#1ee7cc"></stop>
              <stop offset="100%" stop-color="#4cc2ff"></stop>
            </linearGradient>
          </defs>
          <circle class="track" cx="90" cy="90" r="74"></circle>
          <circle class="progress" id="score-progress" cx="90" cy="90" r="74"></circle>
        </svg>
        <div class="score-meta">
          <p class="url-line">${escapeHtml(resolved.displayTarget)}</p>
          <p class="score-value"><span id="score-number">0</span><span style="font-size:.45em">/100</span></p>
          <p class="verdict">VERDICT <b>${verdict}</b></p>
          <p class="score-sub">Visibility score weighted as (Search x 0.40) + (AI x 0.40) + (UX x 0.20).</p>
          <div class="meta-chips">
            <span>Platform: ${escapeHtml(PLATFORM_CONFIG[currentPlatform].label)}</span>
            <span>Rules: 20</span>
            <span>Scan ID: ${Date.now().toString(16).slice(-8)}</span>
            <span>Scan #${scanCount}</span>
          </div>
        </div>
      </article>

      <article class="pillar-card">
        <h3>Search Foundation</h3>
        <p class="pillar-score">${evaluation.pillarScores.search}/100</p>
        <div class="pillar-meter"><div class="pillar-fill fill-search"></div></div>
        <p class="pillar-copy">Technical health, crawlability, indexability, and site structure.</p>
      </article>

      <article class="pillar-card">
        <h3>AI Visibility</h3>
        <p class="pillar-score">${evaluation.pillarScores.ai}/100</p>
        <div class="pillar-meter"><div class="pillar-fill fill-ai"></div></div>
        <p class="pillar-copy">Machine-readable signals, structured context, and indexing freshness.</p>
      </article>

      <article class="pillar-card">
        <h3>UX Instrumentation</h3>
        <p class="pillar-score">${evaluation.pillarScores.ux}/100</p>
        <div class="pillar-meter"><div class="pillar-fill fill-ux"></div></div>
        <p class="pillar-copy">Accessibility and interaction quality on modern devices.</p>
      </article>
    </div>

    <article class="fixes-card">
      <div class="fixes-head">
        <h2>Top Fixes by Impact</h2>
        <a class="assistant-link" href="updates.html">View Suggested Updates</a>
      </div>
      <ol class="fixes-list">${renderFixes(evaluation.topFixes)}</ol>
    </article>

    <section class="rule-grid">
      <article class="rule-group">
        <h3>Search Foundation</h3>
        <ul class="rule-list">${renderRuleRows(evaluation.rules, "search")}</ul>
      </article>
      <article class="rule-group">
        <h3>AI Visibility</h3>
        <ul class="rule-list">${renderRuleRows(evaluation.rules, "ai")}</ul>
      </article>
      <article class="rule-group">
        <h3>UX Instrumentation</h3>
        <ul class="rule-list">${renderRuleRows(evaluation.rules, "ux")}</ul>
      </article>
    </section>

    <article class="upgrade-card">
      <h2>Upgrade for Continuous Monitoring</h2>
      <p>Track trendlines, benchmark competitors, and receive alerting when your visibility drops.</p>
      <div class="price-chips">
        <span>Starter: $29/mo</span>
        <span>Growth: $99/mo</span>
        <span>Agency: $249/mo</span>
      </div>
    </article>
  `;

  animateScore(score);
  requestAnimationFrame(() => applyPillarBars(evaluation.pillarScores));
}

async function loadWebSignals(url) {
  const defaults = {
    ps: {
      performanceScore: 0,
      seoScore: 0,
      accessibilityScore: 0,
      bestPracticesScore: 0,
      lcp: null,
      hasViewport: false,
      hasDocTitle: false,
      hasMetaDesc: false,
      imagesHaveAlt: false,
      canonicalPresent: false,
      structuredData: false,
      tapTargets: false,
      linksDescriptive: false
    },
    w3c: { errorCount: 0, warningCount: 0 },
    bing: { implemented: false, keyFileFound: false, robotsHasIndexNow: false },
    warnings: []
  };

  const [psResult, w3cResult, bingResult] = await Promise.allSettled([
    fetchPageSpeed(url),
    fetchW3C(url),
    fetchBingIndexNow(url)
  ]);

  if (psResult.status === "fulfilled") {
    defaults.ps = { ...defaults.ps, ...psResult.value };
  } else {
    defaults.warnings.push(`PageSpeed unavailable for ${url}. Falling back to partial scoring.`);
  }

  if (w3cResult.status === "fulfilled") {
    defaults.w3c = { ...defaults.w3c, ...w3cResult.value };
  } else {
    defaults.warnings.push(`W3C validation could not be fetched for ${url}.`);
  }

  if (bingResult.status === "fulfilled") {
    defaults.bing = { ...defaults.bing, ...bingResult.value };
  } else {
    defaults.warnings.push(`IndexNow check could not be completed for ${url}.`);
  }

  return defaults;
}

async function gatherContext(resolved) {
  const context = {
    platform: currentPlatform,
    web: { ps: null, w3c: null, bing: null },
    shopify: null,
    etsy: null,
    warnings: []
  };

  if (currentPlatform === "web") {
    context.web = await loadWebSignals(resolved.url);
    context.warnings.push(...context.web.warnings);
    return context;
  }

  if (currentPlatform === "shopify") {
    try {
      context.shopify = await fetchShopifyStore(resolved.shop);
    } catch {
      context.shopify = {
        hasAboutPage: false,
        hasContactPage: false,
        hasPolicyPage: false
      };
      context.warnings.push(`Shopify storefront metadata unavailable for ${resolved.shop}.`);
    }

    context.web = await loadWebSignals(resolved.url);
    context.warnings.push(...context.web.warnings);
    return context;
  }

  try {
    context.etsy = await fetchEtsyShop(resolved.etsyShop);
  } catch {
    context.etsy = {
      hasAbout: false,
      hasPolicy: false,
      listingCount: 0,
      externalWebsite: null
    };
    context.warnings.push("Etsy API unavailable or key missing; using public-site fallback only.");
  }

  const targetUrl = context.etsy?.externalWebsite || resolved.url;
  context.web = await loadWebSignals(targetUrl);
  context.warnings.push(...context.web.warnings);
  return context;
}

function renderLoading() {
  resultsEl.innerHTML = "<div class=\"loading-panel\">Initializing scan and evaluating 20 visibility rules...</div>";
}

function renderError(message) {
  resultsEl.innerHTML = `<div class=\"error-panel\">Scan failed: ${escapeHtml(message)}</div>`;
}

async function runScan() {
  const raw = urlInput.value.trim();
  if (!raw) {
    renderError("Please enter a URL or shop identifier before scanning.");
    return;
  }

  let resolved;
  try {
    resolved = resolveInput(currentPlatform, raw);
  } catch (error) {
    renderError(error.message || "Unable to parse input.");
    return;
  }

  runScanBtn.disabled = true;
  runScanBtn.textContent = "Scanning...";
  renderLoading();

  try {
    const context = await gatherContext(resolved);
    const evaluation = evaluateRules(context);
    evaluation.warnings = context.warnings;

    sessionStorage.setItem("visora_last_scan", JSON.stringify(buildScanPayload(resolved, evaluation)));

    renderResults(resolved, evaluation);
  } catch (error) {
    renderError(error.message || "Unknown error.");
  } finally {
    runScanBtn.disabled = false;
    runScanBtn.textContent = "Run Scan";
  }
}

platformButtons.forEach((button) => {
  button.addEventListener("click", () => setPlatform(button.dataset.platform));
});

runScanBtn.addEventListener("click", runScan);
urlInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    runScan();
  }
});

themeToggle?.addEventListener("click", () => {
  document.body.classList.toggle("theme-alt");
});

setPlatform("web");
