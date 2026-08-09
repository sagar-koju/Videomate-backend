import {Router} from "express";
import {upload} from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import {
    toggleSubscription,
    getSubscribedChannels
} from "../controllers/subscription.controller.js";

const router = Router();

router.post("/:channelId", verifyJWT, toggleSubscription);
router.get("/channels", verifyJWT, getSubscribedChannels);

export default router;