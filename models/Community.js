const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid");

const communitySchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  description: String,
  code: {
    type: String,
    unique: true,
  },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
  createdAt: { type: Date, default: Date.now },
});

// Pre-save hook to generate custom code using community name + short ID
communitySchema.pre('save', function (next) {
  if (!this.code) {
    // 1. Convert to lowercase
    let nameSlug = this.name.toLowerCase();

    // 2. Replace spaces and special characters with hyphen
    nameSlug = nameSlug.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

    // 3. Append short UUID
    const shortId = uuidv4().split("-")[0];

    // 4. Combine to form code
    this.code = `${nameSlug}-${shortId}`;
  }
  next();
});

module.exports = mongoose.model("Community", communitySchema);
