import {Router} from "express";
import {upload} from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import {
    uploadVideo,
    getVideoById,
    getAllVideos,
    getMyVideos,
    updateVideo,
    deleteVideo,
    toggleVideoPublishStatus
} from "../controllers/video.controller.js";

const router = Router();

router.route("/").get(getAllVideos);

router.route("/me").get(verifyJWT, getMyVideos);

router.route("/:videoId").get(getVideoById);

router.use(verifyJWT);

router.route("/upload").post(
    upload.fields([
        {
            name: "videoFile",
            maxCount: 1
        },
        {
            name: "thumbnail",
            maxCount: 1
        }
    ]), uploadVideo);

router.route("/:videoId").patch(upload.single("thumbnail"), updateVideo);
router.route("/:videoId").delete(deleteVideo);
router.route("/publish/:videoId").patch(toggleVideoPublishStatus);

export default router;