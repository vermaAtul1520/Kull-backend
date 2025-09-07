const mongoose = require("mongoose");

const SportsEventSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    organizer: String,
    location: {
      type: String,
      required: true,
    },
    description: String,
    category: String,
    type: {
      type: String,
      enum: ["pdf", "image", "event"],
    },
    url: String,
    thumbnailUrl: String,
    eventDate: {
      type: String,
      required: true,
    },
    registrationFee: String,
    eventType: {
      type: String,
      enum: ["tournament", "match", "training"],
    },
    isUpcoming: {
      type: Boolean,
      default: true,
    },
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

module.exports = mongoose.model("SportsEvent", SportsEventSchema);