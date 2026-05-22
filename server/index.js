import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

import { connectDatabase } from "./db.js";
import { User } from "./models/User.js";
import { Favorite } from "./models/Favorite.js";
import { MenuSnapshot } from "./models/MenuSnapshot.js";
import { MenuItem } from "./models/MenuItem.js";
import { ScrapeRun } from "./models/ScrapeRun.js";
import { CalendarEvent } from "./models/CalendarEvent.js";
import { requireAuth } from "./middleware/auth.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;
const DINE_HALL_NAME = "Hamilton Dining Hall";

app.use(cors());
app.use(express.json());

function assertConfig() {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is required");
  }
  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI is required");
  }
}

function signToken(userId) {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: "7d" });
}

async function getFavoritesForUser(userId) {
  return Favorite.find({ userId }).sort({ addedAt: -1 }).lean();
}

async function toPublicUser(user) {
  const favorites = await getFavoritesForUser(user._id);

  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    favorites: favorites.map((favorite) => favorite.name),
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

async function loadUser(req, res, next) {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ message: "Account not found" });
    }
    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
}

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.get("/api/menu/latest", async (_req, res, next) => {
  try {
    const snapshot = await MenuSnapshot.findOne({ diningHall: DINE_HALL_NAME })
      .sort({ scrapedAt: -1 })
      .lean();

    if (!snapshot) {
      return res.json({ snapshot: null, items: [] });
    }

    const items = await MenuItem.find({ snapshotId: snapshot._id })
      .sort({ itemOrder: 1 })
      .lean();

    res.json({ snapshot, items });
  } catch (error) {
    next(error);
  }
});

app.get("/api/menu/snapshots", async (_req, res, next) => {
  try {
    const snapshots = await MenuSnapshot.find({ diningHall: DINE_HALL_NAME })
      .sort({ scrapedAt: -1 })
      .limit(10)
      .lean();

    res.json({ snapshots });
  } catch (error) {
    next(error);
  }
});

app.get("/api/scrape-runs", async (_req, res, next) => {
  try {
    const runs = await ScrapeRun.find({ url: { $exists: true } })
      .sort({ startedAt: -1 })
      .limit(20)
      .lean();

    res.json({ runs });
  } catch (error) {
    next(error);
  }
});

app.post("/api/auth/signup", async (req, res, next) => {
  try {
    const name = String(req.body.name ?? "").trim();
    const email = String(req.body.email ?? "").trim().toLowerCase();
    const password = String(req.body.password ?? "");

    if (!name || !email || !password) {
      return res.status(400).json({ message: "Name, email, and password are required" });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({ message: "An account with that email already exists" });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({ name, email, passwordHash });
    const token = signToken(user._id.toString());

    res.status(201).json({ token, user: await toPublicUser(user) });
  } catch (error) {
    next(error);
  }
});

app.post("/api/auth/login", async (req, res, next) => {
  try {
    const email = String(req.body.email ?? "").trim().toLowerCase();
    const password = String(req.body.password ?? "");

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const token = signToken(user._id.toString());
    res.json({ token, user: await toPublicUser(user) });
  } catch (error) {
    next(error);
  }
});

app.get("/api/auth/me", requireAuth, loadUser, async (req, res, next) => {
  try {
    res.json({ user: await toPublicUser(req.user) });
  } catch (error) {
    next(error);
  }
});

app.get("/api/favorites", requireAuth, loadUser, async (req, res, next) => {
  try {
    const favorites = await getFavoritesForUser(req.user._id);
    res.json({ favorites, user: await toPublicUser(req.user) });
  } catch (error) {
    next(error);
  }
});

app.post("/api/favorites", requireAuth, loadUser, async (req, res, next) => {
  try {
    const name = String(req.body.name ?? "").trim();
    const station = String(req.body.station ?? "").trim();
    const dietary = Array.isArray(req.body.dietary)
      ? req.body.dietary.map((entry) => String(entry).trim()).filter(Boolean)
      : [];

    if (!name) {
      return res.status(400).json({ message: "Favorite name is required" });
    }

    await Favorite.updateOne(
      { userId: req.user._id, name },
      {
        $setOnInsert: {
          userId: req.user._id,
          name,
          station,
          dietary,
          addedAt: new Date(),
        },
      },
      { upsert: true }
    );

    const favorites = await getFavoritesForUser(req.user._id);
    res.status(201).json({ favorites, user: await toPublicUser(req.user) });
  } catch (error) {
    next(error);
  }
});

app.delete("/api/favorites/:name", requireAuth, loadUser, async (req, res, next) => {
  try {
    const name = decodeURIComponent(req.params.name);
    await Favorite.deleteOne({ userId: req.user._id, name });

    const favorites = await getFavoritesForUser(req.user._id);
    res.json({ favorites, user: await toPublicUser(req.user) });
  } catch (error) {
    next(error);
  }
});

app.delete("/api/favorites", requireAuth, loadUser, async (req, res, next) => {
  try {
    await Favorite.deleteMany({ userId: req.user._id });
    res.json({ favorites: [], user: await toPublicUser(req.user) });
  } catch (error) {
    next(error);
  }
});

app.get("/api/calendar-events", requireAuth, loadUser, async (req, res, next) => {
  try {
    const events = await CalendarEvent.find({ userId: req.user._id })
      .sort({ date: 1 })
      .lean();

    res.json({ events });
  } catch (error) {
    next(error);
  }
});

app.post("/api/calendar-events", requireAuth, loadUser, async (req, res, next) => {
  try {
    const title = String(req.body.title ?? "").trim();
    const date = req.body.date ? new Date(req.body.date) : null;
    const mealType = String(req.body.mealType ?? "").trim();
    const notes = String(req.body.notes ?? "").trim();
    const linkedMenuItemName = String(req.body.linkedMenuItemName ?? "").trim();

    if (!title || !date || Number.isNaN(date.getTime())) {
      return res.status(400).json({ message: "Title and a valid date are required" });
    }

    const event = await CalendarEvent.create({
      userId: req.user._id,
      title,
      date,
      mealType,
      notes,
      linkedMenuItemName,
    });

    res.status(201).json({ event });
  } catch (error) {
    next(error);
  }
});

app.delete("/api/calendar-events/:id", requireAuth, loadUser, async (req, res, next) => {
  try {
    await CalendarEvent.deleteOne({ _id: req.params.id, userId: req.user._id });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ message: "Server error" });
});

async function start() {
  assertConfig();
  await connectDatabase();
  app.listen(PORT, () => {
    console.log(`API server running on http://localhost:${PORT}`);
  });
}

start().catch((error) => {
  console.error("Failed to start server:", error.message);
  process.exit(1);
});
