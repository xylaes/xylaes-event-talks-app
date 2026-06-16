# BigQuery Release Notes Hub

A modern, responsive, and premium Flask-based web application to track, filter, search, and share Google Cloud BigQuery release notes. The application is styled with a sleek, dark-themed developer console aesthetic.

## Features

-   **Granular Release Notes Parsing**: Automatically splits daily summaries from the Google feed by their `<h3>` elements, isolating individual updates (Features, Issues, Changes, Deprecations) into distinct, selectable cards.
-   **Dual-Layer Caching & Fallback**: Stores parsed releases in a local cache (`releases_cache.json`) for 1 hour to optimize performance and prevent rate-limiting. A **Refresh** action bypasses the cache to query the feed directly. If Google's feed is down, the server serves the last cached version.
-   **Category Filter Stats**: Real-time counter metrics for each release category (Features, Changes, Deprecations, Issues) that function as quick toggles to filter the cards list.
-   **Full-Text Search**: An interactive search bar that indexes date, type, and description strings in real-time.
-   **Card-Level Clipboard Copy**: Quick-copy text descriptions directly from any release card with active visual checkmark feedback.
-   **Client-Side CSV Export**: Download the currently filtered list of release notes as a CSV spreadsheet (`Date`, `Category`, `Description`, `Link`) with proper string escaping.
-   **Sleek Light/Dark Mode Toggle**: Dynamically overrides CSS root variables to switch themes, persisting choices across sessions in `localStorage`.
-   **Tweet Draft Composer**: Select any update to generate a formatted post draft ready for X (Twitter).
    -   **Dynamic Truncation**: Accounts for Twitter's 280-character limit and URL shortener cost (t.co links cost exactly 23 characters), automatically clipping descriptions so they fit.
    -   **Live Counter & Progress Bar**: Visual helper shifting colors from blue (normal) to amber (warning, >240 chars) and red (overlimit, >280 chars) with button locking.
    -   **Web Intent Integration**: Launches the official Twitter composer popup with one click.

## File Structure

The project contains the following components:

*   [app.py](app.py) - The main Python Flask web server. Handles caching, XML feed parsing (BeautifulSoup4 + feedparser), and API routes.
*   [requirements.txt](requirements.txt) - Python package dependencies list.
*   [templates/index.html](templates/index.html) - HTML5 layout containing panels, filters, detail panels, and SEO tags.
*   [static/css/styles.css](static/css/styles.css) - Premium stylesheets with slate dark mode variables, CSS grids, custom scrollbars, and micro-animations.
*   [static/js/app.js](static/js/app.js) - App controller managing UI state, search/category filters, details binding, and Twitter character math.
*   [.gitignore](.gitignore) - Directs Git to ignore virtual environments, bytecode caches, and local data files.

---

## How to Get Started

### Prerequisites

*   Python 3.8 or higher

### Installation

1.  Navigate to the project root directory:
    ```bash
    cd bq-release-notes
    ```

2.  Create and activate a virtual environment:
    *   **Windows (PowerShell)**:
        ```powershell
        python -m venv .venv
        .venv\Scripts\Activate.ps1
        ```
    *   **Windows (Command Prompt)**:
        ```cmd
        python -m venv .venv
        .venv\Scripts\activate.bat
        ```
    *   **macOS / Linux**:
        ```bash
        python3 -m venv .venv
        source .venv/bin/activate
        ```

3.  Install dependencies:
    ```bash
    pip install -r requirements.txt
    ```

### Running the Application

Start the Flask server locally:
```bash
python app.py
```

Open your browser and navigate to:
```
http://127.0.0.1:5000/
```

---

## Author

Developed by **Xylaes**.
