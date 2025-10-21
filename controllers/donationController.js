const Donation = require('../models/Donation');

// Create donation for a specific community
exports.createDonation = async (req, res) => {
  try {
    const { role, roleInCommunity, community, id: userId } = req.user;
    const { communityId } = req.params;

    // Authorization: Community admin can only create for their community
    if (role !== 'superadmin' && community.toString() !== communityId) {
      return res.status(403).json({
        success: false,
        statusCode: 403,
        message: "You can only create donations for your own community"
      });
    }

    const donation = new Donation({
      ...req.body,
      communityId: communityId,
      createdBy: userId,
    });

    const savedDonation = await donation.save();
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
    const { role, roleInCommunity, community } = req.user;
    const { communityId } = req.params;

    // Authorization: Non-superadmin users can only view their community's donations
    if (role !== 'superadmin' && community.toString() !== communityId) {
      return res.status(403).json({
        success: false,
        statusCode: 403,
        message: "You can only view donations from your own community"
      });
    }

    const donations = await Donation.find({ communityId })
      .populate("communityId", "name")
      .populate("createdBy", "firstName lastName")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      statusCode: 200,
      data: donations
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
    const { role, roleInCommunity, community } = req.user;
    const { id } = req.params;

    const donation = await Donation.findById(id)
      .populate("communityId", "name")
      .populate("createdBy", "firstName lastName");

    if (!donation) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: "Donation not found"
      });
    }

    // Authorization: Non-superadmin users can only view their community's donations
    if (role !== 'superadmin' && donation.communityId._id.toString() !== community.toString()) {
      return res.status(403).json({
        success: false,
        statusCode: 403,
        message: "You can only view donations from your own community"
      });
    }

    return res.status(200).json({
      success: true,
      statusCode: 200,
      data: donation
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
    const { role, roleInCommunity, community, id: userId } = req.user;
    const { id } = req.params;

    const donation = await Donation.findById(id);
    if (!donation) {
      return res.status(404).json({ 
        success: false,
        statusCode: 404,
        message: "Donation not found" 
      });
    }

    // Authorization check
    const isSuperAdmin = role === 'superadmin';
    const isCommunityAdminAndOwn = roleInCommunity === 'admin' && donation.communityId.toString() === community;

    if (!(isSuperAdmin || isCommunityAdminAndOwn)) {
      return res.status(403).json({ 
        success: false,
        statusCode: 403,
        message: "You can only update donations from your own community" 
      });
    }

    Object.assign(donation, req.body);
    const updated = await donation.save();

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

    const donation = await Donation.findById(id);
    if (!donation) {
      return res.status(404).json({ 
        success: false,
        statusCode: 404,
        message: "Donation not found" 
      });
    }

    const isSuperAdmin = role === 'superadmin';
    const isCommunityAdminAndOwn = roleInCommunity === 'admin' && donation.communityId.toString() === community;

    if (!(isSuperAdmin || isCommunityAdminAndOwn)) {
      return res.status(403).json({ 
        success: false,
        statusCode: 403,
        message: "You can only delete donations from your own community" 
      });
    }

    await donation.deleteOne();
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
