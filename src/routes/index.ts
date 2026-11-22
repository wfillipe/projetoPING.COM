import { Router } from "express";
import { AuthController } from "../controllers/AuthController";
import { DeviceController } from "../controllers/DeviceController";
import { DashboardController } from "../controllers/DashboardController";
import { auth } from "../middleware/auth";
import { asyncHandler } from "../utils/errors";

const router = Router();

router.post("/auth/register", asyncHandler(AuthController.register));
router.post("/auth/login", asyncHandler(AuthController.login));
router.use(auth);
router.get("/auth/session", asyncHandler(AuthController.session));
router.post("/auth/logout", asyncHandler(AuthController.logout));
router.get("/devices", asyncHandler(DeviceController.list));
router.post("/devices", asyncHandler(DeviceController.create));
router.get("/devices/:id", asyncHandler(DeviceController.get));
router.put("/devices/:id", asyncHandler(DeviceController.update));
router.post("/devices/:id/check", asyncHandler(DeviceController.runCheck));
router.delete("/devices/:id", asyncHandler(DeviceController.remove));
router.get("/dashboard", asyncHandler(DashboardController.dashboard));
router.get("/problems", asyncHandler(DashboardController.problems));
router.get("/history", asyncHandler(DashboardController.history));

export default router;
