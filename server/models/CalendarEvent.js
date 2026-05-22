import mongoose from "mongoose";

const calendarEventSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title: { type: String, required: true, trim: true },
    date: { type: Date, required: true },
    mealType: { type: String, trim: true, default: "" },
    notes: { type: String, trim: true, default: "" },
    linkedMenuItemName: { type: String, trim: true, default: "" },
  },
  { timestamps: true }
);

calendarEventSchema.index({ userId: 1, date: 1 });

export const CalendarEvent = mongoose.model("CalendarEvent", calendarEventSchema);
