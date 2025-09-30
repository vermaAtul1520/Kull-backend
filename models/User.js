const mongoose = require("mongoose");

// Function to generate human-readable user code
const generateUserCode = function() {
  const firstInitial = this.firstName ? this.firstName.charAt(0).toUpperCase() : 'U';
  const lastInitial = this.lastName ? this.lastName.charAt(0).toUpperCase() : 'U';
  const phoneDigits = this.phone ? this.phone.slice(-4) : Math.floor(1000 + Math.random() * 9000).toString();
  const randomDigits = Math.floor(10 + Math.random() * 90); // 2 random digits
  return `${firstInitial}${lastInitial}${phoneDigits}${randomDigits}`;
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
userSchema.pre('save', async function(next) {
  if (!this.code) {
    let attempts = 0;
    let codeGenerated = false;

    while (!codeGenerated && attempts < 10) {
      this.code = generateUserCode.call(this);

      // Check if code already exists
      const existingUser = await mongoose.model('User').findOne({ code: this.code });
      if (!existingUser) {
        codeGenerated = true;
      }
      attempts++;
    }

    if (!codeGenerated) {
      return next(new Error('Unable to generate unique user code'));
    }
  }
  next();
});

module.exports = mongoose.model("User", userSchema);
