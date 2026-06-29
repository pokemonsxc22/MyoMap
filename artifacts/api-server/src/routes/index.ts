import { Router, type IRouter } from "express";
import healthRouter from "./health";
import analyzeRouter from "./analyze";
import retakeRouter from "./retake";
import followupRouter from "./followup";
import streaksRouter from "./streaks";
import assessmentsRouter from "./assessments";
import dailyCheckinRouter from "./dailyCheckin";
import progressChatRouter from "./progressChat";
import exerciseInstructionsRouter from "./exerciseInstructions";

const router: IRouter = Router();

router.use(healthRouter);
router.use(analyzeRouter);
router.use(retakeRouter);
router.use(followupRouter);
router.use(streaksRouter);
router.use(assessmentsRouter);
router.use(dailyCheckinRouter);
router.use(progressChatRouter);
router.use(exerciseInstructionsRouter);

export default router;
