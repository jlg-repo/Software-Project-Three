import mongoose from "mongoose";

const menuItemSchema = new mongoose.Schema(
  {
    snapshotId: { type: mongoose.Schema.Types.ObjectId, ref: "MenuSnapshot", required: true, index: true },
    name: { type: String, required: true, trim: true },
    station: { type: String, trim: true, default: "" },
    dietary: { type: [String], default: [] },
    calories: { type: String, default: null },
    itemOrder: { type: Number, required: true },
  },
  { timestamps: true }
);

menuItemSchema.index({ snapshotId: 1, itemOrder: 1 });

export const MenuItem = mongoose.model("MenuItem", menuItemSchema);
