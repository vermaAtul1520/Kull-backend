const Donation = require('../models/Donation');

// Create donation
exports.createDonation = async (req, res) => {
  try {
    const { role, roleInCommunity, community, id: userId } = req.user;

    if (!(role === 'superadmin' || roleInCommunity === 'admin')) {
      return res.status(403).json({
        message: "Only community admin or superadmin can create donations.",
      });
    }

    const donation = new Donation({
      ...req.body,
      community,
      createdBy: userId,
    });

    const savedDonation = await donation.save();
    res.status(201).json(savedDonation);
  } catch (err) {
    res.status(500).json({ message: "Error creating donation", error: err.message });
  }
};

// Get all donations (superadmin sees all, others see only their community)
exports.getAllDonations = async (req, res) => {
  try {
    const { role, community } = req.user;

    // Build query filter
    const filter = role === 'superadmin' 
      ? {} 
      : { communityId: community };

    const donations = await Donation.find(filter)
      .populate("communityId", "name")       // assuming 'communityId' is the correct field in schema
      .populate("createdBy", "name");        // if createdBy is stored in the document

    return res.status(200).json({
      success: true,
      data: donations
    });

  } catch (err) {
    return res.status(500).json({ 
      success: false,
      message: "Error fetching donations", 
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
      return res.status(404).json({ message: "Donation not found" });
    }

    // Authorization check
    const isSuperAdmin = role === 'superadmin';
    const isCommunityAdminAndOwn = roleInCommunity === 'admin' && donation.community.toString() === community;

    if (!(isSuperAdmin || isCommunityAdminAndOwn)) {
      return res.status(403).json({ message: "Not authorized to update this donation" });
    }

    Object.assign(donation, req.body);
    const updated = await donation.save();

    res.status(200).json(updated);
  } catch (err) {
    res.status(500).json({ message: "Error updating donation", error: err.message });
  }
};

// Delete donation
exports.deleteDonation = async (req, res) => {
  try {
    const { role, roleInCommunity, community } = req.user;
    const { id } = req.params;

    const donation = await Donation.findById(id);
    if (!donation) {
      return res.status(404).json({ message: "Donation not found" });
    }

    const isSuperAdmin = role === 'superadmin';
    const isCommunityAdminAndOwn = roleInCommunity === 'admin' && donation.community.toString() === community;

    if (!(isSuperAdmin || isCommunityAdminAndOwn)) {
      return res.status(403).json({ message: "Not authorized to delete this donation" });
    }

    await donation.deleteOne();
    res.status(200).json({ message: "Donation deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Error deleting donation", error: err.message });
  }
};
