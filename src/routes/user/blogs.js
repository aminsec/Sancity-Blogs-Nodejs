const express = require('express');
const router = express.Router();
const blogs = require("../../controllers/user/blogs.controller");

router.get("/", blogs.all);
router.post("/new", blogs.new_blog);
router.get("/:blogId", blogs.get_blog);
router.get("/:blogId/save",blogs.save);
router.get("/:blogId/like", blogs.like);
router.delete("/:blogId", blogs.delete_blog);
router.get("/liked-blogs", blogs.liked_blogs);
router.get("/saved-blogs", blogs.saved_blogs);
router.put("/:blogId/update", blogs.update_blog);
router.post("/:blogId/magicLink", blogs.make_magic_link);

module.exports = router;