const summaryEl = document.getElementById("scan-summary");
const updatesEl = document.getElementById("updates-list");

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

const UPDATE_SUGGESTIONS = [
  {
    match: /HTML errors/i,
    getSuggestion: (scan) => `Your site at ${scan.scannedUrl} has HTML validation errors that reduce crawler confidence. Fix high-frequency parser errors in shared templates first (duplicate IDs, unclosed tags, invalid nesting). Reference: <a href="https://validator.w3.org/docs/" target="_blank">W3C HTML Validator Docs</a> and <a href="https://developers.google.com/search/docs/crawling-indexing/overview" target="_blank">Google Search Central: Crawling & Indexing</a>.`
  },
  {
    match: /Missing viewport/i,
    getSuggestion: (scan) => `Add <code>&lt;meta name="viewport" content="width=device-width, initial-scale=1"&gt;</code> to the &lt;head&gt; of ${scan.scannedUrl}. Mobile-first crawlers check viewport presence early. Reference: <a href="https://developers.google.com/search/mobile-sites/mobile-first-indexing" target="_blank">Google: Mobile-First Indexing</a>.`
  },
  {
    match: /document title/i,
    getSuggestion: (scan) => `Set unique &lt;title&gt; tags for each page on ${scan.scannedUrl}. Weak titles reduce relevance matching for search and AI answers. Place primary intent terms early (50-60 chars). Reference: <a href="https://developers.google.com/search/docs/beginner/seo-starter-guide" target="_blank">Google SEO Starter Guide: Title Tags</a>.`
  },
  {
    match: /meta description/i,
    getSuggestion: (scan) => `Add descriptive meta description tags across ${scan.scannedUrl}. Missing descriptions reduce snippet quality and AI discovery confidence. Keep summaries intent-aligned and page-specific (150-160 chars). Reference: <a href="https://developers.google.com/search/docs/beginner/seo-starter-guide" target="_blank">Google SEO Starter Guide: Meta Descriptions</a>.`
  },
  {
    match: /alt text/i,
    getSuggestion: (scan) => `Add meaningful alt text to informative images on ${scan.scannedUrl}. Missing alt attributes weaken accessibility scoring and semantic understanding for AI indexers. Reference: <a href="https://www.w3.org/WAI/tutorials/images/" target="_blank">W3C: Image Accessibility</a> and <a href="https://developers.google.com/search/docs/beginner/seo-starter-guide" target="_blank">Google: Image SEO</a>.`
  },
  {
    match: /canonical/i,
    getSuggestion: (scan) => `Add rel="canonical" to each indexable page on ${scan.scannedUrl}. Canonical ambiguity splits ranking signals across duplicate URLs. Align canonical URLs with sitemap and internal linking. Reference: <a href="https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls" target="_blank">Google: Consolidate Duplicate URLs</a>.`
  },
  {
    match: /structured data/i,
    getSuggestion: (scan) => `Implement Schema.org markup on ${scan.scannedUrl} (Organization, Product, Article, FAQ, etc.). Structured data improves machine readability for AI assistants and rich search eligibility. Validate at <a href="https://search.google.com/test/rich-results" target="_blank">Google's Rich Results Test</a>. Reference: <a href="https://schema.org/" target="_blank">Schema.org</a> and <a href="https://developers.google.com/search/docs/appearance/structured-data/intro" target="_blank">Google: Structured Data</a>.`
  },
  {
    match: /Tap targets/i,
    getSuggestion: (scan) => `Increase touch target size and spacing on ${scan.scannedUrl} to at least 48x48px with 8px margins. Low tap-target quality reduces mobile UX confidence. Review nav, forms, and sticky components on narrow viewports. Reference: <a href="https://developers.google.com/web/fundamentals/accessibility/accessible-tap-targets" target="_blank">Google: Accessible Tap Targets</a> and <a href="https://www.w3.org/WAI/WCAG21/Understanding/target-size" target="_blank">WCAG 2.2: Target Size</a>.`
  },
  {
    match: /Links not descriptive/i,
    getSuggestion: (scan) => `Replace generic link anchors (e.g., "click here") on ${scan.scannedUrl} with intent-rich text. Generic links reduce context understanding for crawlers and assistive tools. Reference: <a href="https://www.w3.org/WAI/WCAG21/Understanding/link-purpose" target="_blank">WCAG 2.2: Link Purpose</a> and <a href="https://developers.google.com/search/docs/beginner/seo-starter-guide" target="_blank">Google: Clear Navigation</a>.`
  },
  {
    match: /IndexNow/i,
    getSuggestion: (scan) => `Implement IndexNow key file at ${new URL(scan.scannedUrl).origin}/indexnow.txt and submit content updates. Rapid index signaling helps ${new URL(scan.scannedUrl).hostname} appear in search results faster. Reference: <a href="https://www.bing.com/webmasters/help/indexnow-overview" target="_blank">Bing Webmaster Tools: IndexNow</a>.`
  }
];

function getSuggestion(issue, scan) {
  const found = UPDATE_SUGGESTIONS.find((item) => item.match.test(issue));
  return found ? found.getSuggestion(scan) : `Review this issue on ${scan.scannedUrl} in page source and align with crawler-visible best practices. Reference <a href="https://developers.google.com/search/docs" target="_blank">Google Search Central</a> and <a href="https://www.bing.com/webmasters" target="_blank">Bing Webmaster Tools</a>.`;
}

function renderUpdates() {
  const raw = sessionStorage.getItem("visora_last_scan");
  if (!raw) {
    summaryEl.innerHTML = "<h2>No Scan Data Found</h2><p>Run a scan first to generate suggested updates.</p>";
    updatesEl.innerHTML = "";
    return;
  }

  const scan = JSON.parse(raw);
  summaryEl.innerHTML = `
    <h2>Latest Scan</h2>
    <p><strong>URL:</strong> ${escapeHtml(scan.scannedUrl)}</p>
    <p><strong>Visibility Score:</strong> ${scan.score}/100</p>
  `;

  const issues = scan.issues || [];
  if (issues.length === 0) {
    updatesEl.innerHTML = "<h2>Suggested Updates</h2><p>No critical updates suggested from the latest scan.</p>";
    return;
  }

  updatesEl.innerHTML = `
    <h2>Suggested Updates</h2>
    <ol>
      ${issues.map((issue) => `<li><strong>${issue}</strong><br>${getSuggestion(issue, scan)}</li>`).join("")}
    </ol>
  `;
}

renderUpdates();
