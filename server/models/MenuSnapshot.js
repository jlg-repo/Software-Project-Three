import mongoose from "mongoose";

const menuSnapshotSchema = new mongoose.Schema(
  {
    diningHall: { type: String, required: true, trim: true },
    url: { type: String, required: true, trim: true },
    scrapedAt: { type: Date, required: true },
    itemCount: { type: Number, required: true },
  },
  { timestamps: true }
);

menuSnapshotSchema.index({ scrapedAt: -1 });

export const MenuSnapshot = mongoose.model("MenuSnapshot", menuSnapshotSchema);
