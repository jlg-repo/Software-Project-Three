import puppeteer from 'puppeteer';
import { writeFileSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

import { connectDatabase } from '../server/db.js';
import { MenuSnapshot } from '../server/models/MenuSnapshot.js';
import { MenuItem } from '../server/models/MenuItem.js';
import { ScrapeRun } from '../server/models/ScrapeRun.js';
import { classifyMenuItem } from '../server/menuClassification.js';

dotenv.config();

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const DATA_DIR = join(ROOT, 'public');

const MENU_URL = 'https://ncf.mydininghub.com/en/location/hamilton-dining-hall';
const DINING_HALL = 'Hamilton Dining Hall';

async function scrape() {
  await connectDatabase();
  const run = await ScrapeRun.create({
    startedAt: new Date(),
    status: 'running',
    url: MENU_URL,
  });

  console.log('Launching browser...');
  let browser;

  try {
    browser = await puppeteer.launch({ headless: true });
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

    const scrapedAt = new Date();
    const enrichedItems = items.map((name, index) => ({
      name,
      itemOrder: index,
      ...classifyMenuItem(name),
    }));

    const snapshot = await MenuSnapshot.create({
      diningHall: DINING_HALL,
      url: MENU_URL,
      scrapedAt,
      itemCount: enrichedItems.length,
    });

    await MenuItem.insertMany(
      enrichedItems.map(item => ({
        ...item,
        snapshotId: snapshot._id,
      }))
    );

    await ScrapeRun.findByIdAndUpdate(run._id, {
      status: 'success',
      finishedAt: new Date(),
      itemCount: enrichedItems.length,
      snapshotId: snapshot._id,
      errorMessage: '',
    });

    console.log(`Found ${enrichedItems.length} menu items:`);
    enrichedItems.forEach(item => console.log(' -', item.name));

    mkdirSync(DATA_DIR, { recursive: true });
    const outPath = join(DATA_DIR, 'menu.json');
    writeFileSync(outPath, JSON.stringify({
      scrapedAt: scrapedAt.toISOString(),
      url: MENU_URL,
      items: enrichedItems,
    }, null, 2));

    console.log(`\nSaved ${enrichedItems.length} items → public/menu.json`);
  } catch (error) {
    await ScrapeRun.findByIdAndUpdate(run._id, {
      status: 'error',
      finishedAt: new Date(),
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    if (browser) {
      await browser.close();
    }
    throw error;
  }
}

scrape().catch(err => {
  console.error('Scrape failed:', err.message);
  process.exit(1);
});
