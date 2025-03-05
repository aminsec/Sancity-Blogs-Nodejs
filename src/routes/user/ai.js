const express = require('express');
const router = express.Router();
const ai = require("../../controllers/user/ai.controller");

router.post('/summary', ai.summary);

module.exports = router;