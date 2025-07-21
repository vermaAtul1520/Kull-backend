const { signupUser } = require("../controllers/authController");

const router = require("express").Router();

router.post("/signup", signupUser);

module.exports = router;