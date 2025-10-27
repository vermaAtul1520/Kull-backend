// models/Dukaan.js
const mongoose = require("mongoose");

const DukaanSchema = new mongoose.Schema(
  {
    shopName: {
      type: String,
      required: true,
      trim: true,
    },
    ownerName: {
      type: String,
      required: true,
      trim: true,
    },
    community: { type: mongoose.Schema.Types.ObjectId, ref: "Community", required: true },
    location: {
      type: String,
      required: true,
    },
    phone: {
      type: String,
      required: true,
      match: [/^[0-9]{10}$/, "Phone must be 10 digits"], // Example validation
    },
    category: {
      type: String,
      required: true,
    },
    products: {
      type: [String],
      validate: {
        validator: function (arr) {
          return arr.length <= 5;
        },
        message: "You can only add up to 5 products",
      },
    },
    description: {
      type: String,
    },
    banner: {
      type: String,
      trim: true,
      validate: {
        validator: function(v) {
          if (!v) return true; // Allow empty banner
          // Basic URL validation for image URLs
          return /^https?:\/\/.+\.(jpg|jpeg|png|gif|webp|svg)$/i.test(v);
        },
        message: "Banner must be a valid image URL (jpg, jpeg, png, gif, webp, svg)"
      }
    },
    url: {
      type: String,
      trim: true,
      validate: {
        validator: function(v) {
          if (!v) return true; // Allow empty URL
          // Basic URL validation
          return /^https?:\/\/.+\..+/.test(v);
        },
        message: "Website URL must be a valid URL starting with http:// or https://"
      }
    },
    isActive: {
      type: Boolean,
      default: true
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Dukaan", DukaanSchema);
