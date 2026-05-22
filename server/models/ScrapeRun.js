import mongoose from "mongoose";

const scrapeRunSchema = new mongoose.Schema(
  {
    startedAt: { type: Date, required: true },
    finishedAt: { type: Date, default: null },
    status: { type: String, required: true, enum: ["running", "success", "error"] },
    url: { type: String, required: true, trim: true },
    itemCount: { type: Number, default: 0 },
    snapshotId: { type: mongoose.Schema.Types.ObjectId, ref: "MenuSnapshot", default: null },
    errorMessage: { type: String, default: "" },
  },
  { timestamps: true }
);

scrapeRunSchema.index({ startedAt: -1 });

export const ScrapeRun = mongoose.model("ScrapeRun", scrapeRunSchema);
