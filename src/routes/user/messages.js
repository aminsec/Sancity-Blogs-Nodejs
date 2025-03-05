const express = require('express');
const router = express.Router();
const messages = require("../../controllers/user/messages.controller");

router.get("/:contact", messages.get_messages);

module.exports = router;