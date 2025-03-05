const express = require('express');
const router = express.Router();
const auth = require("../../controllers/auth/auth.controller");

router.post("/login", auth.login);
router.post("/signup", auth.signup);
router.get("/logout", auth.logout);
router.get("/check-auth", auth.check);

module.exports = router;