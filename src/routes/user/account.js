const express = require('express');
const router = express.Router();
const upload = require("../../middlewares/upload");
const account = require("../../controllers/user/account.controller");

router.get("/info", account.info);
router.put("/updateInfo", account.update_info);
router.post("/upload", upload.single('profilePic'), account.upload_profile_pic);
router.put("/changePassword", account.change_password);
router.get("/favorites", account.favorites);
router.get("/likes", account.likes);
router.delete("/deleteAccount", account.deleteAccount);

module.exports = router;