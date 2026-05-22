import cron from 'node-cron';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { spawn } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCRAPE_SCRIPT = join(__dirname, 'scrape.js');

function runScrape() {
  console.log(`[${new Date().toISOString()}] Running daily menu scrape...`);
  const child = spawn('node', [SCRAPE_SCRIPT], { stdio: 'inherit' });
  child.on('exit', code => {
    if (code === 0) {
      console.log(`[${new Date().toISOString()}] Scrape complete.`);
    } else {
      console.error(`[${new Date().toISOString()}] Scrape exited with code ${code}.`);
    }
  });
}

// 8:00 AM EST = 13:00 UTC
cron.schedule('0 13 * * *', runScrape, { timezone: 'America/New_York' });

console.log('Cron daemon started — scrape scheduled for 8:00 AM EST daily.');
console.log('Press Ctrl+C to stop.');
