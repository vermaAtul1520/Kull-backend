const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid");


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

const CommunityConfiguration = mongoose.model("CommunityConfiguration", communityConfigurationSchema);
const Community = mongoose.model("Community", communitySchema);

module.exports = {
  Community,
  CommunityConfiguration,
};