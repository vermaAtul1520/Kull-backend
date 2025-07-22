const jwt = require("jsonwebtoken");

const generateToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      email: user.email || null,
      phone: user.phone || null,
      community: user.community || null,
      role: user.role,
      roleInCommunity: user.roleInCommunity,
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
  );
};

module.exports = generateToken;
