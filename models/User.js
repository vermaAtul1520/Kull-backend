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
  gender: {
    type: String,
    enum: ["male", "female", "other"],
  },
  occupation: { type: String },
  religion: { type: String },
  motherTongue: { type: String },
  interests: {
    type: [String],
    default: [],
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Register the pre-save hook BEFORE exporting the model
// userSchema.pre("save", async function (next) {
//   if (!this.isModified("password")) return next();
//   const salt = await bcrypt.genSalt(10);
//   this.password = await bcrypt.hash(this.password, salt);
//   next();
// });

// Export AFTER defining schema and hooks
module.exports = mongoose.model("User", userSchema);
