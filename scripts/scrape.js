import puppeteer from 'puppeteer';
import { writeFileSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

import { connectDatabase } from '../server/db.js';
import { MenuSnapshot } from '../server/models/MenuSnapshot.js';
import { MenuItem } from '../server/models/MenuItem.js';
import { ScrapeRun } from '../server/models/ScrapeRun.js';

dotenv.config();

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '..', 'public');

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

    console.log('Waiting for menu to render...');
    await page.waitForSelector('div.print-hide section h3', { timeout: 15000 });

    const items = await page.evaluate(() => {
      function normalizeStation(raw) {
        const n = raw.toLowerCase();
        if (n.includes('grille') || n.includes('ignite') || n.includes('iron') || n.includes('skillet')) return 'Entree Station';
        if (n.includes('soup') || n.includes('simmer')) return 'Soup Station';
        if (n.includes('vegan')) return 'Vegan Station';
        if (n.includes('dessert') || n.includes('confection')) return 'Dessert Station';
        if (n.includes('salad') || n.includes('root')) return 'Salad Bar';
        if (n.includes('global') || n.includes('international')) return 'International Station';
        if (n.includes('pizza') || n.includes('pasta') || n.includes('italian')) return 'Pasta & Pizza';
        if (n.includes('deli') || n.includes('sandwich')) return 'Deli';
        if (n.includes('grill') || n.includes('burger')) return 'Grill';
        return raw;
      }

      const results = [];
      let order = 0;

      for (const section of document.querySelectorAll('div.print-hide section')) {
        const rawStation = section.querySelector('h3')?.textContent?.trim() ?? 'Other';
        const station = normalizeStation(rawStation);

        for (const card of section.querySelectorAll('ul > li')) {
          const name = card.querySelector('h4')?.textContent?.trim();
          if (!name) continue;

          const calories = card
            .querySelector('div.flex.items-start.gap-sm.p-sm div.mt-xs.flex.flex-col.gap-sm div div span')
            ?.textContent?.trim() ?? null;

          const dietary = Array.from(
            card.querySelectorAll('div.flex.items-center.justify-between.border-t.border-border-base ul li span')
          ).map(el => el.textContent?.trim()).filter(Boolean);

          results.push({ name, station, calories, dietary, itemOrder: order++ });
        }
      }

      return results;
    });

    await browser.close();
    browser = null;

    // some items show up under multiple sections on the dining hall site
    // we keep the first occurrence because the real station name comes before the "Other" fallback
    // Deduplicate by name, keeping first occurrence (real station wins over "Other")
    const seen = new Set();
    const uniqueItems = items.filter(item => {
      if (seen.has(item.name)) return false;
      seen.add(item.name);
      return true;
    });

    console.log(`Found ${uniqueItems.length} unique menu items (${items.length - uniqueItems.length} duplicates removed):`);
    uniqueItems.forEach(i => console.log(`  [${i.station}] ${i.name}${i.calories ? ` · ${i.calories}` : ''}${i.dietary.length ? ` · ${i.dietary.join(', ')}` : ''}`));

    const scrapedAt = new Date();
    const snapshot = await MenuSnapshot.create({
      diningHall: DINING_HALL,
      url: MENU_URL,
      scrapedAt,
      itemCount: uniqueItems.length,
    });

    await MenuItem.insertMany(
      uniqueItems.map(item => ({ ...item, snapshotId: snapshot._id }))
    );

    await ScrapeRun.findByIdAndUpdate(run._id, {
      status: 'success',
      finishedAt: new Date(),
      itemCount: uniqueItems.length,
      snapshotId: snapshot._id,
      errorMessage: '',
    });

    // Keep public/menu.json as a fallback for when the backend is unavailable
    mkdirSync(DATA_DIR, { recursive: true });
    writeFileSync(join(DATA_DIR, 'menu.json'), JSON.stringify({
      scrapedAt: scrapedAt.toISOString(),
      url: MENU_URL,
      items: uniqueItems,
    }, null, 2));

    console.log(`\nSaved ${uniqueItems.length} items → MongoDB + public/menu.json`);
  } catch (error) {
    await ScrapeRun.findByIdAndUpdate(run._id, {
      status: 'error',
      finishedAt: new Date(),
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    if (browser) await browser.close();
    throw error;
  }
}


scrape()
  .catch(err => {
    console.error('Scrape failed:', err.message);
    process.exitCode = 1;
  })
  .finally(() => mongoose.connection.close());
