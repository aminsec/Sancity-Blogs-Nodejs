const express = require('express');
const router = express.Router();
const writer = require("../../controllers/public/writers.controller");

router.get("/:userid", writer.info);
router.get("/:userid/info", writer.id_info);
router.get("/:userid/blogs", writer.blogs);
router.get("/:userid/liked-blogs", writer.liked_blogs);

module.exports = router;