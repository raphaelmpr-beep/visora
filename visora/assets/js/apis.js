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

async function fetchHealth() {
  return apiGet(`/health`);
}
async function fetchPageSpeed(url) {
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
