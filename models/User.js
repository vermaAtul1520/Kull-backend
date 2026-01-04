const mongoose = require("mongoose");

// Function to generate human-readable user code
const generateUserCode = function() {
  const firstInitial = this.firstName ? this.firstName.charAt(0).toUpperCase() : 'U';
  const lastInitial = this.lastName ? this.lastName.charAt(0).toUpperCase() : 'U';
  const timestamp = Date.now().toString(36).slice(-4).toUpperCase();
  const random = Math.random().toString(36).slice(-3).toUpperCase();
  return `${firstInitial}${lastInitial}${timestamp}${random}`;
};

const userSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  code: {
    type: String,
    unique: true,
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
  // Plain text password for admin viewing (temporary storage)
  // Note: This is not secure for production - consider encryption
  plainTextPassword: {
    type: String,
    select: false, // Don't include by default
  },
  encryptedPassword: {
    type: String,
    select: false, // Only selected when explicitly requested by admin
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
  profileImage:{type: String},
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
  subGotra: { type: String },
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

// Pre-save hook to generate code if not provided
userSchema.pre('save', function(next) {
  if (!this.code) {
    this.code = generateUserCode.call(this);
  }
  next();
});

userSchema.index({ email: 1 });
userSchema.index({ phone: 1 });
userSchema.index({ code: 1 });
userSchema.index({ community: 1 });
userSchema.index({ communityStatus: 1 });
userSchema.index({ roleInCommunity: 1 });
userSchema.index({ community: 1, communityStatus: 1 });
userSchema.index({ community: 1, roleInCommunity: 1 });
userSchema.index({ createdAt: -1 });

module.exports = mongoose.model("User", userSchema);
