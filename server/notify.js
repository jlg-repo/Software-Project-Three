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
  // 1. Latest snapshot + its items
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

  // 2. Master menu names → Set for O(1) lookup
  const masterDocs = await MasterMenuItem.find({}, "name").lean();
  const masterNames = new Set(masterDocs.map((d) => d.name));

  // 3. Inverted favorites index: itemName → Set<userId string>
  const allFavorites = await Favorite.find({}, "userId name").lean();
  const favoritesByItem = new Map();
  for (const fav of allFavorites) {
    if (!favoritesByItem.has(fav.name)) {
      favoritesByItem.set(fav.name, new Set());
    }
    favoritesByItem.get(fav.name).add(fav.userId.toString());
  }

  // 4. ONE PASS — master upsert queue + email queue
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

  // 5. Apply master menu writes
  if (newMasterItems.length) {
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

  // 6. Send emails — one per user, skip anyone already emailed today
  if (!emailQueue.size) {
    console.log("[notify] No favorite matches today, no emails to send.");
    return;
  }

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
      await emailjs.send(
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

      await User.findByIdAndUpdate(user._id, { lastEmailedAt: new Date() });
      sent++;
      console.log(`[notify] Emailed ${user.email} — ${matches.length} match(es)`);
    } catch (err) {
      console.error(`[notify] Failed to email ${user.email}:`, err.message);
    }
  }

  console.log(`[notify] Done — ${sent} email(s) sent.`);
}
