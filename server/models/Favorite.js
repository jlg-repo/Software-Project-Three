import mongoose from "mongoose";

const favoriteSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    name: { type: String, required: true, trim: true },
    station: { type: String, trim: true, default: "" },
    dietary: { type: [String], default: [] },
    addedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

favoriteSchema.index({ userId: 1, name: 1 }, { unique: true });

export const Favorite = mongoose.model("Favorite", favoriteSchema);
