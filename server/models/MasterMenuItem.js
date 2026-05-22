import mongoose from "mongoose";

const masterMenuItemSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    station: { type: String, trim: true, default: "" },
    dietary: { type: [String], default: [] },
    calories: { type: String, default: null },
    firstSeenAt: { type: Date, required: true },
    lastSeenAt: { type: Date, required: true },
    seenCount: { type: Number, default: 1 },
  },
  { timestamps: true }
);

export const MasterMenuItem = mongoose.model("MasterMenuItem", masterMenuItemSchema);
