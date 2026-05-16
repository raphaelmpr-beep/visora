// admin.js — Handles admin settings UI
const form = document.getElementById('admin-form');
const statusDiv = document.getElementById('status');
const ADMIN_BASE = (typeof API_BASE === 'string' ? API_BASE.replace(/\/api$/, '') : 'http://localhost:4173');

function renderKeyStatus(status) {
  const pagespeed = status?.pagespeed || 'unknown';
  const bing = status?.bing || 'unknown';
  const etsy = status?.etsy || 'unknown';
  statusDiv.textContent = `Key status - Google: ${pagespeed}, Bing: ${bing}, Etsy: ${etsy}`;
}

// Load current settings from localStorage (for demo/minimal setup)
window.onload = async () => {
  form.pagespeed.value = '';
  form.bing.value = '';
  form.etsy.value = '';
  form.port.value = localStorage.getItem('PORT') || '4173';
  // Load rate limit settings from backend
  try {
    const r = await fetch(`${ADMIN_BASE}/admin/rate-limit`);
    if (r.ok) {
      const data = await r.json();
      form['rate-limit'].value = data.limit || 5;
      form['rate-enabled'].checked = data.enabled !== false;
    }
  } catch {}

  try {
    const statusRes = await fetch(`${ADMIN_BASE}/admin/env-status`);
    if (statusRes.ok) {
      const keyStatus = await statusRes.json();
      renderKeyStatus(keyStatus);
    }
  } catch {}
};

form.onsubmit = async (e) => {
  e.preventDefault();
  localStorage.setItem('PORT', form.port.value.trim());

  try {
    const keyPayload = {
      pagespeedKey: form.pagespeed.value.trim(),
      bingKey: form.bing.value.trim(),
      etsyKey: form.etsy.value.trim(),
    };
    const hasKeyUpdate = Boolean(keyPayload.pagespeedKey || keyPayload.bingKey || keyPayload.etsyKey);

    if (hasKeyUpdate) {
      const keyRes = await fetch(`${ADMIN_BASE}/admin/env`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(keyPayload)
      });
      if (!keyRes.ok) {
        throw new Error('Failed to save API keys to server');
      }
      const keyData = await keyRes.json();
      renderKeyStatus(keyData.status);
    }

    const rateRes = await fetch(`${ADMIN_BASE}/admin/rate-limit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        enabled: form['rate-enabled'].checked,
        limit: Number(form['rate-limit'].value)
      })
    });
    if (!rateRes.ok) {
      throw new Error('Failed to update rate limit');
    }

    statusDiv.textContent = 'Settings saved to server. Leave key fields blank to keep current values.';
    form.pagespeed.value = '';
    form.bing.value = '';
    form.etsy.value = '';
  } catch {
    statusDiv.textContent = 'Failed to save some settings. Please retry.';
  }
};
