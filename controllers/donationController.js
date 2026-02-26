const { getDonationService } = require('../services/donationService');
const { getCommunityService } = require('../services/communityService');
const { getUserService } = require('../services/userService');

const donationService = getDonationService();
const communityService = getCommunityService();
const userService = getUserService();

// Create donation for a specific community
exports.createDonation = async (req, res) => {
  try {
    const { role, community, id: userId } = req.user;
    const { communityId } = req.params;

    // Authorization: Community admin can only create for their community
    const userCommId = community ? (community._id || community.id) : null;
    if (role !== 'superadmin' && String(userCommId) !== communityId) {
      return res.status(403).json({
        success: false,
        statusCode: 403,
        message: "You can only create donations for your own community"
      });
    }

    const savedDonation = await donationService.createDonation(req.body, communityId, userId);

    return res.status(201).json({
      success: true,
      statusCode: 201,
      message: "Donation created successfully",
      data: savedDonation
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Error creating donation",
      error: err.message
    });
  }
};

// Get donations by community ID
exports.getDonationsByCommunity = async (req, res) => {
  try {
    const { role, community } = req.user;
    const { communityId } = req.params;

    // Authorization: Non-superadmin users can only view their community's donations
    const userCommId = community ? (community._id || community.id) : null;
    if (role !== 'superadmin' && String(userCommId) !== communityId) {
      return res.status(403).json({
        success: false,
        statusCode: 403,
        message: "You can only view donations from your own community"
      });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    let donations = [];
    let total = 0;
    const targetCommunityId = communityId === 'all' ? userCommId : communityId;

    if (targetCommunityId) {
      donations = await donationService.getDonationsByCommunity(targetCommunityId, { limit, skip });
      total = await donationService.donationRepo.countByCommunity(targetCommunityId);
    } else {
      donations = [];
      total = 0;
    }

    const userIds = [...new Set(donations.map(d => d.createdBy))].filter(id => id);
    const users = await userService.getManyByIds(userIds);
    const userMap = users.reduce((acc, u) => ({ ...acc, [u.id || u._id]: u }), {});

    const communityIds = [...new Set(donations.map(d => d.communityId || d.community))].filter(id => id);
    const communities = await communityService.getManyCommunitiesByIds ? await communityService.getManyCommunitiesByIds(communityIds) : [];
    const communityMap = communities.reduce((acc, c) => ({ ...acc, [c.id || c._id]: c }), {});

    const populated = donations.map(d => ({
      ...d,
      _id: d.id || d._id,
      createdBy: userMap[d.createdBy] ? {
        _id: userMap[d.createdBy].id || userMap[d.createdBy]._id,
        firstName: userMap[d.createdBy].firstName,
        lastName: userMap[d.createdBy].lastName
      } : d.createdBy,
      communityId: communityMap[d.communityId || d.community] ? {
        _id: communityMap[d.communityId || d.community].id || communityMap[d.communityId || d.community]._id,
        name: communityMap[d.communityId || d.community].name
      } : d.communityId
    }));

    return res.status(200).json({
      success: true,
      statusCode: 200,
      total,
      page,
      limit,
      count: populated.length,
      data: populated
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Error fetching donations",
      error: err.message
    });
  }
};

// Get single donation by ID
exports.getDonationById = async (req, res) => {
  try {
    const { role, community } = req.user;
    const { id } = req.params;

    const donation = await donationService.getDonationById(id);

    if (!donation) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: "Donation not found"
      });
    }

    // Authorization: Non-superadmin users can only view their community's donations
    const donationCommId = String(donation.communityId || donation.community);
    const userCommId = community ? (community._id || community.id) : null;
    if (role !== 'superadmin' && donationCommId !== String(userCommId)) {
      return res.status(403).json({
        success: false,
        statusCode: 403,
        message: "You can only view donations from your own community"
      });
    }

    // Populate
    const user = await userService.getUserById(donation.createdBy);
    const comm = await communityService.getCommunityById(donationCommId);

    const populated = {
      ...donation,
      createdBy: user ? { firstName: user.firstName, lastName: user.lastName } : donation.createdBy,
      communityId: comm ? { name: comm.name } : (donation.communityId || donation.community)
    };

    return res.status(200).json({
      success: true,
      statusCode: 200,
      data: populated
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Error fetching donation",
      error: err.message
    });
  }
};

// Update donation
exports.updateDonation = async (req, res) => {
  try {
    const { role, roleInCommunity, community } = req.user;
    const { id } = req.params;

    const donation = await donationService.getDonationById(id);
    if (!donation) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: "Donation not found"
      });
    }

    // Authorization check
    const isSuperAdmin = role === 'superadmin';
    const userCommId = community ? (community._id || community.id) : null;
    const isCommunityAdminAndOwn = roleInCommunity === 'admin' && String(donation.communityId || donation.community) === String(userCommId);

    if (!(isSuperAdmin || isCommunityAdminAndOwn)) {
      return res.status(403).json({
        success: false,
        statusCode: 403,
        message: "You can only update donations from your own community"
      });
    }

    const updated = await donationService.updateDonation(id, req.body);

    return res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Donation updated successfully",
      data: updated
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Error updating donation",
      error: err.message
    });
  }
};

// Delete donation
exports.deleteDonation = async (req, res) => {
  try {
    const { role, roleInCommunity, community } = req.user;
    const { id } = req.params;

    const donation = await donationService.getDonationById(id);
    if (!donation) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: "Donation not found"
      });
    }

    const isSuperAdmin = role === 'superadmin';
    const userCommId = community ? (community._id || community.id) : null;
    const isCommunityAdminAndOwn = roleInCommunity === 'admin' && String(donation.communityId || donation.community) === String(userCommId);

    if (!(isSuperAdmin || isCommunityAdminAndOwn)) {
      return res.status(403).json({
        success: false,
        statusCode: 403,
        message: "You can only delete donations from your own community"
      });
    }

    await donationService.deleteDonation(id);
    return res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Donation deleted successfully"
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Error deleting donation",
      error: err.message
    });
  }
};
