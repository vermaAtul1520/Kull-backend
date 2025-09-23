const mongoose = require("mongoose");

const OccasionSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    author: { type: String },
    description: { type: String },
    category: { 
      type: String, 
      required: false 
    },
    subCategory: { type: String }, // variable
    type: { type: String, enum: ["pdf", "image"], required: true },
    url: { type: String, required: true },
    thumbnailUrl: { type: String },
    language: { type: String },

    // Ownership
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

module.exports = mongoose.model("Occasion", OccasionSchema);