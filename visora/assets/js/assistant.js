const summaryEl = document.getElementById("scan-summary");
const listEl = document.getElementById("playbook-list");

const ISSUE_FIXES = [
  {
    match: /HTML errors/i,
    why: "Parser and markup errors can suppress rich results and degrade crawler confidence.",
    fix: [
      "Run W3C validation and resolve high-frequency parser errors first.",
      "Fix duplicate IDs, unclosed tags, and invalid nesting patterns.",
      "Revalidate template partials for shared layout files."
    ],
    validate: "Re-run W3C check and confirm error count trend is moving down release-over-release."
  },
  {
    match: /Missing viewport/i,
    why: "Missing viewport settings reduce mobile usability and can impact quality scoring.",
    fix: [
      "Add <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\"> in <head>.",
      "Ensure no script overwrites viewport settings on hydration.",
      "Test on mobile simulators for rendering scale."
    ],
    validate: "Re-run Lighthouse mobile and verify viewport audit passes."
  },
  {
    match: /document title/i,
    why: "Weak title metadata reduces relevance matching for search and answer engines.",
    fix: [
      "Set unique <title> tags per indexable page.",
      "Place primary intent terms near the front while preserving readability.",
      "For dynamic pages, generate title server-side for crawlers."
    ],
    validate: "Inspect rendered HTML and ensure each template outputs a deterministic title."
  },
  {
    match: /meta description/i,
    why: "Missing descriptions reduce snippet quality and click confidence in discovery surfaces.",
    fix: [
      "Add descriptive meta description tags to canonical pages.",
      "Keep summaries intent-aligned and specific to on-page content.",
      "Avoid duplicating one generic description across many pages."
    ],
    validate: "Use URL inspection and confirm descriptions are crawlable in rendered HTML."
  },
  {
    match: /alt text/i,
    why: "Missing alt attributes weaken accessibility and semantic understanding for AI parsers.",
    fix: [
      "Add meaningful alt text for informative images.",
      "Use empty alt for decorative assets only.",
      "Enforce image alt checks in content publishing workflows."
    ],
    validate: "Run accessibility checks and review representative pages manually."
  },
  {
    match: /canonical/i,
    why: "Canonical ambiguity can split ranking and citation signals across duplicate URLs.",
    fix: [
      "Set rel=\"canonical\" for each indexable page.",
      "Align canonical URL with sitemap and internal linking.",
      "Avoid conflicting canonicals between SSR and client rendering."
    ],
    validate: "Crawl a sample set and ensure one canonical target per content variant."
  },
  {
    match: /structured data/i,
    why: "Schema coverage improves machine readability for assistants and rich search experiences.",
    fix: [
      "Implement relevant Schema.org types (Organization, Product, FAQ, Article).",
      "Ensure entity fields are complete and consistent with visible content.",
      "Avoid invalid or misleading markup that mismatches page intent."
    ],
    validate: "Run structured data testing and monitor enhancement eligibility."
  },
  {
    match: /Tap targets/i,
    why: "Low tap target quality reduces mobile UX confidence and lowers usability scores.",
    fix: [
      "Increase touch target size and spacing for interactive elements.",
      "Review nav, form controls, and sticky components on narrow viewports.",
      "Apply responsive hit-area tokens in your design system."
    ],
    validate: "Retest mobile audits and confirm tap target checks pass."
  },
  {
    match: /Links not descriptive/i,
    why: "Generic link anchors reduce context understanding for crawlers and assistive tools.",
    fix: [
      "Replace generic anchors like 'click here' with intent-rich text.",
      "Ensure internal links communicate destination context.",
      "Audit repeated CTA labels that lack semantic differentiation."
    ],
    validate: "Run link-text audits and sample-check navigation clusters."
  },
  {
    match: /IndexNow/i,
    why: "Without rapid index signaling, content updates may be discovered more slowly.",
    fix: [
      "Implement IndexNow key file and submission endpoint integration.",
      "Reference IndexNow setup in robots where appropriate.",
      "Submit change events on publish/update workflows."
    ],
    validate: "Confirm key file is reachable and monitor indexing latency after updates."
  }
];

function getPlaybook(issue) {
  return ISSUE_FIXES.find((item) => item.match.test(issue)) || {
    why: "This issue affects machine readability or crawl trust.",
    fix: [
      "Review page template and crawler-visible HTML output.",
      "Align metadata and structured signals with page intent.",
      "Retest and compare before/after diagnostics."
    ],
    validate: "Re-run scan and verify issue no longer appears in top blockers."
  };
}

function render() {
  const raw = sessionStorage.getItem("visora_last_scan");
  if (!raw) {
    summaryEl.innerHTML = "<h2>No Scan Data Found</h2><p>Run a scan first, then open this assistant for detailed remediation guidance.</p>";
    listEl.innerHTML = "";
    return;
  }

  const scan = JSON.parse(raw);
  summaryEl.innerHTML = `
    <h2>Latest Scan Context</h2>
    <p><strong>URL:</strong> ${scan.scannedUrl}</p>
    <p><strong>Visibility Score:</strong> ${scan.score}/100</p>
    <p><strong>Search:</strong> ${scan.buckets.searchFoundation}% | <strong>AI:</strong> ${scan.buckets.aiVisibility}% | <strong>UX:</strong> ${scan.buckets.uxInstrumentation}%</p>
  `;

  if (!scan.issues || scan.issues.length === 0) {
    listEl.innerHTML = "<p>No critical issues detected in the last scan. Continue monitoring for regressions.</p>";
    return;
  }

  listEl.innerHTML = scan.issues.map((issue, index) => {
    const p = getPlaybook(issue);
    return `
      <article class="panel">
        <h3>${index + 1}. ${issue}</h3>
        <p><strong>Why this matters:</strong> ${p.why}</p>
        <p><strong>How to fix:</strong></p>
        <ul>${p.fix.map((step) => `<li>${step}</li>`).join("")}</ul>
        <p><strong>Validation:</strong> ${p.validate}</p>
      </article>
    `;
  }).join("");
}

render();
