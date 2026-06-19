import { Router, type IRouter } from "express";
import healthRouter from "./health";
import analyzeRouter from "./analyze";
import retakeRouter from "./retake";
import followupRouter from "./followup";

const router: IRouter = Router();

router.use(healthRouter);
router.use(analyzeRouter);
router.use(retakeRouter);
router.use(followupRouter);

export default router;
