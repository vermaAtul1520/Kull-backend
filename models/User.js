const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const userSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: [true, 'First name is required'],
    trim: true,
    maxlength: [50, 'First name cannot exceed 50 characters']
  },
  lastName: {
    type: String,
    required: [true, 'Last name is required'],
    trim: true,
    maxlength: [50, 'Last name cannot exceed 50 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    unique: true,
    trim: true,
    match: [/^\+?[1-9]\d{1,14}$/, 'Please enter a valid phone number']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [8, 'Password must be at least 8 characters'],
    select: false
  },
  role: {
    type: String,
    enum: ['user', 'admin', 'superadmin'],
    default: 'user'
  },
  communities: [{
    community: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Community',
      required: true
    },
    role: {
      type: String,
      enum: ['member', 'admin'],
      default: 'member'
    },
    joinedAt: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'suspended'],
      default: 'pending'
    }
  }],
  avatar: {
    type: String,
    default: null
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  isPhoneVerified: {
    type: Boolean,
    default: false
  },
  lastLogin: {
    type: Date,
    default: null
  },
  resetPasswordToken: String,
  resetPasswordExpires: Date,
  emailVerificationToken: String,
  emailVerificationExpires: Date
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better performance
userSchema.index({ email: 1 });
userSchema.index({ phone: 1 });
userSchema.index({ 'communities.community': 1 });
userSchema.index({ 'communities.status': 1 });

// Virtual for full name
userSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Virtual for approved communities
userSchema.virtual('approvedCommunities').get(function() {
  return this.communities.filter(c => c.status === 'approved');
});

// Pre-save middleware to hash password
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Method to generate JWT token
userSchema.methods.generateAuthToken = function() {
  return jwt.sign(
    { 
      id: this._id,
      email: this.email,
      role: this.role
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

// Method to generate password reset token
userSchema.methods.generateResetPasswordToken = function() {
  const resetToken = crypto.randomBytes(32).toString('hex');
  this.resetPasswordToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');
  this.resetPasswordExpires = Date.now() + 30 * 60 * 1000; // 30 minutes
  return resetToken;
};

// Method to check if user is member of a community
userSchema.methods.isMemberOfCommunity = function(communityId) {
  return this.communities.some(c => 
    c.community.toString() === communityId.toString() && 
    c.status === 'approved'
  );
};

// Method to check if user is admin of a community
userSchema.methods.isAdminOfCommunity = function(communityId) {
  return this.communities.some(c => 
    c.community.toString() === communityId.toString() && 
    c.role === 'admin' && 
    c.status === 'approved'
  );
};

// Method to check if user is superadmin
userSchema.methods.isSuperAdmin = function() {
  return this.role === 'superadmin';
};

// Method to get user's community roles
userSchema.methods.getCommunityRoles = function() {
  return this.communities.reduce((roles, c) => {
    if (c.status === 'approved') {
      roles[c.community.toString()] = c.role;
    }
    return roles;
  }, {});
};

// Static method to find users by community
userSchema.statics.findByCommunity = function(communityId, status = 'approved') {
  return this.find({
    'communities.community': communityId,
    'communities.status': status
  }).populate('communities.community');
};

// Static method to find pending join requests for a community
userSchema.statics.findPendingJoinRequests = function(communityId) {
  return this.find({
    'communities.community': communityId,
    'communities.status': 'pending'
  }).select('firstName lastName email phone communities.$');
};

const User = mongoose.model('User', userSchema);

module.exports = User;