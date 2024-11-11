import { Router } from "express";
import getLeaderboard from "./get";

const router = Router();

router.use(getLeaderboard);

export default router;
