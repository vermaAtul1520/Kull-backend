const mongoose = require("mongoose");

/**
 * Occasion Content Schema
 * Stores the actual media/file content for an Occasion
 */
const OccasionContentSchema = new mongoose.Schema(
  {
    occasion: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Occasion",
      required: true,
    },
    type: {
      type: String,
      enum: ["pdf", "image", "video"],
      required: true
    },
    url: { type: String, required: true },
    thumbnailUrl: { type: String },
    language: { type: String },
  },
  { timestamps: true }
);

/**
 * Occasion Category Schema
 * Stores the categories of occasions (e.g., Festival, Ceremony)
 */
const OccasionCategorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: { type: String },

    // Link category to one of the 5 occasion types
    occasionType: {
      type: String,
      enum: [
        "Family Deities",
        "Birth Details / Naming",
        "Boys Marriage",
        "Girls Marriage",
        "Death Details",
      ],
      required: false,
    },

    // Ownership: category belongs to a community
    community: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Community",
      required: true,
    },
  },
  { timestamps: true }
);

/**
 * Occasion Schema
 * Stores the metadata for an occasion
 */
const OccasionSchema = new mongoose.Schema(
  {
    occasionType: {
      type: String,
      enum: [
        "Family Deities",
        "Birth Details / Naming",
        "Boys Marriage",
        "Girls Marriage",
        "Death Details",
      ],
      required: true,
    },

    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "OccasionCategory",
      required: false,
    },

    gender: {
      type: String,
      enum: ["male", "female", "other", "not specified"],
      default: "not specified", // optional, nullable
    },

    gotra: {
      type: String, required: false ,

    },
    subGotra: {
      type: String, required: false ,
    },

    // Ownership
    community: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Community",
      required: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },

    // Reference to content (1:N relationship)
    contents: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "OccasionContent",
      },
    ],
  },
  { timestamps: true }
);

OccasionSchema.index({ community: 1 });
OccasionSchema.index({ createdBy: 1 });
OccasionSchema.index({ occasionType: 1 });
OccasionSchema.index({ category: 1 });
OccasionSchema.index({ createdAt: -1 });

OccasionCategorySchema.index({ community: 1 });
OccasionCategorySchema.index({ occasionType: 1 });

OccasionContentSchema.index({ occasion: 1 });

// Export models
const OccasionContent = mongoose.model("OccasionContent", OccasionContentSchema);
const OccasionCategory = mongoose.model("OccasionCategory", OccasionCategorySchema);
const Occasion = mongoose.model("Occasion", OccasionSchema);

module.exports = {
  OccasionContent,
  OccasionCategory,
  Occasion,
};
