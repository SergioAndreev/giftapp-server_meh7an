import { Router } from "express";
import listRouter from "./list";
import getByIdRouter from "./byId";

const router = Router();

router.use(listRouter);
router.use(getByIdRouter);

export default router;
