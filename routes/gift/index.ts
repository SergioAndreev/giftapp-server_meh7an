import { Router } from "express";
import addRouter from "./add";
import listRouter from "./list";
import listTransactionsRouter from "./listTransaction";
import getByIdRouter from "./byId";

const router = Router();

router.use(addRouter);
router.use(listRouter);
router.use(getByIdRouter);
router.use(listTransactionsRouter);

export default router;
