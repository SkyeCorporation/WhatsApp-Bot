import { Router, type IRouter } from "express";
import healthRouter from "./health";
import esdeathRouter from "./esdeath";

const router: IRouter = Router();

router.use(healthRouter);
router.use(esdeathRouter);

export default router;
