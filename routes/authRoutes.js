const { signupUser, loginUser } = require("../controllers/authController");

const router = require("express").Router();

router.post("/signup", signupUser);
router.post("/login", loginUser);

module.exports = router;