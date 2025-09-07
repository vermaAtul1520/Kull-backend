const mongoose = require("mongoose");

const MeetingSchema = new mongoose.Schema(
  {
    title: String,
    description: String,
    organizer: String,
    type: {
      type: String,
      enum: ["pdf", "image", "document"],
    },
    url: String,
    thumbnailUrl: String,
    meetingDate: String,
    meetingTime: String,
    attendees: String,
    documentType: {
      type: String,
      enum: ["agenda", "minutes", "invite"],
    },
    fileSize: Number,

    isActive: {
      type: Boolean,
      default: true,
    },
    community: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Community",
      required: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Meeting", MeetingSchema);