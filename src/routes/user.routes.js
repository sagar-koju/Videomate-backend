import {Router} from "express";
import {upload} from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import {
    registerUser, 
    loginUser, 
    logoutUser, 
    refreshAccessToken, 
    changeCurrentPassword, 
    getCurrentUser, 
    getUserChannelProfile, 
    updateCoverImage, 
    updateAvatar, 
    updateAccountDetails, 
    getWatchHistory
} from "../controllers/user.controller.js";

const router = Router();

router.route("/register").post(
    upload.fields([
        {
            name: "avatar",
            maxCount: 1
        },
        {
            name: "coverImage",
            maxCount: 1
        }
    ]),
    registerUser);

router.route("/login").post(loginUser);

router.route("/logout").post(verifyJWT, logoutUser);

router.route("/refresh-token").post(refreshAccessToken);

router.route("/change-password").post(verifyJWT, changeCurrentPassword);

router.route("/current-user").get(verifyJWT, getCurrentUser);

router.route("/watch-history").get(verifyJWT, getWatchHistory);

router.route("/update-account").patch(verifyJWT, updateAccountDetails);

router.route("/update-avatar").patch(verifyJWT, upload.single("avatar"), updateAvatar);

router.route("/update-cover-image").patch(verifyJWT, upload.single("coverImage"), updateCoverImage);

router.route("/channel/:username").get(getUserChannelProfile);

export default router;