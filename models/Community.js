const mongoose = require("mongoose");


// Community Configuration Schema
const communityConfigurationSchema = new mongoose.Schema({
  // Reference back to the community (true one-to-one)
  community: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Community",
    required: true,
    unique: true, // Ensures one config per community
  },
  // Flexible JSON field for additional metadata
  smaajKeTaaj: {
    type: mongoose.Schema.Types.Mixed,
    default: [],
  },
  // pop up
  addPopup: { type: String, default: null },
  // banner
  banner: {
    type: mongoose.Schema.Types.Mixed,
    default: [],
  },
  // navbar options visibility and display control
  drorOption: {
    type: {
      occasions: {
        visible: { type: Boolean, default: true },
        label: { type: String, default: "Occasions" },
        labelHindi: { type: String, default: "अवसर" }
      },
      kartavya: {
        visible: { type: Boolean, default: true },
        label: { type: String, default: "Kartavya" },
        labelHindi: { type: String, default: "कर्तव्य" }
      },
      bhajan: {
        visible: { type: Boolean, default: true },
        label: { type: String, default: "Bhajan" },
        labelHindi: { type: String, default: "भजन" }
      },
      games: {
        visible: { type: Boolean, default: true },
        label: { type: String, default: "Games" },
        labelHindi: { type: String, default: "खेल" }
      },
      citySearch: {
        visible: { type: Boolean, default: true },
        label: { type: String, default: "City Search" },
        labelHindi: { type: String, default: "शहर खोज" }
      },
      organizationOfficer: {
        visible: { type: Boolean, default: true },
        label: { type: String, default: "Organization Officer" },
        labelHindi: { type: String, default: "संगठन अधिकारी" }
      },
      education: {
        visible: { type: Boolean, default: true },
        label: { type: String, default: "Education" },
        labelHindi: { type: String, default: "शिक्षा" }
      },
      employment: {
        visible: { type: Boolean, default: true },
        label: { type: String, default: "Employment" },
        labelHindi: { type: String, default: "रोजगार" }
      },
      sports: {
        visible: { type: Boolean, default: true },
        label: { type: String, default: "Sports" },
        labelHindi: { type: String, default: "खेल-कूद" }
      },
      dukan: {
        visible: { type: Boolean, default: true },
        label: { type: String, default: "Dukan" },
        labelHindi: { type: String, default: "दुकान" }
      },
      meetings: {
        visible: { type: Boolean, default: true },
        label: { type: String, default: "Meetings" },
        labelHindi: { type: String, default: "बैठकें" }
      },
      appeal: {
        visible: { type: Boolean, default: true },
        label: { type: String, default: "Appeal" },
        labelHindi: { type: String, default: "अपील" }
      },
      vote: {
        visible: { type: Boolean, default: true },
        label: { type: String, default: "Vote" },
        labelHindi: { type: String, default: "मतदान" }
      },
      familyTree: {
        visible: { type: Boolean, default: true },
        label: { type: String, default: "Family Tree" },
        labelHindi: { type: String, default: "वंश वृक्ष" }
      },
    },
    default: {
      occasions: { visible: true, label: "Occasions", labelHindi: "अवसर" },
      kartavya: { visible: true, label: "Kartavya", labelHindi: "कर्तव्य" },
      bhajan: { visible: true, label: "Bhajan", labelHindi: "भजन" },
      games: { visible: true, label: "Games", labelHindi: "खेल" },
      citySearch: { visible: true, label: "City Search", labelHindi: "शहर खोज" },
      organizationOfficer: { visible: true, label: "Organization Officer", labelHindi: "संगठन अधिकारी" },
      education: { visible: true, label: "Education", labelHindi: "शिक्षा" },
      employment: { visible: true, label: "Employment", labelHindi: "रोजगार" },
      sports: { visible: true, label: "Sports", labelHindi: "खेल-कूद" },
      dukan: { visible: true, label: "Dukan", labelHindi: "दुकान" },
      meetings: { visible: true, label: "Meetings", labelHindi: "बैठकें" },
      appeal: { visible: true, label: "Appeal", labelHindi: "अपील" },
      vote: { visible: true, label: "Vote", labelHindi: "मतदान" },
      family: { visible: true, label: "Family Tree", labelHindi: "वंश वृक्ष" },
    }
  },
  // gotra with embedded subgotra configuration
  gotra: {
    type: mongoose.Schema.Types.Mixed,
    default: []
  },
}, { timestamps: true });


const communitySchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  description: String,
  code: {
    type: String,
    unique: true,
  },
  // Reference to associated configuration
  communityConfiguration: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "CommunityConfiguration",
  },

  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
  createdAt: { type: Date, default: Date.now },
});


communitySchema.pre("save", function (next) {
  try {
    // 1. Generate code if not set
    if (!this.code) {
      // Take first 2-3 letters from community name
      let namePrefix = this.name.replace(/[^a-zA-Z]/g, '').slice(0, 2).toUpperCase();

      // If less than 2 letters, pad with additional letters or fallback
      if (namePrefix.length < 2) {
        const allLetters = this.name.replace(/[^a-zA-Z]/g, '').toUpperCase();
        if (allLetters.length >= 2) {
          namePrefix = allLetters.slice(0, 2);
        } else if (allLetters.length === 1) {
          namePrefix = allLetters + 'C';
        } else {
          namePrefix = 'CM';
        }
      }

      // Generate alphanumeric characters
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      const specialChars = '!@#$%&*';

      // Generate 5-6 random alphanumeric characters
      let randomPart = '';
      for (let i = 0; i < 6; i++) {
        randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
      }

      // Add 1-2 special characters
      let specialPart = '';
      for (let i = 0; i < 2; i++) {
        specialPart += specialChars.charAt(Math.floor(Math.random() * specialChars.length));
      }

      // Add timestamp-based component (2 chars)
      const timestamp = Date.now().toString(36).slice(-2).toUpperCase();

      // Combine all parts and shuffle to make it more complex
      // Format: namePrefix(2) + randomPart(6) + specialPart(2) + timestamp(2) = 12 chars
      const codeParts = (namePrefix + randomPart + specialPart + timestamp).split('');

      // Shuffle the middle section to make it unpredictable
      for (let i = 2; i < codeParts.length - 2; i++) {
        const j = 2 + Math.floor(Math.random() * (codeParts.length - 4));
        [codeParts[i], codeParts[j]] = [codeParts[j], codeParts[i]];
      }

      this.code = codeParts.join('');
    }

    next();
  } catch (err) {
    next(err);
  }
});

communitySchema.index({ code: 1 });
communitySchema.index({ name: 1 });
communitySchema.index({ createdAt: -1 });

const CommunityConfiguration = mongoose.model("CommunityConfiguration", communityConfigurationSchema);
const Community = mongoose.model("Community", communitySchema);

module.exports = {
  Community,
  CommunityConfiguration,
};