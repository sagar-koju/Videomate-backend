import Router from "express";
import {verifyJWT} from "../middlewares/auth.middleware.js";
import {
    commentOnVideo,
    editComment,
    deleteComment,
    getVideoComments,
    replyToComment
} from "../controllers/comment.controller.js";

const router = Router();

router.route("/:videoId").get(getVideoComments);

router.use(verifyJWT);

router.route("/:videoId").post(commentOnVideo);
router.route("/:commentId").put(editComment);
router.route("/:commentId").delete(deleteComment);
router.route("/:commentId/reply").post(replyToComment);

export default router;