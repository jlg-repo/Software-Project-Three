import cron from 'node-cron';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { spawn } from 'child_process';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

import { connectDatabase } from '../server/db.js';
import { runNotifications } from '../server/notify.js';

dotenv.config();

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCRAPE_SCRIPT = join(__dirname, 'scrape.js');

// runs the scraper as a separate process instead of importing it directly
// the scraper opens puppeteer and closes its own db connection when done
// if we ran it in the same process it would kill the cron's db connection too
function spawnScrape() {
  return new Promise((resolve, reject) => {
    console.log(`[${new Date().toISOString()}] Scraping menu...`);
    const child = spawn(process.execPath, [SCRAPE_SCRIPT], { stdio: 'inherit' });
    child.on('exit', code => {
      if (code === 0) resolve();
      else reject(new Error(`Scrape exited with code ${code}`));
    });
  });
}

async function runDaily() {
  try {
    await spawnScrape();
    console.log(`[${new Date().toISOString()}] Scrape complete. Running notifications...`);

    await connectDatabase();
    await runNotifications();
    console.log(`[${new Date().toISOString()}] Daily job done.`);
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Daily job failed:`, err.message);
  } finally {
    await mongoose.connection.close();
  }
}

// 8:00 AM EST daily
cron.schedule('0 8 * * *', runDaily, { timezone: 'America/New_York' });

console.log('Cron daemon started — daily job at 8:00 AM EST (scrape → notify).');
console.log('Press Ctrl+C to stop.');
