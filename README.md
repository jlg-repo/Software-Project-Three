# Hamilton Dining Hall Email Service

This is the final project of Hayden, Jason, Chris, Yasir, and Brandon for Software Engineering.
For our Hamilton Email Service we've used Node.js, Jest, EmailJS, MongoDB, and Puppeteer to create a dynamically web-scraped menu of the Hamilton Dining Hall, to allow users to receive an email notification when their favorited food is available at HAM.

# Node.JS
This covered our basic functionality of the site, page navigation, and routing.

# Jest
Jest was implemented to run tests on fields, general server health, field conditions, and signup conditions.

# EmailJS
EmailJS is one of the two parts of the Email service. Notification is called by the Puppeteer scrape.

# Puppeteer
Puppeteer is the second main part of the Email service. Every morning, Puppeteer runs a preset list of commands to web-scrape and parse the day's menu, then calls EmailJS's Notification function.

# MongoDB
MongoDB is our storage system for users' favorites, menu items, users, and menu data.

# Scripts
A multitude of scripts were required for the functionality of Puppeteer and EmailJS. They are as follows:

## Build.JS
`npm run build` — Runs NPM build steps: `build:tsc` and `build:client`.

## Cron.JS
`npm run cron` — This handles the daily web scrape, scheduled at 8AM to run Puppeteer, update MongoDB, and send notifications. This is part of going beyond CRUD — creating permanent background functions.

## Dev.JS
`npm run dev` — Runs the dev server and dev client to link both.

## Scrape.JS
`npm run scrape` — This is the Puppeteer launch — its functions and logic, saving results, and continuing with the web scrape.

## Seed-Master.js
`npm run seed:master` — This is a sub-function of Puppeteer to iterate through the main site's calendar. This is used to seed the master list with an initial larger list of menu items for initial users to have a wider selection of menu items than just that day's menu. It can also be used at any time to look up to 30 days ahead and prepopulate the master menu with the upcoming items, ie. if you wanted to expand the master menu at any time, for better options or for speeding up the daily scrape and notify operations.

## Start
`npm start` — Runs the production API server. In production, also serves the built frontend. Used by Railway for the main web service.

## Test
`npm test` — Runs the Jest test suite covering server health, schema field validation, and signup/auth conditions.

## Trigger-Notify.js
`node scripts/trigger-notify.js` — Manually runs the notification pipeline without scraping. Useful for testing email delivery against the most recent snapshot already in the database.

## Reset-Notified.js
`node scripts/reset-notified.js` — Clears the `lastEmailedAt` flag for all users, allowing notification emails to be re-sent. Used when testing the email pipeline or recovering from a failed send.

# Work Distribution
- Jason — Puppeteer scrape logic and selector fields in schema, cron job, bugfixes, deployment, notify.js searching/matching algorithm, menu filter buttons, Master Menu page
- Chris — MongoDB backend functionality
- Brandon — Frontend and form styles (Login & Signup)
- Yasir — Frontend pages (Home & Favorites)
- Hayden — Floater, README, EmailJS, diagrams

# Backend Strategy
For our design we went with MERN. The use of Node and MongoDB made sense given the requirements of Puppeteer; Firebase has more overhead that would bloat the design and introduce constraints. Part of our design is the usage of JWT tokens, which allowed a slimmed-down login structure we hadn't attempted before due to unfamiliarity. We wanted to minimize the amount of requests made to the database, so we went with a Favorite object structure, and a batch processing/single daily cron job approach to minimize round trips and latency.

# Diagram
<img width="2160" height="1997" alt="Schema" src="https://github.com/user-attachments/assets/f1e63d0b-ac38-4fcd-83a5-321ff21c6f43" />

# Live Link
https://software-project-three-production.up.railway.app/
