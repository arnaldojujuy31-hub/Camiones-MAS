import { Router, type IRouter } from "express";
import healthRouter from "./health";
import trucksRouter from "./trucks";
import agotadosRouter from "./agotados";

const router: IRouter = Router();

router.use(healthRouter);
router.use(trucksRouter);
router.use(agotadosRouter);

export default router;
