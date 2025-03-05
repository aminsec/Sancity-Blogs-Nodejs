const express = require('express');
const router = express.Router();
const blogs = require("../../controllers/user/blogs.controller");

router.get("/", blogs.all);
router.post("/new", blogs.new_blog);
router.get("/:blogId/save",blogs.save);
router.get("/:blogId/like", blogs.like);
router.put("/:blogId/update", blogs.update_blog);
router.post("/:blogId/magicLink", blogs.make_magic_link);
router.delete("/:blogId", blogs.delete_blog);
router.get("/:blogId", blogs.get_blog);

module.exports = router;