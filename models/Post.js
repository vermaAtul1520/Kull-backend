const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  content: { type: String, required: true, trim: true },
  imageUrl: { type: String, default: null },
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

module.exports = mongoose.model('Post', postSchema);
