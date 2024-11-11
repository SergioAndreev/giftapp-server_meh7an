import { Router } from "express";
import listGifts from "./listGift";
import getUser from "./get";
import listTransactions from "./listTransaction";

const router = Router();

router.use(listGifts);
router.use(getUser);
router.use(listTransactions);

export default router;
