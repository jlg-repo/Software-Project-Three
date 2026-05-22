import puppeteer from 'puppeteer';
import { writeFileSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const DATA_DIR = join(ROOT, 'public');

const MENU_URL = 'https://ncf.mydininghub.com/en/location/hamilton-dining-hall';

async function scrape() {
  console.log('Launching browser...');
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });

  console.log('Navigating to dining hall...');
  await page.goto(MENU_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });

  // Wait for at least one menu item h4 to appear before extracting
  console.log('Waiting for menu items to render...');
  await page.waitForSelector('span[aria-live="polite"] h4', { timeout: 15000 });

  const items = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('span[aria-live="polite"] h4'))
      .map(el => el.textContent?.trim())
      .filter(Boolean);
  });

  await browser.close();

  console.log(`Found ${items.length} menu items:`);
  items.forEach(item => console.log(' -', item));

  mkdirSync(DATA_DIR, { recursive: true });
  const outPath = join(DATA_DIR, 'menu.json');
  writeFileSync(outPath, JSON.stringify({
    scrapedAt: new Date().toISOString(),
    url: MENU_URL,
    items,
  }, null, 2));

  console.log(`\nSaved ${items.length} items → public/menu.json`);
}

scrape().catch(err => {
  console.error('Scrape failed:', err.message);
  process.exit(1);
});
