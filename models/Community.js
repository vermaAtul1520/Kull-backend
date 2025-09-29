const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid");
const { OccasionCategory } = require("./Occasion");
const { defaultOccasionCategories } = require("../utils/constants");


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
      }
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
      vote: { visible: true, label: "Vote", labelHindi: "मतदान" }
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


communitySchema.pre("save", async function (next) {
  try {
    // 1. Generate code if not set
    if (!this.code) {
      // Take first 5 letters from community name
      let namePrefix = this.name.replace(/[^a-zA-Z]/g, '').slice(0, 5).toUpperCase();

      // If less than 5 letters, pad with additional letters or fallback
      if (namePrefix.length < 5) {
        // Try to get more letters from the name
        const allLetters = this.name.replace(/[^a-zA-Z]/g, '').toUpperCase();

        if (allLetters.length >= 5) {
          namePrefix = allLetters.slice(0, 5);
        } else {
          // Pad with repeated letters or use COMMU as fallback
          while (namePrefix.length < 5 && allLetters.length > 0) {
            namePrefix += allLetters.charAt(namePrefix.length % allLetters.length);
          }

          // Final fallback if still less than 5
          if (namePrefix.length < 5) {
            namePrefix = (namePrefix + 'COMMU').slice(0, 5);
          }
        }
      }

      let attempts = 1;
      let generatedCode;

      // Try to generate a unique code starting from 01, 02, 03...
      do {
        const suffix = attempts.toString().padStart(2, '0'); // 01, 02, 03, etc.
        generatedCode = `${namePrefix}${suffix}`;

        // Check if this code already exists
        const existingCommunity = await mongoose.model('Community').findOne({ code: generatedCode });
        if (!existingCommunity) {
          this.code = generatedCode;
          break;
        }

        attempts++;
      } while (attempts <= 99); // Max 99 attempts (01-99)

      // Fallback: if still no unique code found after 99 attempts
      if (!this.code) {
        const timestamp = Date.now().toString().slice(-2);
        this.code = `${namePrefix}${timestamp}`;
      }
    }

    // 2. Create default occasion categories
    const categoriesToInsert = [];
    for (const name of defaultOccasionCategories) {
      const exists = await OccasionCategory.findOne({ name, community: this._id });
      if (!exists) {
        categoriesToInsert.push({
          name,
          description: `Default description of category: ${name}`,
          community: this._id,
        });
      }
    }

    if (categoriesToInsert.length > 0) {
      await OccasionCategory.insertMany(categoriesToInsert);
    }

    next();
  } catch (err) {
    next(err);
  }
});

const CommunityConfiguration = mongoose.model("CommunityConfiguration", communityConfigurationSchema);
const Community = mongoose.model("Community", communitySchema);

module.exports = {
  Community,
  CommunityConfiguration,
};