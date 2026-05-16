const summaryEl = document.getElementById("scan-summary");
const updatesEl = document.getElementById("updates-list");

function stripHtml(html) {
  const temp = document.createElement("div");
  temp.innerHTML = html;
  return (temp.textContent || temp.innerText || "").trim();
}

function slugify(value) {
  return String(value || "report")
    .toLowerCase()
    .replace(/https?:\/\//g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "report";
}

function formatTimestamp(isoString) {
  if (!isoString) return new Date().toISOString();
  const parsed = new Date(isoString);
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
}

function buildIssueRows(scan) {
  return (scan.issues || []).map((issue, index) => {
    const suggestionHtml = getSuggestion(issue, scan);
    return {
      rank: index + 1,
      issue,
      suggestionHtml,
      suggestionText: stripHtml(suggestionHtml)
    };
  });
}

function buildMonitoringReport(scan) {
  const capturedAt = formatTimestamp(scan.capturedAt);
  const buckets = scan.buckets || {};
  const issues = buildIssueRows(scan);

  return {
    generatedAt: new Date().toISOString(),
    scan: {
      scannedUrl: scan.scannedUrl,
      platform: scan.platform || "web",
      capturedAt,
      score: scan.score ?? 0,
      buckets: {
        searchFoundation: buckets.searchFoundation ?? 0,
        aiVisibility: buckets.aiVisibility ?? 0,
        uxInstrumentation: buckets.uxInstrumentation ?? 0
      }
    },
    issues
  };
}

function buildPlainTextReport(report) {
  const header = [
    "Visora Website Health Monitoring Report",
    `Generated: ${report.generatedAt}`,
    `Scanned URL: ${report.scan.scannedUrl}`,
    `Platform: ${report.scan.platform}`,
    `Captured At: ${report.scan.capturedAt}`,
    `Visibility Score: ${report.scan.score}/100`,
    "",
    "Pillar Scores",
    `- Search Foundation: ${report.scan.buckets.searchFoundation}/100`,
    `- AI Visibility: ${report.scan.buckets.aiVisibility}/100`,
    `- UX Instrumentation: ${report.scan.buckets.uxInstrumentation}/100`,
    "",
    "Top Issues and Suggested Updates"
  ];

  const issueLines = report.issues.flatMap((item) => [
    `${item.rank}. ${item.issue}`,
    `   Suggestion: ${item.suggestionText}`,
    ""
  ]);

  return [...header, ...issueLines].join("\n");
}

function buildCsvReport(report) {
  const rows = [
    ["Rank", "Issue", "Suggestion"],
    ...report.issues.map((item) => [item.rank, item.issue, item.suggestionText])
  ];

  return rows
    .map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(","))
    .join("\n");
}

