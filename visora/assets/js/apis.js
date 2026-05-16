// apis.js — All API call functions
async function apiGet(path) {
    const r = await fetch(`${API_BASE}${path}`);
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
    const r = await fetch(url);
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

async function fetchHealth() {
    return apiGet(`/health`);
}
async function fetchPageSpeed(url) {
    const apiKey = window.VISORA_PAGESPEED_API_KEY?.trim();
    if (apiKey) {
          const endpoint =
                  `https://www.googleapis.com/pagespeedonline/v5/runPagespeed` +
                  `?url=${encodeURIComponent(url)}` +
                  `&strategy=mobile&category=performance&category=seo&category=accessibility&category=best-practices` +
                  `&key=${encodeURIComponent(apiKey)}`;
          return fetchJson(endpoint).then((data) => {
                  const lhr = data.lighthouseResult;
                  const cwv = data.loadingExperience?.metrics || {};
                  return {
                            performanceScore: lhr?.categories?.performance?.score ?? null,
                            seoScore: lhr?.categories?.seo?.score ?? null,
                            accessibilityScore: lhr?.categories?.accessibility?.score ?? null,
                            bestPracticesScore: lhr?.categories?.["best-practices"]?.score ?? null,
                            lcp: cwv?.LARGEST_CONTENTFUL_PAINT_MS ?? null,
                            cls: cwv?.CUMULATIVE_LAYOUT_SHIFT_SCORE ?? null,
                            inp: cwv?.INTERACTION_TO_NEXT_PAINT ?? null,
                            fcp: cwv?.FIRST_CONTENTFUL_PAINT_MS ?? null,
                            hasViewport: lhr?.audits?.viewport?.score === 1,
                            hasDocTitle: lhr?.audits?.document_title?.score === 1,
                            hasMetaDesc: lhr?.audits?.meta_description?.score === 1,
                            imagesHaveAlt: lhr?.audits?.image_alt?.score === 1,
                            canonicalPresent: lhr?.audits?.canonical?.score === 1,
                            structuredData: lhr?.audits?.structured_data?.score === 1,
                            tapTargets: lhr?.audits?.tap_targets?.score === 1,
                            linksDescriptive: lhr?.audits?.link_text?.score === 1,
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
}
async function fetchEtsyShop(shopId) {
    return apiGet(`/etsy-shop?shopId=${encodeURIComponent(shopId)}`);
}
async function fetchShopifyStore(shop) {
    return apiGet(`/shopify-store?shop=${encodeURIComponent(shop)}`);
}
