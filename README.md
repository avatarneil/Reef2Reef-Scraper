# Reef2Reef Scraper

A web scraping tool for Reef2Reef.

## Environment Setup

1. Copy the `.env.example` file to create your own `.env`:
```bash
cp .env.example .env
```

2. Configure your `.env` file with the following variables:

### Browser Configuration
- `CHROME_PATH`: Path to your Chrome executable
  - Mac default: `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`
  - Windows default: `C:\Program Files\Google\Chrome\Application\chrome.exe`
- `BROWSER_HEADLESS`: Set to `true` for headless mode, `false` to see the browser
- `VIEWPORT_WIDTH`: Browser viewport width (default: 1280)
- `VIEWPORT_HEIGHT`: Browser viewport height (default: 800)

### User Configuration
- `USER_AGENT`: Your browser's user agent string
  - You can find your user agent by visiting: https://www.whatismybrowser.com/detect/what-is-my-user-agent/

### Scraping Configuration
- `TARGET_USER`: The username to scrape
- `BASE_URL`: The base URL for the scraping target

Example `.env` configuration:
```env
# Browser Configuration
CHROME_PATH=/Applications/Google Chrome.app/Contents/MacOS/Google Chrome
BROWSER_HEADLESS=false
VIEWPORT_WIDTH=1280
VIEWPORT_HEIGHT=800

# User Configuration
USER_AGENT=Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36

# Scraping Configuration
TARGET_USER=Silent
BASE_URL=https://www.reef2reef.com/search/5928544/
```

⚠️ Important: Never commit your `.env` file to version control. The `.env.example` file is provided as a template.

To install dependencies:

```bash
bun install
```

To run:

```bash
bun run index.ts
```

This project was created using `bun init` in bun v1.1.22. [Bun](https://bun.sh) is a fast all-in-one JavaScript runtime.
