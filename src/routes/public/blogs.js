const express = require('express');
const router = express.Router();
const blogs = require("../../controllers/public/blogs.controller");

router.get("/", blogs.all);
router.get("/search", blogs.search);
router.post("/magicLink", blogs.magic_link);
router.get("/:blogId", blogs.get_blog);
router.get("/:blogId/comments", blogs.get_blog_comments);
router.get("/:blogId/comments/:commentId", blogs.get_blog_comment);

module.exports = router;