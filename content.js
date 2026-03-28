// LinkedIn Job Copier - Content Script
// Injects a "Copy Job Description" button into job detail panels

(function () {
  'use strict';

  const BUTTON_ID = 'ljc-copy-btn';
  const TOAST_ID = 'ljc-toast';

  // ─── Selectors (LinkedIn updates DOM occasionally, so we try multiple) ───────
  const JOB_TITLE_SELECTORS = [
    '.job-details-jobs-unified-top-card__job-title h1',
    '.jobs-unified-top-card__job-title h1',
    '.job-details-jobs-unified-top-card__job-title',
    '.jobs-unified-top-card__job-title',
    'h1.t-24',
    'h1[class*="job-title"]'
  ];

  const COMPANY_SELECTORS = [
    '.job-details-jobs-unified-top-card__company-name a',
    '.jobs-unified-top-card__company-name a',
    '.job-details-jobs-unified-top-card__company-name',
    '.jobs-unified-top-card__company-name',
    'a[class*="company-name"]'
  ];

  const LOCATION_SELECTORS = [
    '.job-details-jobs-unified-top-card__bullet',
    '.jobs-unified-top-card__bullet',
    '.jobs-unified-top-card__workplace-type',
    'span[class*="workplace-type"]'
  ];

  const DESCRIPTION_SELECTORS = [
    '.jobs-description__content .jobs-box__html-content',
    '.jobs-description-content__text',
    '#job-details',
    '.jobs-description__container',
    '[class*="jobs-description"]'
  ];

  const INJECT_ANCHOR_SELECTORS = [
    '.jobs-apply-button--top-card',
    '.jobs-unified-top-card__actions',
    '.job-details-jobs-unified-top-card__actions',
    '.jobs-s-apply',
    '[class*="top-card__actions"]'
  ];

  // ─── Utility: query first matching selector ───────────────────────────────
  function queryFirst(selectors, root = document) {
    for (const sel of selectors) {
      const el = root.querySelector(sel);
      if (el) return el;
    }
    return null;
  }

  // ─── Extract clean text from job description ──────────────────────────────
  function extractDescription() {
    const descEl = queryFirst(DESCRIPTION_SELECTORS);
    if (!descEl) return null;

    // Clone so we don't mutate the DOM
    const clone = descEl.cloneNode(true);

    // Replace <br> and block elements with newlines
    clone.querySelectorAll('br').forEach(br => br.replaceWith('\n'));
    clone.querySelectorAll('li').forEach(li => {
      li.prepend('• ');
      li.append('\n');
    });
    clone.querySelectorAll('p, h1, h2, h3, h4, h5, h6, div').forEach(el => {
      el.append('\n');
    });

    const text = clone.innerText || clone.textContent || '';
    return text.replace(/\n{3,}/g, '\n\n').trim();
  }

  // ─── Build clipboard text ─────────────────────────────────────────────────
  function buildClipboardText() {
    const titleEl = queryFirst(JOB_TITLE_SELECTORS);
    const companyEl = queryFirst(COMPANY_SELECTORS);
    const locationEl = queryFirst(LOCATION_SELECTORS);
    const description = extractDescription();

    const title = titleEl?.innerText?.trim() || 'Job Title Not Found';
    const company = companyEl?.innerText?.trim() || 'Company Not Found';
    const location = locationEl?.innerText?.trim() || '';

    const url = window.location.href;

    let text = `JOB TITLE: ${title}\n`;
    text += `COMPANY: ${company}\n`;
    if (location) text += `LOCATION: ${location}\n`;
    text += `URL: ${url}\n`;
    text += `\n${'─'.repeat(60)}\n\n`;
    text += description || 'Description not found.';

    return text;
  }

  // ─── Show toast notification ──────────────────────────────────────────────
  function showToast(message, type = 'success') {
    let toast = document.getElementById(TOAST_ID);
    if (toast) toast.remove();

    toast = document.createElement('div');
    toast.id = TOAST_ID;
    toast.className = `ljc-toast ljc-toast--${type}`;
    toast.innerHTML = `
      <span class="ljc-toast__icon">${type === 'success' ? '✓' : '✕'}</span>
      <span class="ljc-toast__msg">${message}</span>
    `;
    document.body.appendChild(toast);

    // Trigger animation
    requestAnimationFrame(() => {
      requestAnimationFrame(() => toast.classList.add('ljc-toast--visible'));
    });

    setTimeout(() => {
      toast.classList.remove('ljc-toast--visible');
      setTimeout(() => toast.remove(), 400);
    }, 2500);
  }

  // ─── Copy to clipboard ────────────────────────────────────────────────────
  async function copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fallback for older browsers
      try {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.cssText = 'position:fixed;opacity:0;pointer-events:none;';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        ta.remove();
        return true;
      } catch {
        return false;
      }
    }
  }

  // ─── Handle button click ──────────────────────────────────────────────────
  async function handleCopyClick(btn) {
    btn.disabled = true;
    btn.textContent = 'Copying…';

    const text = buildClipboardText();
    const success = await copyToClipboard(text);

    if (success) {
      btn.textContent = '✓ Copied!';
      btn.classList.add('ljc-btn--success');
      showToast('Job description copied to clipboard!');
    } else {
      btn.textContent = '✕ Failed';
      btn.classList.add('ljc-btn--error');
      showToast('Copy failed — try again', 'error');
    }

    setTimeout(() => {
      btn.textContent = '📋 Copy Job Description';
      btn.disabled = false;
      btn.classList.remove('ljc-btn--success', 'ljc-btn--error');
    }, 2000);
  }

  // ─── Inject the copy button ───────────────────────────────────────────────
  function injectButton() {
    if (document.getElementById(BUTTON_ID)) return;

    const anchor = queryFirst(INJECT_ANCHOR_SELECTORS);
    if (!anchor) return;

    const btn = document.createElement('button');
    btn.id = BUTTON_ID;
    btn.className = 'ljc-btn';
    btn.textContent = '📋 Copy Job Description';
    btn.title = 'Copy full job description to clipboard';
    btn.addEventListener('click', () => handleCopyClick(btn));

    // Insert after the anchor element
    anchor.insertAdjacentElement('afterend', btn);
  }

  // ─── Observe DOM changes (LinkedIn is a SPA) ─────────────────────────────
  let debounceTimer = null;
  const observer = new MutationObserver(() => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(injectButton, 600);
  });

  observer.observe(document.body, { childList: true, subtree: true });

  // Initial injection attempt
  setTimeout(injectButton, 1000);

  // ─── Message listener for popup scraping ─────────────────────────────────
  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg.action === 'scrapeCurrentJob') {
      const text = buildClipboardText();
      const titleEl = queryFirst(JOB_TITLE_SELECTORS);
      const companyEl = queryFirst(COMPANY_SELECTORS);
      const locationEl = queryFirst(LOCATION_SELECTORS);
      const description = extractDescription();

      sendResponse({
        title: titleEl?.innerText?.trim() || 'N/A',
        company: companyEl?.innerText?.trim() || 'N/A',
        location: locationEl?.innerText?.trim() || 'N/A',
        url: window.location.href,
        description: description || '',
        fullText: text
      });
    }

    if (msg.action === 'scrapeJobList') {
      const jobs = scrapeJobList();
      sendResponse({ jobs });
    }

    return true; // keep channel open for async
  });

  // ─── Scrape job list cards ────────────────────────────────────────────────
  function scrapeJobList() {
    const cards = document.querySelectorAll([
      '.jobs-search-results__list-item',
      '.job-card-container',
      '[data-job-id]',
      '.scaffold-layout__list-item'
    ].join(', '));

    const results = [];

    cards.forEach(card => {
      const title = card.querySelector([
        '.job-card-list__title',
        '.job-card-container__link strong',
        'a[class*="job-card"] strong',
        '[class*="job-title"]'
      ].join(', '))?.innerText?.trim() || '';

      const company = card.querySelector([
        '.job-card-container__company-name',
        '.artdeco-entity-lockup__subtitle',
        '[class*="company-name"]',
        '[class*="subtitle"]'
      ].join(', '))?.innerText?.trim() || '';

      const location = card.querySelector([
        '.job-card-container__metadata-item',
        '[class*="metadata-item"]',
        '[class*="location"]'
      ].join(', '))?.innerText?.trim() || '';

      const link = card.querySelector('a[href*="/jobs/view/"]');
      const url = link ? 'https://www.linkedin.com' + (link.getAttribute('href')?.split('?')[0] || '') : '';

      const jobId = card.dataset.jobId || card.dataset.occludableJobId || '';

      if (title || company) {
        results.push({ title, company, location, url, jobId });
      }
    });

    return results;
  }

})();
