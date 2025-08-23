const mongoose = require("mongoose");

const bhajanSchema = new mongoose.Schema(
  {
    community: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Community",
      required: false, 
    },
    title: { type: String, required: true, trim: true },
    artist: { type: String, required: true, trim: true },
    duration: { type: String }, // example: '4:18'
    views: { type: String }, // keeping string since you gave '3.2M'
    youtubeUrl: { type: String, required: true },
    thumbnailUrl: { type: String, required: true },
    description: { type: String },
    category: { type: String, default: "Devotional" },
  },
  { timestamps: true }
);

const Bhajan = mongoose.model("Bhajan", bhajanSchema);

module.exports = Bhajan;