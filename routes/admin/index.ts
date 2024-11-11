import { Router } from "express";
import statusRouter from "./status";
import addRouter from "./add";
import deleteRouter from "./delete";
import listRouter from "./list";

const router = Router();

router.use(statusRouter);
router.use(addRouter);
router.use(deleteRouter);
router.use(listRouter);

export default router;
