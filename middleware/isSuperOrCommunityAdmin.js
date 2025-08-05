const isSuperOrCommunityAdmin = (req, res, next) => {
  const { role, roleInCommunity} = req.user || {};

  if (role === "superadmin" || roleInCommunity === "admin") {
    return next();
  }

  return res.status(403).json({
    success: false,
    message: "Access denied: Only superAdmin or communityAdmin allowed",
  });
};

module.exports = isSuperOrCommunityAdmin;
