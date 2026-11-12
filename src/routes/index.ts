import { Router } from "express";
import { AuthController } from "../controllers/AuthController";
import { DeviceController } from "../controllers/DeviceController";
import { DashboardController } from "../controllers/DashboardController";
import { auth } from "../middleware/auth";

const router = Router();

router.post("/auth/register", AuthController.register);
router.post("/auth/login", AuthController.login);
router.get("/auth/session", AuthController.session);
router.post("/auth/logout", AuthController.logout);

router.use(auth);
router.get("/devices", DeviceController.list);
router.post("/devices", DeviceController.create);
router.post("/devices/:id/check", DeviceController.runCheck);
router.delete("/devices/:id", DeviceController.remove);
router.get("/dashboard", DashboardController.dashboard);
router.get("/problems", DashboardController.problems);
router.get("/history", DashboardController.history);

export default router;