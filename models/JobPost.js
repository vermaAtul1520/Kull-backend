const mongoose = require("mongoose");

const JobPostSchema = new mongoose.Schema(
  {
    title: String,
    company: String,
    location: String,
    description: String,
    category: String,
    fileType: {
      type: String,
      enum: ["pdf", "image", "video"],
    },
    attachment: String,
    thumbnailUrl: String,
    salary: String,
    experience: String,
    language: String,
    community: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Community",
      required: true,
    },
  },
  { timestamps: true }
);

JobPostSchema.index({ community: 1 });
JobPostSchema.index({ createdAt: -1 });

module.exports = mongoose.model("JobPost", JobPostSchema);
