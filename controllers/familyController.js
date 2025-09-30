const FamilyRelationship = require('../models/FamilyRelationship');
const User = require('../models/User');

// Helper function to get reverse relationship type
const getReverseRelationType = (relationType, userGender) => {
  const reverseMap = {
    'father': userGender === 'female' ? 'daughter' : 'son',
    'mother': userGender === 'female' ? 'daughter' : 'son',
    'son': userGender === 'female' ? 'mother' : 'father',
    'daughter': userGender === 'female' ? 'mother' : 'father',
    'husband': 'wife',
    'wife': 'husband',
    'spouse': 'spouse',
    'brother': userGender === 'female' ? 'sister' : 'brother',
    'sister': userGender === 'female' ? 'sister' : 'brother',
    'grandfather': userGender === 'female' ? 'granddaughter' : 'grandson',
    'grandmother': userGender === 'female' ? 'granddaughter' : 'grandson',
    'grandson': userGender === 'female' ? 'grandmother' : 'grandfather',
    'granddaughter': userGender === 'female' ? 'grandmother' : 'grandfather',
    'uncle': userGender === 'female' ? 'niece' : 'nephew',
    'aunt': userGender === 'female' ? 'niece' : 'nephew',
    'nephew': userGender === 'female' ? 'aunt' : 'uncle',
    'niece': userGender === 'female' ? 'aunt' : 'uncle',
    'cousin': 'cousin',
    'father-in-law': userGender === 'female' ? 'daughter-in-law' : 'son-in-law',
    'mother-in-law': userGender === 'female' ? 'daughter-in-law' : 'son-in-law',
    'son-in-law': userGender === 'female' ? 'mother-in-law' : 'father-in-law',
    'daughter-in-law': userGender === 'female' ? 'mother-in-law' : 'father-in-law',
    'brother-in-law': userGender === 'female' ? 'sister-in-law' : 'brother-in-law',
    'sister-in-law': userGender === 'female' ? 'sister-in-law' : 'brother-in-law'
  };

  return reverseMap[relationType] || relationType;
};

// Add family relationship
exports.addFamilyRelationship = async (req, res) => {
  try {
    const userId = req.user._id;
    const { relatedUserId, relationType } = req.body;

    // Validate input
    if (!relatedUserId || !relationType) {
      return res.status(400).json({
        success: false,
        message: 'Related user ID and relationship type are required'
      });
    }

    // Check if trying to add self
    if (userId.toString() === relatedUserId.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Cannot add yourself as a family member'
      });
    }

    // Check if related user exists
    const relatedUser = await User.findById(relatedUserId);
    if (!relatedUser) {
      return res.status(404).json({
        success: false,
        message: 'Related user not found'
      });
    }

    // Get current user details for reverse relationship
    const currentUser = await User.findById(userId);

    // Check if relationship already exists
    const existingRelationship = await FamilyRelationship.findOne({
      user: userId,
      relatedUser: relatedUserId
    });

    if (existingRelationship) {
      return res.status(400).json({
        success: false,
        message: 'Relationship already exists. You can update it instead.'
      });
    }

    // Create forward relationship
    const forwardRelationship = await FamilyRelationship.create({
      user: userId,
      relatedUser: relatedUserId,
      relationType: relationType,
      createdBy: userId
    });

    // Create reverse relationship
    const reverseRelationType = getReverseRelationType(relationType, currentUser.gender);

    await FamilyRelationship.create({
      user: relatedUserId,
      relatedUser: userId,
      relationType: reverseRelationType,
      createdBy: userId
    });

    // Populate and return the created relationship
    const populatedRelationship = await FamilyRelationship.findById(forwardRelationship._id)
      .populate('relatedUser', 'firstName lastName email phone profileImage code gender');

    res.status(201).json({
      success: true,
      message: 'Family relationship added successfully',
      data: populatedRelationship
    });

  } catch (error) {
    console.error('Error adding family relationship:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add family relationship',
      error: error.message
    });
  }
};

