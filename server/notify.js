import emailjs from "@emailjs/nodejs";
import { User } from "./models/User.js";
import { Favorite } from "./models/Favorite.js";
import { MasterMenuItem } from "./models/MasterMenuItem.js";
import { MenuItem } from "./models/MenuItem.js";
import { MenuSnapshot } from "./models/MenuSnapshot.js";

const DINING_HALL = "Hamilton Dining Hall";
// This function is the core of the notification system
// It uses a hashmap and a single pass to efficiently determine which users to email and which master menu items to add/update
// Operates in O(N + M + F) where N = items in today's menu, M = master menu size, F = total favorites count
// Also does a bulk request to the DB, a single Favorite.find(), minimizing round-trips and latency

export async function runNotifications() {
  // grab the most recent snapshot so we know what was served today
  const snapshot = await MenuSnapshot.findOne({ diningHall: DINING_HALL })
    .sort({ scrapedAt: -1 })
    .lean();

  if (!snapshot) {
    console.log("[notify] No snapshot found, skipping.");
    return;
  }

  const todayItems = await MenuItem.find({ snapshotId: snapshot._id }).lean();
  if (!todayItems.length) {
    console.log("[notify] Snapshot is empty, skipping.");
    return;
  }

  // load all master menu names into a Set so lookups are fast
  const masterDocs = await MasterMenuItem.find({}, "name").lean();
  const masterNames = new Set(masterDocs.map((d) => d.name));

  // build a map of item name to the set of users who favorited it
  // this lets us look up "who wants to hear about this item" in one step
  const allFavorites = await Favorite.find({}, "userId name").lean();
  const favoritesByItem = new Map();
  for (const fav of allFavorites) {
    if (!favoritesByItem.has(fav.name)) {
      favoritesByItem.set(fav.name, new Set());
    }
    favoritesByItem.get(fav.name).add(fav.userId.toString());
  }

  // loop through today's items once, building both queues at the same time
  const newMasterItems = [];
  const seenNames = [];
  const emailQueue = new Map(); // userId string → string[]

  for (const item of todayItems) {
    // Master menu: queue new items
    if (!masterNames.has(item.name)) {
      newMasterItems.push({
        name: item.name,
        station: item.station ?? "",
        dietary: item.dietary ?? [],
        calories: item.calories ?? null,
        firstSeenAt: snapshot.scrapedAt,
        lastSeenAt: snapshot.scrapedAt,
      });
      masterNames.add(item.name); // guard against duplicates within the same run
    }

    seenNames.push(item.name);

    // Email queue: check if any user favorited this item
    const userIds = favoritesByItem.get(item.name);
    if (userIds) {
      for (const userId of userIds) {
        if (!emailQueue.has(userId)) emailQueue.set(userId, []);
        emailQueue.get(userId).push(item.name);
      }
    }
  }

  // write any new items to the master menu
  if (newMasterItems.length) {
    // ordered: false keeps inserting even if one doc fails. catch swallows duplicate key errors
    // which can happen if notify runs twice in the same day, totally fine to skip those
    await MasterMenuItem.insertMany(newMasterItems, { ordered: false }).catch(() => {});
    console.log(`[notify] Master menu: +${newMasterItems.length} new items.`);
  } else {
    console.log("[notify] Master menu: no new items today.");
  }

  // Bump lastSeenAt + seenCount for everything on today's menu
  await MasterMenuItem.updateMany(
    { name: { $in: seenNames } },
    { $set: { lastSeenAt: snapshot.scrapedAt }, $inc: { seenCount: 1 } }
  );

  // send one email per user, skip anyone who already got one today
  if (!emailQueue.size) {
    console.log("[notify] No favorite matches today, no emails to send.");
    return;
  }

  // set to midnight so we can filter out anyone already emailed today
  // comparing lastEmailedAt < midnight means they haven't gotten one yet today
  const todayMidnight = new Date();
  todayMidnight.setHours(0, 0, 0, 0);

  const usersToEmail = await User.find({
    _id: { $in: [...emailQueue.keys()] },
    $or: [{ lastEmailedAt: null }, { lastEmailedAt: { $lt: todayMidnight } }],
  }).lean();

  let sent = 0;
  for (const user of usersToEmail) {
    const matches = emailQueue.get(user._id.toString()) ?? [];
    if (!matches.length) continue;

    try {
      const result = await emailjs.send(
        process.env.EMAILJS_SERVICE_ID,
        process.env.EMAILJS_TEMPLATE_ID,
        {
          to_name: user.name.split(" ")[0],
          to_email: user.email,
          match_list: matches.map((n) => `• ${n}`).join("\n"),
          match_count: String(matches.length),
          dining_hall: DINING_HALL,
        },
        {
          publicKey: process.env.EMAILJS_PUBLIC_KEY,
          privateKey: process.env.EMAILJS_PRIVATE_KEY,
        }
      );

      if (result.status !== 200) {
        console.error(`[notify] EmailJS non-200 for ${user.email}: ${result.status} ${result.text}`);
        continue;
      }

      await User.findByIdAndUpdate(user._id, { lastEmailedAt: new Date() });
      sent++;
      console.log(`[notify] Emailed ${user.email} — ${matches.length} match(es)`);
    } catch (err) {
      console.error(`[notify] Failed to email ${user.email}:`, err?.message ?? err?.text ?? JSON.stringify(err));
    }
  }

  console.log(`[notify] Done — ${sent} email(s) sent.`);
}
