const { v4: uuidv4 } = require("uuid");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  code: {
    type: String,
    unique: true,
    default: () => uuidv4(),
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
    unique: true,
    sparse: true,
    validate: {
      validator: function (v) {
        return this.phone || !!v;
      },
      message: "Either email or phone is required.",
    },
  },
  phone: {
    type: String,
    trim: true,
    unique: true,
    sparse: true,
    validate: {
      validator: function (v) {
        return this.email || !!v;
      },
      message: "Either phone or email is required.",
    },
  },
  password: {
    type: String,
    required: true,
    minlength: 3,
    select: false,
  },
  role: {
    type: String,
    enum: ["user", "admin", "superadmin"],
    default: "user",
  },
  status: {
    type: Boolean,
    default: false,
  },
  community: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Community",
  },
  communityStatus: {
    type: String,
    enum: ["pending", "approved", "rejected"],
    default: "pending",
  },
  roleInCommunity: {
    type: String,
    enum: ["member", "moderator", "admin"],
    default: "member",
  },
  positionInCommunity: {
    type: String,
  },
  gender: {
    type: String,
    enum: ["male", "female", "other","not specified"],
  },
  occupation: { type: String },
  religion: { type: String },
  motherTongue: { type: String },
  interests: {
    type: [String],
    default: [],
  },
  responsibilities: {
    type: [String],
    default: [],
  },
  cast: { type: String },
  cGotNo: { type: String },
  fatherName: { type: String },
  address: { type: String },
  pinCode: { type: String },
  alternativePhone: { type: String },
  estimatedMembers: { type: Number },
  thoughtOfMaking: { type: String },
  maritalStatus: { type: String, enum: ["single", "married", "divorced", "widowed"] },
  gotra: { type: String },
  // Page permissions for dashboard users
  permissions: {
    type: [String],
    default: [],
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("User", userSchema);
