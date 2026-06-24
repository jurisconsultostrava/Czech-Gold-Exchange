import { Router, type IRouter } from "express";
import healthRouter from "./health";
import catalogRouter from "./catalog";
import shopRouter from "./shop";
import adminRouter from "./admin";
import adminIORouter from "./adminIO";

const router: IRouter = Router();

router.use(healthRouter);
router.use(catalogRouter);
router.use(shopRouter);
router.use("/admin", adminRouter);
router.use("/admin", adminIORouter);

export default router;
