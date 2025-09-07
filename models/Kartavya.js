const mongoose = require("mongoose");

const KartavyaSchema = new mongoose.Schema(
  {
    title: String,
    description: String,
    category: {
      type: String,
      required: true,
    },
    filetype: {
      type: String,
      enum: ["pdf", "image", "video"],
    },
    attachment: String,
    thumbnailUrl: String,
    language: String,
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

module.exports = mongoose.model("Kartavya", KartavyaSchema);
