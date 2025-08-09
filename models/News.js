const mongoose = require("mongoose");

const newsSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    content: { type: String, required: true },
    category: { type: String, required: true },
    tags: [{ type: String }],
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false
    },
    community: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Community",
      required: false
    },
    imageUrl: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model("News", newsSchema);
