# LinkedIn Job Copier — Chrome Extension

A browser extension that adds a **"Copy Job Description"** button to LinkedIn job listings, and lets you scrape & export all job cards from a search results page.

---

## ✨ Features

- **📋 Copy Job Description** — One-click copy of the full job description (title, company, location, URL + description) to clipboard, formatted cleanly for sharing with people or LLMs
- **Copy Summary** — Copies just the title, company, location & URL (no description)
- **Scrape Job List** — Extracts all job cards visible on a LinkedIn jobs search page
- **Copy All as Text** — Copies the entire scraped list as formatted text
- **⬇ Export CSV** — Downloads all scraped jobs as a `.csv` file

---

## 🚀 Installation

### Chrome / Brave / Edge / Arc / Vivaldi (any Chromium browser)

1. **Download & unzip** this folder somewhere on your computer
2. Open your browser and go to the extensions page:
   - **Chrome**: `chrome://extensions`
   - **Brave**: `brave://extensions`
   - **Edge**: `edge://extensions`
   - **Arc**: Type `extensions` in the command bar
3. Enable **Developer Mode** (toggle in the top-right corner)
4. Click **"Load unpacked"**
5. Select the `linkedin-job-copier` folder
6. The extension icon (🔷) will appear in your toolbar

> **Note for Edge**: You may see a prompt asking if you want to keep the extension — click "Keep it".

---

## 📖 How to Use

### Copy a Single Job Description
1. Go to any LinkedIn job listing (e.g., `linkedin.com/jobs/view/...`)
2. Click on a job in the list — the right panel will show the job details
3. A **"📋 Copy Job Description"** button will appear below the Apply button
4. Click it → the full job description is now in your clipboard!

OR:
1. Click the extension icon in your toolbar
2. The popup shows the currently selected job
3. Click **"Copy Job Description"** or **"Copy Summary"**

### Scrape All Jobs on a Search Page
1. Go to LinkedIn Jobs search results (`linkedin.com/jobs/search/...`)
2. Click the extension icon
3. Click **"Scrape List"** — all visible job cards are extracted
4. Click **"Copy All as Text"** or **"⬇ Export CSV"**

---

## 🌐 Cross-Browser Compatibility

This extension uses the standard **WebExtensions API (Manifest V3)** which is supported by all Chromium-based browsers:

| Browser | Compatible? |
|---------|------------|
| Chrome  | ✅ Yes |
| Brave   | ✅ Yes |
| Edge    | ✅ Yes |
| Arc     | ✅ Yes |
| Vivaldi | ✅ Yes |
| Opera   | ✅ Yes |
| Firefox | ⚠️ Mostly (requires minor tweaks for MV3 differences) |
| Safari  | ❌ No (uses different extension system) |

---

## ⚠️ Notes

- LinkedIn periodically updates their page structure (CSS class names). If the button stops appearing or scraping breaks, the selectors in `content.js` may need updating.
- The extension only activates on `linkedin.com/jobs/*` pages.
- No data is sent anywhere — everything runs locally in your browser.

---

## 📁 File Structure

```
linkedin-job-copier/
├── manifest.json      # Extension config (Manifest V3)
├── content.js         # Injected into LinkedIn pages, adds Copy button
├── content.css        # Styles for the injected button & toast
├── popup.html         # Extension popup UI
├── popup.css          # Popup styles
├── popup.js           # Popup logic
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```
