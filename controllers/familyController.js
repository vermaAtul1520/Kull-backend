// controllers/familyController.js
// Refactored to use FamilyService and UserService

const { getFamilyService } = require("../services/familyService");
const { getUserService } = require("../services/userService");

const familyService = getFamilyService();
const userService = getUserService();

exports.addFamilyRelationship = async (req, res) => {
  try {
    const { relatedUserId, relationType } = req.body;
    const userId = req.user.id;
    const userGender = req.user.gender;

    if (!relatedUserId || !relationType) {
      return res.status(400).json({ success: false, message: "Related user and relation type are required" });
    }

    if (userId === relatedUserId) {
      return res.status(400).json({ success: false, message: "Cannot add relationship with yourself" });
    }

    // Check availability of users
    const relatedUser = await userService.getUserById(relatedUserId);
    if (!relatedUser) {
      return res.status(404).json({ success: false, message: "Related user not found" });
    }

    // Check if relationship already exists
    const existing = await familyService.getRelationship(userId, relatedUserId);
    if (existing) {
      return res.status(400).json({ success: false, message: "Relationship already exists" });
    }

    // Create Reciprocal Relationship via Service
    const forward = await familyService.addRelationship(userId, relatedUserId, relationType, userGender, userId);

    // Populate for response
    const populated = {
      ...forward,
      relatedUser: {
        _id: relatedUser.id || relatedUser._id,
        firstName: relatedUser.firstName,
        lastName: relatedUser.lastName,
        profileImage: relatedUser.profileImage,
        gender: relatedUser.gender
      }
    };

    res.status(201).json({ success: true, message: "Family relationship added successfully", data: populated });
  } catch (err) {
    res.status(500).json({ success: false, message: "Internal server error", error: err.message });
  }
};

exports.getFamilyTree = async (req, res) => {
  try {
    const userId = req.user.id;
    // const depth = req.query.depth || 3; // depth logic not fully implemented in service yet

    const relationships = await familyService.getRelationshipsForUser(userId);

    // Populate related users
    const relatedUserIds = relationships.map(r => r.relatedUser || r.relatedUserId).filter(id => id);
    const relatedUsers = await userService.getManyByIds(relatedUserIds);
    const userMap = relatedUsers.reduce((acc, u) => ({ ...acc, [u.id || u._id]: u }), {});

    // Group by relation type
    const tree = {};

    relationships.forEach(rel => {
      const rUser = userMap[rel.relatedUser || rel.relatedUserId];
      if (rUser) {
        const type = rel.relationType;
        if (!tree[type]) tree[type] = [];
        tree[type].push({
          _id: rel.id || rel._id,
          id: rel.id || rel._id,
          user: rel.user || rel.userId,
          relatedUser: {
            _id: rUser.id || rUser._id,
            id: rUser.id || rUser._id,
            firstName: rUser.firstName,
            lastName: rUser.lastName,
            profileImage: rUser.profileImage,
            gender: rUser.gender,
            city: rUser.city
          },
          relationType: type,
          createdAt: rel.createdAt
        });
      }
    });

    res.json({ success: true, data: tree });
  } catch (err) {
    res.status(500).json({ success: false, message: "Internal server error", error: err.message });
  }
};

exports.updateFamilyRelationship = async (req, res) => {
  try {
    const { relationshipId } = req.params;
    const { relationType } = req.body;
    const userGender = req.user.gender;

    if (!relationType) {
      return res.status(400).json({ success: false, message: "Relation type is required" });
    }

    // Service handles updating both sides if we use updateRelationshipById
    const updated = await familyService.updateRelationshipById(relationshipId, relationType, userGender);

    if (!updated) {
      return res.status(404).json({ success: false, message: "Relationship not found" });
    }

    res.json({ success: true, message: "Relationship updated successfully", data: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: "Internal server error", error: err.message });
  }
};

exports.removeFamilyRelationship = async (req, res) => {
  try {
    const { relationshipId } = req.params;

    const success = await familyService.deleteRelationshipById(relationshipId);

    if (!success) {
      return res.status(404).json({ success: false, message: "Relationship not found" });
    }

    res.json({ success: true, message: "Relationship removed successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: "Internal server error", error: err.message });
  }
};

exports.searchUsers = async (req, res) => {
  try {
    const { search } = req.query;
    const communityId = req.user.community;

    if (!search) {
      return res.status(400).json({ success: false, message: "Search term is required" });
    }

    const users = await userService.searchUsers(search); // Generalized search

    // Filter by community in memory (if search returns cross-community)
    // and exclude self.
    const filtered = users.filter(u =>
      (u.community === communityId || (u.community && (u.community._id || u.community.id).toString() === communityId.toString())) &&
      (u.id || u._id).toString() !== req.user.id
    );

    const mapped = filtered.map(u => ({
      _id: u.id || u._id,
      firstName: u.firstName,
      lastName: u.lastName,
      profileImage: u.profileImage,
      gender: u.gender,
      city: u.city,
      phoneNumber: u.phoneNumber
    }));

    res.json({ success: true, data: mapped });
  } catch (err) {
    res.status(500).json({ success: false, message: "Internal server error", error: err.message });
  }
};