// Get user's family tree
exports.getFamilyTree = async (req, res) => {
  try {
    const userId = req.params.userId || req.user._id;

    // Get all relationships for the user
    const relationships = await FamilyRelationship.find({ user: userId })
      .populate('relatedUser', 'firstName lastName email phone profileImage code gender')
      .sort({ createdAt: -1 });

    // Group relationships by type
    const familyTree = {
      parents: [],
      children: [],
      siblings: [],
      spouse: [],
      grandparents: [],
      grandchildren: [],
      extended: []
    };

    relationships.forEach(rel => {
      const member = {
        _id: rel.relatedUser._id,
        firstName: rel.relatedUser.firstName,
        lastName: rel.relatedUser.lastName,
        email: rel.relatedUser.email,
        phone: rel.relatedUser.phone,
        profileImage: rel.relatedUser.profileImage,
        code: rel.relatedUser.code,
        gender: rel.relatedUser.gender,
        relationType: rel.relationType,
        relationshipId: rel._id,
        addedOn: rel.createdAt
      };

      switch (rel.relationType) {
        case 'father':
        case 'mother':
          familyTree.parents.push(member);
          break;
        case 'son':
        case 'daughter':
          familyTree.children.push(member);
          break;
        case 'brother':
        case 'sister':
          familyTree.siblings.push(member);
          break;
        case 'husband':
        case 'wife':
        case 'spouse':
          familyTree.spouse.push(member);
          break;
        case 'grandfather':
        case 'grandmother':
          familyTree.grandparents.push(member);
          break;
        case 'grandson':
        case 'granddaughter':
          familyTree.grandchildren.push(member);
          break;
        default:
          familyTree.extended.push(member);
      }
    });

    res.status(200).json({
      success: true,
      data: familyTree,
      totalMembers: relationships.length
    });

  } catch (error) {
    console.error('Error fetching family tree:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch family tree',
      error: error.message
    });
  }
};

// Update family relationship
exports.updateFamilyRelationship = async (req, res) => {
  try {
    const userId = req.user._id;
    const { relationshipId } = req.params;
    const { relationType } = req.body;

    if (!relationType) {
      return res.status(400).json({
        success: false,
        message: 'Relationship type is required'
      });
    }

    // Find the relationship
    const relationship = await FamilyRelationship.findOne({
      _id: relationshipId,
      user: userId
    });

    if (!relationship) {
      return res.status(404).json({
        success: false,
        message: 'Relationship not found'
      });
    }

    // Get current user details
    const currentUser = await User.findById(userId);

    // Update forward relationship
    relationship.relationType = relationType;
    await relationship.save();

    // Find and update reverse relationship
    const reverseRelationship = await FamilyRelationship.findOne({
      user: relationship.relatedUser,
      relatedUser: userId
    });

    if (reverseRelationship) {
      const reverseRelationType = getReverseRelationType(relationType, currentUser.gender);
      reverseRelationship.relationType = reverseRelationType;
      await reverseRelationship.save();
    }

    // Populate and return updated relationship
    const updatedRelationship = await FamilyRelationship.findById(relationshipId)
      .populate('relatedUser', 'firstName lastName email phone profileImage code gender');

    res.status(200).json({
      success: true,
      message: 'Relationship updated successfully',
      data: updatedRelationship
    });

  } catch (error) {
    console.error('Error updating relationship:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update relationship',
      error: error.message
    });
  }
};

// Remove family relationship
exports.removeFamilyRelationship = async (req, res) => {
  try {
    const userId = req.user._id;
    const { relationshipId } = req.params;

    // Find the relationship
    const relationship = await FamilyRelationship.findOne({
      _id: relationshipId,
      user: userId
    });

    if (!relationship) {
      return res.status(404).json({
        success: false,
        message: 'Relationship not found'
      });
    }

    const relatedUserId = relationship.relatedUser;

    // Delete forward relationship
    await FamilyRelationship.findByIdAndDelete(relationshipId);

    // Delete reverse relationship
    await FamilyRelationship.findOneAndDelete({
      user: relatedUserId,
      relatedUser: userId
    });

    res.status(200).json({
      success: true,
      message: 'Relationship removed successfully'
    });

  } catch (error) {
    console.error('Error removing relationship:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove relationship',
      error: error.message
    });
  }
};

// Search users for adding to family tree
exports.searchUsers = async (req, res) => {
  try {
    const { query } = req.query;

    if (!query || query.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Search query must be at least 2 characters'
      });
    }

    // Get current user's community
    const currentUser = await User.findById(req.user._id).select('community');

    if (!currentUser.community) {
      return res.status(400).json({
        success: false,
        message: 'You must be part of a community to add family members'
      });
    }

    // Search by name, email, phone, or code within same community
    const users = await User.find({
      $or: [
        { firstName: { $regex: query, $options: 'i' } },
        { lastName: { $regex: query, $options: 'i' } },
        { email: { $regex: query, $options: 'i' } },
        { phone: { $regex: query, $options: 'i' } },
        { code: { $regex: query, $options: 'i' } }
      ],
      _id: { $ne: req.user._id }, // Exclude current user
      community: currentUser.community, // Same community only
      communityStatus: 'approved' // Only approved members
    })
    .select('firstName lastName email phone profileImage code gender community')
    .limit(20);

    res.status(200).json({
      success: true,
      data: users,
      count: users.length
    });

  } catch (error) {
    console.error('Error searching users:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to search users',
      error: error.message
    });
  }
};