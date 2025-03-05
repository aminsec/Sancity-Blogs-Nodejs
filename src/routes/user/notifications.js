const express = require('express');
const router = express.Router();
const notifs = require("../../controllers/user/notifications.controller");

router.get("/", notifs.all);
router.post("/", notifs.seen);
router.delete("/:notifId", notifs.delete_notification);

module.exports = router;