const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  post: { type: mongoose.Schema.Types.ObjectId, ref: 'Post', required: true },
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String, required: true, trim: true },
  parentComment: { type: mongoose.Schema.Types.ObjectId, ref: 'Comment', default: null }, // for nested
  isDeleted: { type: Boolean, default: false }
}, {
  timestamps: true
});

module.exports = mongoose.model('Comment', commentSchema);
