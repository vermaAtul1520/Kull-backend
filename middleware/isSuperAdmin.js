
const isSuperAdmin = (req, res, next) => {
  const { role, roleInCommunity} = req.user || {};

  if (role === "superadmin") {
    return next();
  }

  return res.status(403).json({
    success: false,
    message: "Access denied: Only superAdmin allowed",
  });
};

module.exports = isSuperAdmin;