function downloadFile(fileName, content, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function setExportStatus(message, isError = false) {
  const statusEl = document.getElementById("report-status");
  if (!statusEl) return;
  statusEl.textContent = message;
  statusEl.classList.toggle("status-error", isError);
}

function openEmailDraft(report, plainTextReport) {
  const emailInput = document.getElementById("report-email-to");
  const to = emailInput?.value.trim() || "";
  const subject = `Visora Health Report - ${slugify(report.scan.scannedUrl)} - ${report.scan.score}/100`;
  const body = [
    `Website: ${report.scan.scannedUrl}`,
    `Visibility Score: ${report.scan.score}/100`,
    "",
    `Search Foundation: ${report.scan.buckets.searchFoundation}/100`,
    `AI Visibility: ${report.scan.buckets.aiVisibility}/100`,
    `UX Instrumentation: ${report.scan.buckets.uxInstrumentation}/100`,
    "",
    "Top Issues:",
    ...report.issues.slice(0, 8).map((item) => `- ${item.issue}`),
    "",
    "Full report text is copied with the Copy Report button for long-form email notes."
  ].join("\n");

  const mailto = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  window.location.href = mailto;

  if (emailInput) {
    localStorage.setItem("visora_report_email_to", to);
  }

  setExportStatus("Email draft opened. Attach exported files if needed.");
}

async function copyReportToClipboard(plainTextReport) {
  try {
    await navigator.clipboard.writeText(plainTextReport);
    setExportStatus("Full report copied to clipboard.");
  } catch {
    setExportStatus("Clipboard copy failed. Export TXT and attach it manually.", true);
  }
}

function bindMonitoringActions(scan) {
  const report = buildMonitoringReport(scan);
  const plainTextReport = buildPlainTextReport(report);
  const fileBase = `visora-health-${slugify(scan.scannedUrl)}-${new Date().toISOString().slice(0, 10)}`;

  const exportJsonBtn = document.getElementById("export-json");
  const exportTxtBtn = document.getElementById("export-txt");
  const exportCsvBtn = document.getElementById("export-csv");
  const emailBtn = document.getElementById("email-report");
  const copyBtn = document.getElementById("copy-report");
  const emailInput = document.getElementById("report-email-to");

  if (emailInput) {
    emailInput.value = localStorage.getItem("visora_report_email_to") || "";
  }

  exportJsonBtn?.addEventListener("click", () => {
    const json = JSON.stringify(report, null, 2);
    downloadFile(`${fileBase}.json`, json, "application/json");
    setExportStatus("JSON report exported.");
  });

  exportTxtBtn?.addEventListener("click", () => {
    downloadFile(`${fileBase}.txt`, plainTextReport, "text/plain;charset=utf-8");
    setExportStatus("Text report exported.");
  });

  exportCsvBtn?.addEventListener("click", () => {
    const csv = buildCsvReport(report);
    downloadFile(`${fileBase}.csv`, csv, "text/csv;charset=utf-8");
    setExportStatus("CSV issue list exported.");
  });

  emailBtn?.addEventListener("click", () => {
    openEmailDraft(report, plainTextReport);
  });

  copyBtn?.addEventListener("click", async () => {
    await copyReportToClipboard(plainTextReport);
  });
}

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

function renderSuggestedEditBlock(details) {
  if (!details.suggestedEdit) {
    return "";
  }

  const before = details.suggestedEdit.before
    ? `<p><b>Before</b></p><pre class="agentic-edit">${escapeHtml(details.suggestedEdit.before)}</pre>`
    : "";
  const after = details.suggestedEdit.after
    ? `<p><b>After</b></p><pre class="agentic-edit">${escapeHtml(details.suggestedEdit.after)}</pre>`
    : "";

  return `
    <div class="agentic-suggested-edit">
      <p><b>Suggested Edit Example:</b></p>
      ${before}
      ${after}
    </div>
  `;
}


function getAgenticDetails(issue, scan) {
  // Example mapping for demo; in production, this would be more dynamic or AI-driven
  if (/HTML validation|HTML errors|HTML validation health/i.test(issue)) {
    return {
      selector: 'document',
      devtools: 'Elements > [line/column of error] or Console > [HTML error message]',
      verbatim: 'HTML validation error: e.g., Unclosed tag <div> at line 42',
      fix: '&lt;div&gt;...&lt;/div&gt;',
      why: 'Malformed HTML can cause crawler parsing failures, broken DOM interpretation, and missing indexed content blocks.',
      suggestedEdit: {
        before: '<section class="hero">\n  <h1>Product Details\n</section>',
        after: '<section class="hero">\n  <h1>Product Details</h1>\n</section>'
      },
      steps: [
        'Open DevTools (F12) and go to the Console or Elements panel.',
        'Find the error message or red highlight in the DOM.',
        'Edit the HTML to close the tag or fix the structure.',
        'Save and re-scan to verify the fix.'
      ]
    };
  }
  if (/viewport/i.test(issue)) {
    return {
      selector: 'head > meta[name="viewport"]',
      devtools: 'Elements > <head> > meta[name="viewport"]',
      verbatim: 'Missing viewport meta tag',
      fix: '&lt;meta name="viewport" content="width=device-width, initial-scale=1"&gt;',
      why: 'Without a viewport tag, mobile rendering and layout calculations degrade, lowering usability and mobile search trust signals.',
      suggestedEdit: {
        before: '<head>\n  <title>My Store</title>\n</head>',
        after: '<head>\n  <meta name="viewport" content="width=device-width, initial-scale=1">\n  <title>My Store</title>\n</head>'
      },
      steps: [
        'Open DevTools and inspect the <head> section.',
        'Add the viewport meta tag as shown.',
        'Save and re-scan.'
      ]
    };
  }
  if (/document title/i.test(issue)) {
    return {
      selector: 'head > title',
      devtools: 'Elements > <head> > <title>',
      verbatim: 'Missing or duplicate <title> tag',
      fix: '&lt;title&gt;Your Page Title&lt;/title&gt;',
      why: 'Titles are primary relevance labels for search engines and AI retrieval systems; missing titles reduce ranking clarity.',
      suggestedEdit: {
        before: '<title>Home</title>',
        after: '<title>Organic Cotton T-Shirts | Acme Apparel</title>'
      },
      steps: [
        'Open DevTools and inspect the <head> section.',
        'Add or update the <title> tag to be unique and descriptive.',
        'Save and re-scan.'
      ]
    };
  }
  if (/meta description/i.test(issue)) {
    return {
      selector: 'head > meta[name="description"]',
      devtools: 'Elements > <head> > meta[name="description"]',
      verbatim: 'Missing meta description tag',
      fix: '&lt;meta name="description" content="Your description here"&gt;',
      why: 'Descriptions improve SERP snippet quality and help AI systems summarize page intent accurately.',
      suggestedEdit: {
        before: '<head>\n  <title>Acme Apparel</title>\n</head>',
        after: '<head>\n  <title>Acme Apparel</title>\n  <meta name="description" content="Premium organic apparel for everyday comfort and performance.">\n</head>'
      },
      steps: [
        'Open DevTools and inspect the <head> section.',
        'Add a meta description tag.',
        'Save and re-scan.'
      ]
    };
  }
  if (/alt text/i.test(issue)) {
    return {
      selector: 'img:not([alt])',
      devtools: 'Elements > <img> tags missing alt attribute',
      verbatim: 'Image missing alt attribute',
      fix: '&lt;img src="..." alt="Description"&gt;',
      why: 'Alt text is an accessibility and semantic signal that helps crawlers and multimodal AI systems understand image content.',
      suggestedEdit: {
        before: '<img src="/images/blue-shirt.jpg">',
        after: '<img src="/images/blue-shirt.jpg" alt="Model wearing blue organic cotton t-shirt">'
      },
      steps: [
        'Open DevTools and inspect <img> tags.',
        'Add descriptive alt attributes to all images.',
        'Save and re-scan.'
      ]
    };
  }
  if (/canonical/i.test(issue)) {
    return {
      selector: 'head > link[rel="canonical"]',
      devtools: 'Elements > <head> > link[rel="canonical"]',
      verbatim: 'Missing canonical link tag',
      fix: '&lt;link rel="canonical" href="https://yoursite.com/page"&gt;',
      why: 'Canonical tags consolidate duplicate URL signals and prevent ranking fragmentation across similar pages.',
      suggestedEdit: {
        before: '<head>\n  <title>Product Page</title>\n</head>',
        after: '<head>\n  <title>Product Page</title>\n  <link rel="canonical" href="https://yoursite.com/products/organic-tee">\n</head>'
      },
      steps: [
        'Open DevTools and inspect the <head> section.',
        'Add a canonical link tag.',
        'Save and re-scan.'
      ]
    };
  }
  if (/structured data/i.test(issue)) {
    return {
      selector: 'head > script[type="application/ld+json"]',
      devtools: 'Elements > <head> > script[type="application/ld+json"]',
      verbatim: 'Missing or invalid structured data',
      fix: '&lt;script type="application/ld+json"&gt;{...}&lt;/script&gt;',
      why: 'Structured data makes entities explicit for search engines and AI agents, improving interpretation and rich result eligibility.',
      suggestedEdit: {
        before: '<head>\n  <title>Acme Apparel</title>\n</head>',
        after: '<script type="application/ld+json">\n{\n  "@context": "https://schema.org",\n  "@type": "Organization",\n  "name": "Acme Apparel",\n  "url": "https://yoursite.com"\n}\n</script>'
      },
      steps: [
        'Open DevTools and inspect the <head> section.',
        'Add or correct the structured data script.',
        'Validate with Google Rich Results Test.',
        'Save and re-scan.'
      ]
    };
  }
  if (/Tap targets/i.test(issue)) {
    return {
      selector: '.btn, .nav-link, .form-control',
      devtools: 'Elements > clickable/tappable elements',
      verbatim: 'Tap target too small or too close',
      fix: '.btn { min-width: 48px; min-height: 48px; margin: 8px; }',
      why: 'Small targets increase misclick rates on touch devices, harming usability metrics and mobile quality signals.',
      suggestedEdit: {
        before: '.btn { padding: 6px 10px; margin: 2px; }',
        after: '.btn { min-width: 48px; min-height: 48px; padding: 10px 14px; margin: 8px; }'
      },
      steps: [
        'Open DevTools and inspect buttons/links.',
        'Increase size and spacing via CSS.',
        'Save and re-scan.'
      ]
    };
  }
  if (/Links not descriptive/i.test(issue)) {
    return {
      selector: 'a',
      devtools: 'Elements > <a> tags',
      verbatim: 'Link text not descriptive',
      fix: '&lt;a href="..."&gt;Descriptive Text&lt;/a&gt;',
      why: 'Descriptive links improve context for both users and crawlers, which helps semantic understanding and accessibility.',
      suggestedEdit: {
        before: '<a href="/pricing">Click here</a>',
        after: '<a href="/pricing">View pricing plans for small business teams</a>'
      },
      steps: [
        'Open DevTools and inspect <a> tags.',
        'Update link text to be descriptive.',
        'Save and re-scan.'
      ]
    };
  }
  if (/IndexNow/i.test(issue)) {
    return {
      selector: '/indexnow.txt',
      devtools: 'Network > indexnow.txt',
      verbatim: 'Missing IndexNow key file',
      fix: 'Create indexnow.txt at site root with your key',
      why: 'IndexNow accelerates update discovery for supported engines, reducing lag between publishing and recrawling.',
      suggestedEdit: {
        before: 'No key file exists at /indexnow.txt',
        after: 'Create /indexnow.txt with your key value, e.g.\n8f4f2c1b3d9a4e6c8b0a5d7f2e1c9b4a'
      },
      steps: [
        'Create indexnow.txt at the root of your site.',
        'Add your IndexNow key to the file.',
        'Save and re-scan.'
      ]
    };
  }
  // Default fallback
  return {
    selector: 'document',
    devtools: 'Elements or Console',
    verbatim: 'See issue details above.',
    fix: 'See documentation.',
    why: 'Addressing this issue improves crawl reliability, content interpretation, and user-facing quality signals.',
    suggestedEdit: {
      before: 'Current implementation has weak crawl/UX signal.',
      after: 'Apply the recommended adjustment and validate with a fresh scan.'
    },
    steps: [
      'Review the issue in DevTools.',
      'Consult documentation for best practices.',
      'Save and re-scan.'
    ]
  };
}

function renderUpdates() {
  const raw = localStorage.getItem("visora_last_scan") || sessionStorage.getItem("visora_last_scan");
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
    <div class="report-actions" aria-label="Export and email website health report">
      <button id="export-json" class="assistant-link action-btn" type="button">Export JSON</button>
      <button id="export-txt" class="assistant-link action-btn" type="button">Export TXT</button>
      <button id="export-csv" class="assistant-link action-btn" type="button">Export CSV</button>
      <input id="report-email-to" class="report-email-input" type="email" placeholder="alerts@yourdomain.com">
      <button id="email-report" class="assistant-link action-btn" type="button">Email Draft</button>
      <button id="copy-report" class="assistant-link action-btn" type="button">Copy Report</button>
    </div>
    <p id="report-status" class="report-status" aria-live="polite">Use export or email actions for ongoing health monitoring.</p>
  `;

  const issues = scan.issues || [];
  if (issues.length === 0) {
    updatesEl.innerHTML = "<h2>Suggested Updates</h2><p>No critical updates suggested from the latest scan.</p>";
    return;
  }

  updatesEl.innerHTML = `
    <h2>Suggested Updates</h2>
    <ol>
      ${issues.map((issue, idx) => `<li class="agentic-issue" data-idx="${idx}"><strong>${escapeHtml(issue)}</strong><br>${getSuggestion(issue, scan)}</li>`).join("")}
    </ol>
    <div id="agentic-modal" class="agentic-modal" style="display:none;"></div>
  `;

  // Add click handlers for agentic workflow
  document.querySelectorAll('.agentic-issue').forEach((el) => {
    el.addEventListener('click', function() {
      const idx = Number(el.getAttribute('data-idx'));
      const issue = issues[idx];
      const details = getAgenticDetails(issue, scan);
      const modal = document.getElementById('agentic-modal');
      modal.innerHTML = `
        <div class="modal-content">
          <button class="modal-close" onclick="document.getElementById('agentic-modal').style.display='none'">&times;</button>
          <h3>Agentic Fix Workflow</h3>
          <p><b>Issue:</b> ${escapeHtml(issue)}</p>
          <p><b>Why this fix is needed:</b> ${escapeHtml(details.why || "This issue affects visibility and UX quality signals.")}</p>
          <p><b>DevTools Location:</b> <code>${escapeHtml(details.devtools)}</code></p>
          <p><b>Selector:</b> <code>${escapeHtml(details.selector)}</code></p>
          <p><b>Verbatim Error:</b> <code>${escapeHtml(details.verbatim)}</code></p>
          <p><b>Exact Fix:</b> <code>${escapeHtml(details.fix)}</code></p>
          ${renderSuggestedEditBlock(details)}
          <ol><b>Step-by-step:</b>
            ${details.steps.map(step => `<li>${escapeHtml(step)}</li>`).join('')}
          </ol>
        </div>
      `;
      modal.style.display = 'block';
    });
  });

  bindMonitoringActions(scan);
}

renderUpdates();
