const mongoose = require("mongoose");

const appealSchema = new mongoose.Schema(
  {
    subject: { type: String, required: true, trim: true },
    description: { type: String, required: true },

    category: {
      type: String,
      enum: ["general", "technical", "financial", "other"],
      default: "general",
    },

    status: {
      type: String,
      enum: ["submitted", "in-review", "resolved", "rejected"],
      default: "submitted",
    },

    priority: {
      type: String,
      enum: ["low", "medium", "high", "critical"],
      default: "low",
    },

    attachment: { type: String, required: false },

    // Relations
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    community: { type: mongoose.Schema.Types.ObjectId, ref: "Community", required: true },

    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // admin/mod

  },
  { timestamps: true }
);

module.exports = mongoose.model("Appeal", appealSchema);