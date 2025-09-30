const mongoose = require('mongoose');

const familyRelationshipSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  relatedUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  relationType: {
    type: String,
    required: true,
    enum: [
      // Parent-Child
      'father', 'mother', 'son', 'daughter',
      // Spouse
      'husband', 'wife', 'spouse',
      // Siblings
      'brother', 'sister',
      // Grandparents
      'grandfather', 'grandmother', 'grandson', 'granddaughter',
      // Extended
      'uncle', 'aunt', 'nephew', 'niece', 'cousin',
      // In-laws
      'father-in-law', 'mother-in-law', 'son-in-law', 'daughter-in-law',
      'brother-in-law', 'sister-in-law'
    ]
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Compound unique index to prevent duplicate relationships
familyRelationshipSchema.index({ user: 1, relatedUser: 1 }, { unique: true });

// Index for faster queries
familyRelationshipSchema.index({ user: 1 });
familyRelationshipSchema.index({ relatedUser: 1 });

module.exports = mongoose.model('FamilyRelationship', familyRelationshipSchema);