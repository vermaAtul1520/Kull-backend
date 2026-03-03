const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  content: { type: String, required: true, trim: true },
  imageUrl: { type: String, default: null },
  // array for multiple media uploads (images/videos)
  media: [{
    url: { type: String, required: true },
    mediaType: { type: String, enum: ['image', 'video'], required: true },
    createdAt: { type: Date, default: Date.now }
  }],
  // Link to the author (User)
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  // Link to the community
  community: { type: mongoose.Schema.Types.ObjectId, ref: 'Community', required: true },
  // Link to likes (Like)
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Like' }],
  // Link to comments (Comment)
  comments: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Comment' }],

  isActive: { type: Boolean, default: true },
}, {
  timestamps: true
});

postSchema.index({ community: 1 });
postSchema.index({ author: 1 });
postSchema.index({ community: 1, isActive: 1 });
postSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Post', postSchema);
