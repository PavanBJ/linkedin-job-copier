// LinkedIn Job Copier — Popup Logic
document.addEventListener('DOMContentLoaded', async () => {
  const $ = id => document.getElementById(id);

  const statusDot      = $('statusDot');
  const notLinkedIn    = $('notLinkedIn');
  const mainContent    = $('mainContent');
  const currentCard    = $('currentJobCard');
  const copyCurrentBtn = $('copyCurrentBtn');
  const copyMinimalBtn = $('copyMinimalBtn');
  const scrapeListBtn  = $('scrapeListBtn');
  const jobList        = $('jobList');
  const jobListState   = $('jobListState');
  const listActions    = $('listActions');
  const copyAllBtn     = $('copyAllBtn');
  const exportCsvBtn   = $('exportCsvBtn');

  let currentJob   = null;
  let scrapedJobs  = [];
  let listRendered = false;  // ✅ guard: prevent double render

  // ─── Get active tab ────────────────────────────────────────────────────────
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const isLinkedIn = tab?.url?.includes('linkedin.com/jobs');

  if (!isLinkedIn) {
    statusDot.textContent = 'not on LinkedIn Jobs';
    statusDot.className   = 'status-dot status-dot--not-job';
    notLinkedIn.hidden    = false;
    return;
  }

  mainContent.hidden = false;

  // ─── Inject content script if needed ──────────────────────────────────────
  try {
    await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['content.js'] });
  } catch (_) {}

  await sleep(400);

  loadCurrentJob();
  autoScrapeList();

  // ─── Load current job ──────────────────────────────────────────────────────
  async function loadCurrentJob() {
    try {
      const resp = await sendMessage(tab.id, { action: 'scrapeCurrentJob' });
      if (resp && resp.title && resp.title !== 'N/A') {
        currentJob = resp;
        renderCurrentJob(resp);
        statusDot.textContent   = 'ready';
        statusDot.className     = 'status-dot status-dot--ready';
        copyCurrentBtn.disabled = false;
        copyMinimalBtn.disabled = false;
      } else {
        currentCard.innerHTML   = `<p class="job-card__loading" style="color:#8b949e">No job selected — click a job listing first.</p>`;
        statusDot.textContent   = 'no job selected';
        statusDot.className     = 'status-dot status-dot--not-job';
      }
    } catch (e) {
      currentCard.innerHTML = `<p class="job-card__loading" style="color:#f87171">Could not read page. Try refreshing.</p>`;
    }
  }

  // ─── Auto-scrape list on open ──────────────────────────────────────────────
  async function autoScrapeList() {
    try {
      const resp = await sendMessage(tab.id, { action: 'scrapeJobList' });
      const jobs = resp?.jobs || [];
      if (jobs.length > 0 && !listRendered) {   // ✅ only render if not already done
        scrapedJobs = jobs;
        listRendered = true;
        jobListState.hidden  = true;
        jobList.hidden       = false;
        listActions.hidden   = false;
        scrapeListBtn.textContent = `Scraped (${scrapedJobs.length})`;
        renderJobList(scrapedJobs);
      }
    } catch (_) {}
  }

  // ─── Render current job card ───────────────────────────────────────────────
  function renderCurrentJob(job) {
    const preview = job.description
      ? job.description.slice(0, 200) + (job.description.length > 200 ? '…' : '')
      : 'No description found';
    currentCard.innerHTML = `
      <div class="job-card__title">${escHtml(job.title)}</div>
      <div class="job-card__company">${escHtml(job.company)}</div>
      ${job.location ? `<div class="job-card__location">${escHtml(job.location)}</div>` : ''}
      <div class="job-card__desc-preview">${escHtml(preview)}</div>
    `;
  }

  // ─── Copy current job ──────────────────────────────────────────────────────
  copyCurrentBtn.addEventListener('click', async () => {
    if (!currentJob) return;
    await clipboardWrite(currentJob.fullText);
    flashBtn(copyCurrentBtn, '✓ Copied!');
  });

  copyMinimalBtn.addEventListener('click', async () => {
    if (!currentJob) return;
    const summary = [
      `Title: ${currentJob.title}`,
      `Company: ${currentJob.company}`,
      currentJob.location ? `Location: ${currentJob.location}` : '',
      `URL: ${currentJob.url}`
    ].filter(Boolean).join('\n');
    await clipboardWrite(summary);
    flashBtn(copyMinimalBtn, '✓ Copied!');
  });

  // ─── Manual scrape / refresh list ─────────────────────────────────────────
  scrapeListBtn.addEventListener('click', async () => {
    scrapeListBtn.textContent = 'Scraping…';
    scrapeListBtn.disabled    = true;
    listRendered = false;   // ✅ reset guard so manual refresh always works
    try {
      const resp  = await sendMessage(tab.id, { action: 'scrapeJobList' });
      scrapedJobs = resp?.jobs || [];
      if (scrapedJobs.length === 0) {
        jobListState.textContent = "No job cards found. Make sure you're on a job search results page.";
        jobListState.hidden = false;
        jobList.hidden      = true;
        listActions.hidden  = true;
      } else {
        jobListState.hidden = true;
        jobList.hidden      = false;
        listActions.hidden  = false;
        listRendered = true;
        renderJobList(scrapedJobs);
      }
    } catch (e) {
      jobListState.textContent = 'Error scraping jobs. Try refreshing the page.';
      jobListState.hidden = false;
    }
    scrapeListBtn.textContent = `Scraped (${scrapedJobs.length})`;
    scrapeListBtn.disabled    = false;
  });

  // ─── Render job list ───────────────────────────────────────────────────────
  function renderJobList(jobs) {
    jobList.innerHTML = '';   // ✅ always clear first

    jobs.forEach((job, i) => {
      const item = document.createElement('div');
      item.className = 'job-list-item';
      item.innerHTML = `
        <span class="job-list-item__num">${i + 1}</span>
        <div class="job-list-item__info">
          <div class="job-list-item__title">${escHtml(job.title || 'Untitled')}</div>
          <div class="job-list-item__meta">${escHtml(job.company)}${job.location ? ' · ' + job.location : ''}</div>
        </div>
        <button class="job-list-item__copy" data-idx="${i}">Copy</button>
      `;

      item.querySelector('.job-list-item__copy').addEventListener('click', async e => {
        e.stopPropagation();
        const j    = scrapedJobs[i];
        const text = `Title: ${j.title}\nCompany: ${j.company}${j.location ? '\nLocation: ' + j.location : ''}\nURL: ${j.url}`;
        await clipboardWrite(text);
        const btn = e.target;
        btn.textContent = '✓';
        setTimeout(() => btn.textContent = 'Copy', 1500);
      });

      item.addEventListener('click', () => {
        if (job.url) chrome.tabs.update(tab.id, { url: job.url });
      });

      jobList.appendChild(item);
    });
  }

  // ─── Copy all ──────────────────────────────────────────────────────────────
  copyAllBtn.addEventListener('click', async () => {
    if (!scrapedJobs.length) return;
    const text = scrapedJobs.map((j, i) =>
      `${i + 1}. ${j.title}\nCompany: ${j.company}${j.location ? '\nLocation: ' + j.location : ''}\nURL: ${j.url}`
    ).join('\n\n');
    const full = `LinkedIn Jobs Export — ${new Date().toLocaleDateString()}\n${'─'.repeat(50)}\n\n${text}`;
    await clipboardWrite(full);
    flashBtn(copyAllBtn, '✓ Copied All!');
  });

  // ─── Export CSV ────────────────────────────────────────────────────────────
  exportCsvBtn.addEventListener('click', () => {
    if (!scrapedJobs.length) return;
    const headers = ['#', 'Title', 'Company', 'Location', 'URL'];
    const rows    = scrapedJobs.map((j, i) => [
      i + 1, csvEscape(j.title), csvEscape(j.company), csvEscape(j.location), csvEscape(j.url)
    ]);
    const csv  = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `linkedin-jobs-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  });

  // ─── Helpers ───────────────────────────────────────────────────────────────
  function sendMessage(tabId, msg) {
    return new Promise((resolve, reject) => {
      chrome.tabs.sendMessage(tabId, msg, resp => {
        if (chrome.runtime.lastError) reject(chrome.runtime.lastError);
        else resolve(resp);
      });
    });
  }

  async function clipboardWrite(text) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
    }
  }

  function flashBtn(btn, msg) {
    const orig = btn.textContent;
    btn.textContent = msg;
    btn.classList.add('btn--flashed');
    setTimeout(() => {
      btn.textContent = orig;
      btn.classList.remove('btn--flashed');
    }, 1800);
  }

  function escHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function csvEscape(str) {
    if (!str) return '';
    return `"${str.replace(/"/g, '""')}"`;
  }

  function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
  }
});
