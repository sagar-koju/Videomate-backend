import {Router} from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { 
    getDashboardStats,
    getUploadedVideos
 } from "../controllers/dashboard.controller.js";

 const router = Router();

router.use(verifyJWT);

router.route("/stats").get(getDashboardStats);
router.route("/videos").get(getUploadedVideos);

export default router;