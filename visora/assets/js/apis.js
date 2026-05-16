// apis.js — All API call functions
const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithRetry(url, options = {}, maxAttempts = 3) {
  let lastError = null;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const response = await fetch(url, options);
      if (!RETRYABLE_STATUS.has(response.status) || attempt === maxAttempts) {
        return response;
      }
      await sleep(250 * attempt);
    } catch (error) {
      lastError = error;
      if (attempt === maxAttempts) {
        throw error;
      }
      await sleep(250 * attempt);
    }
  }
  throw lastError || new Error("Request failed after retries");
}

async function apiGet(path) {
  const r = await fetchWithRetry(`${API_BASE}${path}`);
  if (!r.ok) {
    let detail = "";
    try {
      detail = await r.text();
    } catch {
      detail = "";
    }
    throw new Error(`API request failed (${r.status}) ${detail}`.trim());
  }
  return r.json();
}

async function fetchJson(url) {
  const r = await fetchWithRetry(url);
  if (!r.ok) {
    let detail = "";
    try {
      detail = await r.text();
    } catch {
      detail = "";
    }
    return r.json();
}


async function fetchHealth() {
    return apiGet(`/health`);
}
async function fetchPageSpeed(url) {
  const apiKey = window.VISORA_PAGESPEED_API_KEY?.trim();
  if (apiKey) {
    const endpoint =
      "https://fecaarqxtytaxkhmlngg.supabase.co/functions/v1/pagespeed-proxy" +
      `?url=${encodeURIComponent(url)}` +
      `&key=${encodeURIComponent(apiKey)}`;
    return fetchJson(endpoint).then((data) => {
      const lhr = data.lighthouseResult;
      const cwv = data.loadingExperience?.metrics || {};
      const auditScore = (primary, legacy) => {
        const score = lhr?.audits?.[primary]?.score ?? lhr?.audits?.[legacy]?.score;
        return score === 1;
      };
      return {
        performanceScore: lhr?.categories?.performance?.score ?? null,
        seoScore: lhr?.categories?.seo?.score ?? null,
        accessibilityScore: lhr?.categories?.accessibility?.score ?? null,
        bestPracticesScore: lhr?.categories?.["best-practices"]?.score ?? null,
        lcp: cwv?.LARGEST_CONTENTFUL_PAINT_MS ?? null,
        cls: cwv?.CUMULATIVE_LAYOUT_SHIFT_SCORE ?? null,
        inp: cwv?.INTERACTION_TO_NEXT_PAINT ?? null,
        fcp: cwv?.FIRST_CONTENTFUL_PAINT_MS ?? null,
        hasViewport: auditScore("viewport", "viewport"),
        hasDocTitle: auditScore("document-title", "document_title"),
        hasMetaDesc: auditScore("meta-description", "meta_description"),
        imagesHaveAlt: auditScore("image-alt", "image_alt"),
        canonicalPresent: auditScore("canonical", "canonical"),
        structuredData: auditScore("structured-data", "structured_data"),
        tapTargets: auditScore("tap-targets", "tap_targets"),
        linksDescriptive: auditScore("link-text", "link_text"),
      };
    });
  }

  return apiGet(`/pagespeed?url=${encodeURIComponent(url)}`);
}
async function fetchW3C(url) {
    return apiGet(`/w3c?url=${encodeURIComponent(url)}`);
}
async function fetchBingIndexNow(url) {
    return apiGet(`/bing-indexnow?url=${encodeURIComponent(url)}`);
