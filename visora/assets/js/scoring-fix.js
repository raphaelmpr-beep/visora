function scoreFromStatus(status) {
  if (status === "pass") return 100;
  if (status === "warn") return 75;
  if (status === "fail") return 50;
  return null;
}

function scoreFromPercent(value) {
  return Number.isFinite(value) ? Math.max(0, Math.min(100, Math.round(value))) : null;
}

const TOP_SITE_BASELINE = {
  performance: { pass: 60, warn: 40 },
  seo: { pass: 92, warn: 85 },
  accessibility: { pass: 90, warn: 80 },
  bestPractices: { pass: 90, warn: 75 },
  lcpMs: { pass: 1800, warn: 2500 }
};

function getRuleLibrary() {
  return [
    {
      id: "title-tag",
      title: "Unique document title",
      pillar: "search",
      source: "google",
      evaluate: (ctx) => {
        if (ctx.web.ps?.hasDocTitle == null) {
          return { status: "locked", impact: "high", detail: "Title tag data unavailable.", score: null };
        }
        const pass = Boolean(ctx.web.ps.hasDocTitle);
        return {
          status: pass ? "pass" : "fail",
          impact: "high",
          detail: "Title tags help AI and search engines classify intent.",
          score: scoreFromStatus(pass ? "pass" : "fail")
        };
      }
    },
    {
      id: "meta-description",
      title: "Meta description present",
      pillar: "search",
      source: "google",
      evaluate: (ctx) => {
        if (ctx.web.ps?.hasMetaDesc == null) {
          return { status: "locked", impact: "medium", detail: "Meta description data unavailable.", score: null };
        }
        const pass = Boolean(ctx.web.ps.hasMetaDesc);
        return {
          status: pass ? "pass" : "warn",
          impact: "medium",
          detail: "Descriptions improve snippet quality in search surfaces.",
          score: scoreFromStatus(pass ? "pass" : "warn")
        };
      }
    },
    {
      id: "canonical",
      title: "Canonical URL configured",
      pillar: "search",
      source: "google",
      evaluate: (ctx) => {
        if (ctx.web.ps?.canonicalPresent == null) {
          return { status: "locked", impact: "medium", detail: "Canonical data unavailable.", score: null };
        }
        const pass = Boolean(ctx.web.ps.canonicalPresent);
        return {
          status: pass ? "pass" : "warn",
          impact: "medium",
          detail: "Canonicals consolidate duplicate URL signals.",
          score: scoreFromStatus(pass ? "pass" : "warn")
        };
      }
    },
    {
      id: "html-valid",
      title: "HTML validation health",
      pillar: "search",
      source: "w3c",
      evaluate: (ctx) => {
        const count = ctx.web.w3c?.errorCount ?? null;
        if (count == null) {
          return { status: "locked", impact: "medium", detail: "W3C validation unavailable.", score: null };
        }
        const status = count === 0 ? "pass" : count <= 5 ? "warn" : "fail";
        return {
          status,
          impact: count > 5 ? "high" : "medium",
          detail: `${count} validator errors detected.`,
          score: count === 0 ? 100 : count <= 5 ? 75 : 50
        };
      }
    },
    {
      id: "structured-data",
      title: "Structured data available",
      pillar: "ai",
      source: "google",
      evaluate: (ctx) => {
        if (ctx.web.ps?.structuredData == null) {
          return { status: "locked", impact: "high", detail: "Structured data data unavailable.", score: null };
        }
        const pass = Boolean(ctx.web.ps.structuredData);
        return {
          status: pass ? "pass" : "fail",
          impact: "high",
          detail: "Schema improves machine readability and rich result eligibility.",
          score: scoreFromStatus(pass ? "pass" : "fail")
        };
      }
    },
    {
      id: "indexnow",
      title: "IndexNow signaling",
      pillar: "ai",
      source: "bing",
      evaluate: (ctx) => {
        if (ctx.web.bing?.implemented == null) {
          return { status: "locked", impact: "medium", detail: "IndexNow data unavailable.", score: null };
        }
        const pass = Boolean(ctx.web.bing.implemented);
        return {
          status: pass ? "pass" : "warn",
          impact: "medium",
          detail: "Fast URL submission improves recrawl speed for changes.",
          score: scoreFromStatus(pass ? "pass" : "warn")
        };
      }
    },
    {
      id: "viewport",
      title: "Mobile viewport",
      pillar: "ux",
      source: "google",
      evaluate: (ctx) => {
        if (ctx.web.ps?.hasViewport == null) {
          return { status: "locked", impact: "high", detail: "Viewport data unavailable.", score: null };
        }
        const pass = Boolean(ctx.web.ps.hasViewport);
        return {
          status: pass ? "pass" : "fail",
          impact: "high",
          detail: "Viewport configuration is required for mobile-first rendering.",
          score: scoreFromStatus(pass ? "pass" : "fail")
        };
      }
    },
    {
      id: "tap-targets",
      title: "Tap target sizing",
      pillar: "ux",
      source: "w3c",
      evaluate: (ctx) => {
        if (ctx.web.ps?.tapTargets == null) {
          return { status: "locked", impact: "medium", detail: "Tap target data unavailable.", score: null };
        }
        const pass = Boolean(ctx.web.ps.tapTargets);
        return {
          status: pass ? "pass" : "warn",
          impact: "medium",
          detail: "Tap targets should be large and spaced for touch usage.",
          score: scoreFromStatus(pass ? "pass" : "warn")
        };
      }
    },
    {
      id: "image-alt",
      title: "Image alt semantics",
      pillar: "ux",
      source: "w3c",
      evaluate: (ctx) => {
        if (ctx.web.ps?.imagesHaveAlt == null) {
          return { status: "locked", impact: "medium", detail: "Image alt data unavailable.", score: null };
        }
        const pass = Boolean(ctx.web.ps.imagesHaveAlt);
        return {
          status: pass ? "pass" : "warn",
          impact: "medium",
          detail: "Alt text improves assistive reading and model understanding.",
          score: scoreFromStatus(pass ? "pass" : "warn")
        };
      }
    },
    {
      id: "links-descriptive",
      title: "Descriptive links",
      pillar: "ux",
      source: "google",
      evaluate: (ctx) => {
        if (ctx.web.ps?.linksDescriptive == null) {
          return { status: "locked", impact: "low", detail: "Link text data unavailable.", score: null };
        }
        const pass = Boolean(ctx.web.ps.linksDescriptive);
        return {
          status: pass ? "pass" : "warn",
          impact: "low",
          detail: "Clear link text strengthens context extraction.",
          score: scoreFromStatus(pass ? "pass" : "warn")
        };
      }
    },
    {
      id: "seo-score",
      title: "SEO baseline score",
      pillar: "search",
      source: "google",
      evaluate: (ctx) => {
        const raw = ctx.web.ps?.seoScore;
        if (raw == null) {
          return { status: "locked", impact: "high", detail: "Lighthouse SEO score unavailable.", score: null };
        }
        const value = Math.round(raw * 100);
        return {
          status:
            value >= TOP_SITE_BASELINE.seo.pass
              ? "pass"
              : value >= TOP_SITE_BASELINE.seo.warn
                ? "warn"
                : "fail",
          impact: "high",
          detail: `Lighthouse SEO score is ${value}/100.`,
          score: scoreFromPercent(value)
        };
      }
    },
    {
      id: "accessibility-score",
      title: "Accessibility baseline",
      pillar: "ux",
      source: "w3c",
      evaluate: (ctx) => {
        const raw = ctx.web.ps?.accessibilityScore;
        if (raw == null) {
          return { status: "locked", impact: "medium", detail: "Lighthouse accessibility score unavailable.", score: null };
        }
        const value = Math.round(raw * 100);
        return {
          status:
            value >= TOP_SITE_BASELINE.accessibility.pass
              ? "pass"
              : value >= TOP_SITE_BASELINE.accessibility.warn
                ? "warn"
                : "fail",
          impact: "medium",
          detail: `Accessibility score is ${value}/100.`,
          score: scoreFromPercent(value)
        };
      }
    },
    {
      id: "performance-score",
      title: "Performance readiness",
      pillar: "ux",
      source: "google",
      evaluate: (ctx) => {
        const raw = ctx.web.ps?.performanceScore;
        if (raw == null) {
          return { status: "locked", impact: "medium", detail: "Lighthouse performance score unavailable.", score: null };
        }
        const value = Math.round(raw * 100);
        return {
          status:
            value >= TOP_SITE_BASELINE.performance.pass
              ? "pass"
              : value >= TOP_SITE_BASELINE.performance.warn
                ? "warn"
                : "fail",
          impact: "medium",
          detail: `Performance score is ${value}/100.`,
          score: scoreFromPercent(value)
        };
      }
    },
    {
      id: "best-practice-score",
      title: "Best-practice signals",
      pillar: "search",
      source: "google",
      evaluate: (ctx) => {
        const raw = ctx.web.ps?.bestPracticesScore;
        if (raw == null) {
          return { status: "locked", impact: "low", detail: "Lighthouse best-practices score unavailable.", score: null };
        }
        const value = Math.round(raw * 100);
        return {
          status:
            value >= TOP_SITE_BASELINE.bestPractices.pass
              ? "pass"
              : value >= TOP_SITE_BASELINE.bestPractices.warn
                ? "warn"
                : "fail",
          impact: "low",
          detail: `Best-practices score is ${value}/100.`,
          score: scoreFromPercent(value)
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
          return { status: "locked", impact: "low", detail: "No CrUX LCP data available.", score: null };
        }
        return {
          status:
            lcp <= TOP_SITE_BASELINE.lcpMs.pass
              ? "pass"
              : lcp <= TOP_SITE_BASELINE.lcpMs.warn
                ? "warn"
                : "fail",
          impact: "medium",
          detail: `LCP percentile is ${Math.round(lcp)}ms.`,
          score:
            lcp <= TOP_SITE_BASELINE.lcpMs.pass
              ? 100
              : lcp <= TOP_SITE_BASELINE.lcpMs.warn
                ? 75
                : 50
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
          return { status: "locked", impact: "low", detail: "Shopify-only rule.", score: null };
        }
        const pass = ctx.shopify?.hasAboutPage && ctx.shopify?.hasContactPage;
        return {
          status: pass ? "pass" : "fail",
          impact: "high",
          detail: "About and Contact pages build trust for shoppers and crawlers.",
          score: pass ? 100 : 50
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
          return { status: "locked", impact: "low", detail: "Shopify-only rule.", score: null };
        }
        const pass = Boolean(ctx.shopify?.hasPolicyPage);
        return {
          status: pass ? "pass" : "warn",
          impact: "medium",
          detail: "Policy pages improve buyer confidence and content trust.",
          score: scoreFromStatus(pass ? "pass" : "warn")
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
          return { status: "locked", impact: "low", detail: "Etsy-only rule.", score: null };
        }
        const pass = Boolean(ctx.etsy?.hasAbout);
        return {
          status: pass ? "pass" : "warn",
          impact: "medium",
          detail: "About content helps with trust and expertise context.",
          score: scoreFromStatus(pass ? "pass" : "warn")
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
          return { status: "locked", impact: "low", detail: "Etsy-only rule.", score: null };
        }
        const pass = Boolean(ctx.etsy?.hasPolicy);
        return {
          status: pass ? "pass" : "warn",
          impact: "medium",
          detail: "Policy completeness strengthens transactional trust.",
          score: scoreFromStatus(pass ? "pass" : "warn")
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
          return { status: "locked", impact: "low", detail: "Etsy-only rule.", score: null };
        }
        const count = ctx.etsy?.listingCount ?? 0;
        return {
          status: count >= 10 ? "pass" : count >= 3 ? "warn" : "fail",
          impact: count < 3 ? "high" : "low",
          detail: `${count} active listings detected.`,
          score: count >= 10 ? 100 : count >= 3 ? 75 : 50
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
      detail: outcome.detail,
      score: outcome.score ?? scoreFromStatus(outcome.status)
    };
  });

  const pillarScores = { search: 0, ai: 0, ux: 0 };

  PILLARS.forEach((pillar) => {
    const relevant = rules.filter((rule) => rule.pillar === pillar.key && rule.score != null);
    if (relevant.length === 0) {
      pillarScores[pillar.key] = 0;
      return;
    }
    const total = relevant.reduce((sum, rule) => sum + rule.score, 0);
    pillarScores[pillar.key] = Math.round(total / relevant.length);
  });

  const activePillars = PILLARS.filter((pillar) => {
    return rules.some((rule) => rule.pillar === pillar.key && rule.score != null);
  });

  const totalWeight = activePillars.reduce((sum, pillar) => sum + pillar.weight, 0);
  const hasSignal = totalWeight > 0;
  const overallScore = hasSignal
    ? Math.round(
      activePillars.reduce((sum, pillar) => {
        return sum + (pillarScores[pillar.key] * (pillar.weight / totalWeight));
      }, 0)
    )
    : 50;

  const topFixes = rules
    .filter((rule) => rule.status === "fail" || rule.status === "warn")
    .sort((a, b) => IMPACT_PRIORITY[b.impact] - IMPACT_PRIORITY[a.impact])
    .slice(0, 8);

  return { rules, pillarScores, overallScore, topFixes, hasSignal };
}

function verdictFromScore(score) {
  if (score >= 70) return "Strong Visibility";
  if (score >= 50) return "Moderate Visibility";
  if (score >= 30) return "Limited Visibility";
  return "Critical Visibility Risk";
}

async function loadWebSignals(url) {
  const defaults = {
    ps: {
      performanceScore: null,
      seoScore: null,
      accessibilityScore: null,
      bestPracticesScore: null,
      lcp: null,
      hasViewport: null,
      hasDocTitle: null,
      hasMetaDesc: null,
      imagesHaveAlt: null,
      canonicalPresent: null,
      structuredData: null,
      tapTargets: null,
      linksDescriptive: null
    },
    w3c: { errorCount: null, warningCount: null },
    bing: { implemented: null, keyFileFound: null, robotsHasIndexNow: null },
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

window.scoreFromStatus = scoreFromStatus;
window.scoreFromPercent = scoreFromPercent;
window.getRuleLibrary = getRuleLibrary;
window.evaluateRules = evaluateRules;
window.verdictFromScore = verdictFromScore;
window.loadWebSignals = loadWebSignals;
