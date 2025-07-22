const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid");

const communitySchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  description: String,
  // Unique code with UUID
  code: {
    type: String,
    unique: true,
    default: () => uuidv4(),
  },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Community", communitySchema)


