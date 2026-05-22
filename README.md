# Hamiltion Dining Hall Email Service

This is the final project of Hayden,Jason,Chris,and Brandon for software enginnering.
For our Hamiltion Email Service we've used, node.js,Jest,EmailJS,MongoDB,and puppeteer to create a dynamicaly web-scraped menu of the Hamiltion Dining Hall.

# Node.JS
This covered our basic functionality of the site, page navigation, and routing
# Jest 
Jest was implemented as to run tests on fields, and general health of the server and tests of field conditons, and signup conditions.
# Emailjs
EmailJs is one of the two parts of the Email service, Notification is called by the puppeteer scrape. Which in the saving of favorites within Mongo then notifies users of thier favorited menu items if they happen to have any favorites that are on the day's web scrape.
# Puppeteer
Puppeter is the Second of the main part of the Email service, every morning the Puppeteers runs a preset list of commands to web-scrape and parse the day's menu, this then calls EMailJS.
# MongoDB
MongoDB is our Storage system for users' favorites, menuitems,users and menu data.
# Scripts
A multitude of scripts were required for the functionality of puppeteer and EMailJS, They are as follows

## Build.JS
Runs NPM build Steps, build:tsc and build:client
## Cron.JS
This is the call of a daily webscrape, scheduled at 8AM to run puppeteer, and update mongoDB, and then the notificaitons.
## Dev.JS
Runs the Dev server and Dev client as to link both
## Scrape.JS
This is the puppeteer launch, functions and logic, saving results and calling Notification
## Seed-Master.js
This is a subfunction of Puppeteer to iterate through a calender, this is part of a un-implemented calender system.