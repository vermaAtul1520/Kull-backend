// models/User.js
const { v4: uuidv4 } = require("uuid");
const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  // Unique code with UUID  
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

  // role in global context (e.g., admin of app)
  role: {
    type: String,
    enum: ["user", "admin", "superadmin"],
    default: "user",
  },

  // is user active (in system)
  status: {
    type: Boolean,
    default: true,
  },

  // references one community only
  community: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Community",
  },

  // status of community membership
  communityStatus: {
    type: String,
    enum: ["pending", "approved", "rejected"],
    default: "pending",
  },

  // role in that community
  roleInCommunity: {
    type: String,
    enum: ["member", "moderator", "admin"],
    default: "member",
  },

  // New Fields
  gender: {
    type: String,
    enum: ["male", "female", "other"],
  },

  occupation: {
    type: String,
  },

  religion: {
    type: String,
  },

  motherTongue: {
    type: String,
  },

  interests: {
    type: [String],
    default: [],
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("User", userSchema);
