import {Router} from "express";
import {upload} from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { 
    getCurrentUser, 
    getUserChannelProfile, 
    updateCoverImage, 
    updateAvatar, 
    updateAccountDetails, 
    getWatchHistory
} from "../controllers/user.controller.js";

const router = Router();

router.route("/current-user").get(verifyJWT, getCurrentUser);

router.route("/history").get(verifyJWT, getWatchHistory);

router.route("/update-account").patch(verifyJWT, updateAccountDetails);

router.route("/update-avatar").patch(verifyJWT, upload.single("avatar"), updateAvatar);

router.route("/update-cover-image").patch(verifyJWT, upload.single("coverImage"), updateCoverImage);

router.route("/channel/:username").get(getUserChannelProfile);

export default router;