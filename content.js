(function () {
  'use strict';

  const BUTTON_ID = 'ljc-copy-btn';
  const TOAST_ID = 'ljc-toast';

  // ─── Selectors for list/collection pages (/jobs/collections/, /jobs/search/)
  const JOB_TITLE_SELECTORS = [
    '.job-details-jobs-unified-top-card__job-title h1',
    '.job-details-jobs-unified-top-card__job-title',
    '.jobs-unified-top-card__job-title h1',
    '.jobs-unified-top-card__job-title',
    'h1.t-24',
    'h1[class*="job-title"]',
    'div[class*="job-title"]'
  ];

  const COMPANY_SELECTORS = [
    '.job-details-jobs-unified-top-card__company-name a',
    '.job-details-jobs-unified-top-card__company-name',
    '.jobs-unified-top-card__company-name a',
    '.jobs-unified-top-card__company-name',
    'a[class*="company-name"]',
    'div[class*="company-name"]'
  ];

  const LOCATION_SELECTORS = [
    '.job-details-jobs-unified-top-card__primary-description-container',
    '.job-details-jobs-unified-top-card__bullet',
    '.jobs-unified-top-card__bullet',
    'span[class*="workplace-type"]',
    'span[class*="bullet"]'
  ];

  const DESCRIPTION_SELECTORS = [
    '.jobs-description__content .jobs-box__html-content',
    '#job-details',
    '.jobs-description__container',
    '[class*="jobs-description"]'
  ];

  const INJECT_ANCHOR_SELECTORS = [
    '.jobs-apply-button--top-card',
    '.jobs-s-apply',
    '[class*="apply-button"]',
    '[class*="jobs-apply"]'
  ];

  function queryFirst(selectors, root = document) {
    for (const sel of selectors) {
      const el = root.querySelector(sel);
      if (el) return el;
    }
    return null;
  }

  // ─── Find element by button text (for hashed-class pages like /jobs/view/) ──
  function findButtonByText(texts) {
    const buttons = document.querySelectorAll('button');
    for (const btn of buttons) {
      const text = btn.innerText?.trim().toLowerCase();
      if (texts.some(t => text === t.toLowerCase())) return btn;
    }
    return null;
  }

  // ─── Find job title on hashed-class pages by looking for the main <h1> ──────
  function findJobTitleEl() {
    // Try known selectors first
    const bySelector = queryFirst(JOB_TITLE_SELECTORS);
    if (bySelector) return bySelector;
    // Fallback: first h1 on page (on /jobs/view/ the job title is always the only h1)
    return document.querySelector('h1');
  }

  // ─── Find company on hashed-class pages ───────────────────────────────────
  function findCompanyEl() {
    const bySelector = queryFirst(COMPANY_SELECTORS);
    if (bySelector) return bySelector;
    // Fallback: find anchor near the h1 (company link is always right below title)
    const h1 = document.querySelector('h1');
    if (h1) {
      // Walk up to parent, then find first anchor inside siblings
      const parent = h1.closest('div, section');
      if (parent) {
        const anchor = parent.querySelector('a[href*="/company/"]');
        if (anchor) return anchor;
      }
    }
    return null;
  }

  // ─── Find description on hashed-class pages ───────────────────────────────
  function findDescriptionEl() {
    // Try known selectors first
    const bySelector = queryFirst(DESCRIPTION_SELECTORS);
    if (bySelector) return bySelector;

    // Fallback: find the largest text block on page (job description is always
    // the biggest chunk of text content on a /jobs/view/ page)
    const candidates = document.querySelectorAll('article, section, div');
    let best = null;
    let bestLen = 0;
    for (const el of candidates) {
      // Skip nav, header, footer
      if (['NAV','HEADER','FOOTER'].includes(el.tagName)) continue;
      if (el.querySelector('nav, header')) continue;
      const len = (el.innerText || '').trim().length;
      // Must be a leaf-ish container (not the entire body)
      const childBlocks = el.querySelectorAll('article, section').length;
      if (len > bestLen && len < 50000 && childBlocks === 0) {
        bestLen = len;
        best = el;
      }
    }
    return best;
  }

  // ─── Find anchor element to inject button next to ─────────────────────────
  function findAnchorEl() {
    // Try known selectors first (works on list/collection pages)
    const bySelector = queryFirst(INJECT_ANCHOR_SELECTORS);
    if (bySelector) return bySelector;

    // Fallback for /jobs/view/: use "Save" button as anchor (always present)
    const saveBtn = findButtonByText(['Save', 'Saved']);
    if (saveBtn) return saveBtn.closest('div') || saveBtn.parentElement;

    return null;
  }

  function extractDescription() {
    const descEl = findDescriptionEl();
    if (!descEl) return null;
    const clone = descEl.cloneNode(true);
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

  function buildClipboardText() {
    const titleEl = findJobTitleEl();
    const companyEl = findCompanyEl();
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

  function showToast(message, type = 'success') {
    let toast = document.getElementById(TOAST_ID);
    if (toast) toast.remove();
    toast = document.createElement('div');
    toast.id = TOAST_ID;
    toast.className = `ljc-toast ljc-toast--${type}`;
    toast.innerHTML = `<span>${type === 'success' ? '✓' : '✕'}</span> ${message}`;
    document.body.appendChild(toast);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => toast.classList.add('ljc-toast--visible'));
    });
    setTimeout(() => {
      toast.classList.remove('ljc-toast--visible');
      setTimeout(() => toast.remove(), 400);
    }, 2500);
  }

  async function copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
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

  function injectButton() {
    const existingBtn = document.getElementById(BUTTON_ID);
    const anchor = findAnchorEl();

    if (existingBtn) {
      if (!anchor || !document.body.contains(existingBtn)) {
        existingBtn.remove();
      } else {
        return;
      }
    }
    if (!anchor) return;

    const btn = document.createElement('button');
    btn.id = BUTTON_ID;
    btn.className = 'ljc-btn';
    btn.textContent = '📋 Copy Job Description';
    btn.title = 'Copy full job description to clipboard';
    btn.addEventListener('click', () => handleCopyClick(btn));
    anchor.appendChild(btn);
  }

  // ─── SPA navigation detection ─────────────────────────────────────────────
  let lastUrl = location.href;

  function onUrlChange() {
    const currentUrl = location.href;
    if (currentUrl !== lastUrl) {
      lastUrl = currentUrl;
      const old = document.getElementById(BUTTON_ID);
      if (old) old.remove();
      [800, 1500, 2500, 4000].forEach(delay => setTimeout(injectButton, delay));
    }
  }

  const _pushState = history.pushState.bind(history);
  history.pushState = function (...args) {
    _pushState(...args);
    onUrlChange();
  };
  const _replaceState = history.replaceState.bind(history);
  history.replaceState = function (...args) {
    _replaceState(...args);
    onUrlChange();
  };
  window.addEventListener('popstate', onUrlChange);

  // ─── MutationObserver ─────────────────────────────────────────────────────
  let debounceTimer = null;
  const observer = new MutationObserver(() => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(injectButton, 600);
  });
  observer.observe(document.body, { childList: true, subtree: true });

  [1000, 2000, 3500].forEach(delay => setTimeout(injectButton, delay));

  // ─── Message listener for popup ───────────────────────────────────────────
  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg.action === 'scrapeCurrentJob') {
      const text = buildClipboardText();
      const titleEl = findJobTitleEl();
      const companyEl = findCompanyEl();
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
    return true;
  });

  // ─── Scrape job list cards ─────────────────────────────────────────────────
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
