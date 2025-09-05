// models/EducationResource.js
const mongoose = require("mongoose");

const EducationResourceSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String },
    type: {
      type: String,
      enum: ["class_link", "course_material", "guidance"],
      required: true,
    },
    category: { type: String },
    attachment: { type: String }, // could be file URL
    thumbnailUrl: { type: String },
    instructor: { type: String },

    // Multi-tenancy
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

module.exports = mongoose.model("EducationResource", EducationResourceSchema);
