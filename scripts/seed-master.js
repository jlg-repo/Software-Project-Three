// npm run seed:master
// clicks through every available day on the dining hall calendar and adds any new items to the master menu
// the calendar is react-datepicker and clicking a day closes it, so we re-open it before each click
// greyed out days use the class react-datepicker__day--disabled, we skip those

import puppeteer from 'puppeteer';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

import { connectDatabase } from '../server/db.js';
import { MasterMenuItem } from '../server/models/MasterMenuItem.js';

dotenv.config();

const MENU_URL = 'https://ncf.mydininghub.com/en/location/hamilton-dining-hall';

// Selector for the button/input that opens the datepicker popper
const CALENDAR_TRIGGER = '.react-datepicker__input-container button, .react-datepicker__input-container input';
// All day cells that are not disabled and not overflow days from adjacent months
const AVAILABLE_DAY = '.react-datepicker__day:not(.react-datepicker__day--disabled):not(.react-datepicker__day--outside-month)';

function normalizeStation(raw) {
  const n = raw.toLowerCase();
  if (n.includes('grille') || n.includes('ignite') || n.includes('iron') || n.includes('skillet')) return 'Entree Station';
  if (n.includes('soup') || n.includes('simmer')) return 'Soup Station';
  if (n.includes('vegan')) return 'Vegan Station';
  if (n.includes('dessert') || n.includes('confection')) return 'Dessert Station';
  if (n.includes('salad') || n.includes('root')) return 'Salad Bar';
  return raw;
}

async function openCalendar(page) {
  await page.click(CALENDAR_TRIGGER);
  await page.waitForSelector('.react-datepicker__month', { timeout: 5000 });
}

async function closeCalendar(page) {
  await page.keyboard.press('Escape');
  await new Promise(r => setTimeout(r, 300));
}

// Returns the unique day-number class suffix for each available day,
// e.g. ["react-datepicker__day--003", "react-datepicker__day--004", ...]
async function getAvailableDayClasses(page) {
  return page.evaluate((selector) => {
    return Array.from(document.querySelectorAll(selector)).map(el => {
      const dayClass = [...el.classList].find(c => /^react-datepicker__day--\d+$/.test(c));
      return dayClass ?? null;
    }).filter(Boolean);
  }, AVAILABLE_DAY);
}

async function scrapeCurrentMenu(page) {
  try {
    await page.waitForSelector('div.print-hide section h3', { timeout: 6000 });
  } catch {
    return [];
  }

  return page.evaluate(() => {
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
        results.push({ name, station, calories, dietary });
      }
    }
    return results;
  });
}

async function seed() {
  await connectDatabase();

  const existing = await MasterMenuItem.find({}, 'name').lean();
  const masterNames = new Set(existing.map(d => d.name));
  console.log(`Master menu currently has ${masterNames.size} items.`);

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });

  console.log('Loading dining hall page...');
  await page.goto(MENU_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForSelector(CALENDAR_TRIGGER, { timeout: 15000 });

  // Discover how many available days exist
  await openCalendar(page);
  const dayClasses = await getAvailableDayClasses(page);
  await closeCalendar(page);

  console.log(`Found ${dayClasses.length} available days on the calendar.\n`);

  let totalNewItems = 0;
  let daysWithData = 0;

  for (let i = 0; i < dayClasses.length; i++) {
    const dayClass = dayClasses[i];
    const dayNum = dayClass.replace('react-datepicker__day--', '').replace(/^0+/, '');
    const label = `Day ${String(i + 1).padStart(2, '0')} of ${dayClasses.length} (calendar day ${dayNum})`;
    process.stdout.write(`  ${label}  `);

    try {
      // Re-open calendar and click this specific day
      await openCalendar(page);
      await page.click(`.react-datepicker__month .${dayClass}:not(.react-datepicker__day--disabled)`);

      // give React 2 seconds to re-render after the calendar click
      // the menu content is loaded client-side so we need to wait before scraping
      // 2s was enough in testing but bump it if scrapes start coming back empty
      await new Promise(r => setTimeout(r, 2000));

      const items = await scrapeCurrentMenu(page);

      if (!items.length) {
        process.stdout.write('—  no menu posted yet\n');
        continue;
      }

      daysWithData++;
      const toInsert = [];
      const now = new Date();

      for (const item of items) {
        if (!masterNames.has(item.name)) {
          toInsert.push({
            name: item.name,
            station: item.station,
            dietary: item.dietary,
            calories: item.calories,
            firstSeenAt: now,
            lastSeenAt: now,
          });
          masterNames.add(item.name);
          totalNewItems++;
        }
      }

      if (toInsert.length) {
        await MasterMenuItem.insertMany(toInsert, { ordered: false }).catch(() => {});
      }

      process.stdout.write(`${items.length} items  +${toInsert.length} new\n`);
    } catch (err) {
      process.stdout.write(`error — ${err.message}\n`);
      // Try to recover: close any open calendar before the next iteration
      await closeCalendar(page).catch(() => {});
    }

    // Polite pause between days
    await new Promise(r => setTimeout(r, 1000));
  }

  await browser.close();

  console.log(`\n${'─'.repeat(52)}`);
  console.log(`Days with menu data : ${daysWithData} / ${dayClasses.length}`);
  console.log(`New items added     : ${totalNewItems}`);
  console.log(`Master menu total   : ${masterNames.size} unique items`);
}

seed()
  .catch(err => {
    console.error('\nSeed failed:', err.message);
    process.exitCode = 1;
  })
  .finally(() => mongoose.connection.close());
