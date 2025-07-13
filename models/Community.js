const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const communitySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Community name is required'],
    trim: true,
    maxlength: [100, 'Community name cannot exceed 100 characters'],
    unique: true
  },
  description: {
    type: String,
    required: [true, 'Community description is required'],
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  category: {
    type: String,
    required: [true, 'Community category is required'],
    enum: [
      'Educational',
      'Professional',
      'Social',
      'Sports',
      'Technology',
      'Health',
      'Arts',
      'Business',
      'Other'
    ]
  },
  location: {
    address: {
      type: String,
      required: [true, 'Address is required'],
      trim: true
    },
    city: {
      type: String,
      required: [true, 'City is required'],
      trim: true
    },
    state: {
      type: String,
      required: [true, 'State is required'],
      trim: true
    },
    country: {
      type: String,
      required: [true, 'Country is required'],
      trim: true
    },
    zipCode: {
      type: String,
      required: [true, 'Zip code is required'],
      trim: true
    }
  },
  contactInfo: {
    email: {
      type: String,
      required: [true, 'Contact email is required'],
      trim: true,
      lowercase: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
    },
    phone: {
      type: String,
      required: [true, 'Contact phone is required'],
      trim: true,
      match: [/^\+?[1-9]\d{1,14}$/, 'Please enter a valid phone number']
    },
    website: {
      type: String,
      trim: true,
      match: [/^https?:\/\/.+/, 'Please enter a valid website URL']
    }
  },
  joinKey: {
    type: String,
    unique: true,
    default: function() {
      return uuidv4().substring(0, 8).toUpperCase();
    }
  },
  logo: {
    type: String,
    default: null
  },
  banner: {
    type: String,
    default: null
  },
  documents: [{
    fileName: String,
    filePath: String,
    fileType: String,
    fileSize: Number,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  admin: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'suspended'],
    default: 'pending'
  },
  settings: {
    requireApproval: {
      type: Boolean,
      default: true
    },
    allowPublicView: {
      type: Boolean,
      default: false
    },
    maxMembers: {
      type: Number,
      default: 1000
    }
  },
  stats: {
    totalMembers: {
      type: Number,
      default: 0
    },
    totalContent: {
      type: Number,
      default: 0
    },
    totalViews: {
      type: Number,
      default: 0
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  approvedAt: Date,
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  rejectedAt: Date,
  rejectedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  rejectionReason: String
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better performance
communitySchema.index({ name: 1 });
communitySchema.index({ joinKey: 1 });
communitySchema.index({ status: 1 });
communitySchema.index({ category: 1 });
communitySchema.index({ admin: 1 });
communitySchema.index({ createdAt: -1 });

// Virtual for full address
communitySchema.virtual('fullAddress').get(function() {
  return `${this.location.address}, ${this.location.city}, ${this.location.state}, ${this.location.country} ${this.location.zipCode}`;
});

// Virtual to populate members
communitySchema.virtual('members', {
  ref: 'User',
  localField: '_id',
  foreignField: 'communities.community',
  match: { 'communities.status': 'approved' }
});

// Virtual to populate pending members
communitySchema.virtual('pendingMembers', {
  ref: 'User',
  localField: '_id',
  foreignField: 'communities.community',
  match: { 'communities.status': 'pending' }
});

// Virtual to populate content
communitySchema.virtual('content', {
  ref: 'Content',
  localField: '_id',
  foreignField: 'community'
});

// Pre-save middleware to regenerate join key if needed
communitySchema.pre('save', function(next) {
  if (this.isNew && !this.joinKey) {
    this.joinKey = uuidv4().substring(0, 8).toUpperCase();
  }
  next();
});

// Method to regenerate join key
communitySchema.methods.regenerateJoinKey = function() {
  this.joinKey = uuidv4().substring(0, 8).toUpperCase();
  return this.save();
};

// Method to check if user can join
communitySchema.methods.canUserJoin = function(userId) {
  return this.status === 'approved' && 
         this.isActive && 
         this.stats.totalMembers < this.settings.maxMembers;
};

// Method to approve community
communitySchema.methods.approve = function(approvedBy) {
  this.status = 'approved';
  this.approvedAt = new Date();
  this.approvedBy = approvedBy;
  return this.save();
};

// Method to reject community
communitySchema.methods.reject = function(rejectedBy, reason) {
  this.status = 'rejected';
  this.rejectedAt = new Date();
  this.rejectedBy = rejectedBy;
  this.rejectionReason = reason;
  return this.save();
};

// Method to update member count
communitySchema.methods.updateMemberCount = async function() {
  const User = mongoose.model('User');
  const count = await User.countDocuments({
    'communities.community': this._id,
    'communities.status': 'approved'
  });
  this.stats.totalMembers = count;
  return this.save();
};

// Method to update content count
communitySchema.methods.updateContentCount = async function() {
  const Content = mongoose.model('Content');
  const count = await Content.countDocuments({ community: this._id });
  this.stats.totalContent = count;
  return this.save();
};

// Static method to find by join key
communitySchema.statics.findByJoinKey = function(joinKey) {
  return this.findOne({ joinKey, status: 'approved', isActive: true });
};

// Static method to find pending communities
communitySchema.statics.findPending = function() {
  return this.find({ status: 'pending' })
    .populate('admin', 'firstName lastName email phone')
    .sort({ createdAt: -1 });
};

// Static method to find approved communities
communitySchema.statics.findApproved = function() {
  return this.find({ status: 'approved', isActive: true })
    .populate('admin', 'firstName lastName email')
    .sort({ createdAt: -1 });
};

// Static method to search communities
communitySchema.statics.search = function(query) {
  return this.find({
    $and: [
      { status: 'approved', isActive: true },
      {
        $or: [
          { name: { $regex: query, $options: 'i' } },
          { description: { $regex: query, $options: 'i' } },
          { category: { $regex: query, $options: 'i' } }
        ]
      }
    ]
  });
};

const Community = mongoose.model('Community', communitySchema);

module.exports = Community;