const express = require('express');
const router = express.Router();
const comments = require("../../controllers/user/comments.controller");

router.get("/liked-comments", comments.liked_comments);
router.post("/:blogId/addComment", comments.add_comment);
router.get("/:commentId/like", comments.like_comment);
router.delete("/:commentId/delete", comments.delete_comment);

module.exports = router;