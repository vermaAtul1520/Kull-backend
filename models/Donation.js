const mongoose = require("mongoose");

const donationSchema = new mongoose.Schema({
  title: { type: String, required: true },
  organization: { type: String, required: true },
  accountNumber: { type: String },
  description: { type: String },
  date: { type: Date, default: Date.now },
  category: { type: String },
  urgency: { type: String, enum: ["Low", "Medium", "High"], default: "Low" },
  qrCode: { type: String },
  beneficiaries: { type: String },
  location: { type: String },
  organizationType: { type: String },
  registrationNumber: { type: String },
  contactEmail: { type: String },
  contactPhone: { type: String },
  images: [{ type: String }],
  communityId: { type: mongoose.Schema.Types.ObjectId, ref: "Community", required: false },
  createdBy: {type: mongoose.Schema.Types.ObjectId,ref: "User",required: false,},
}, {
  timestamps: true
});

module.exports = mongoose.model("Donation", donationSchema);
