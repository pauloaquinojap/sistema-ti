import { Router } from "express";
import * as internetController from "../controllers/internetController";

const router: Router = Router();

router.post("/cadastro", internetController.cadastrarInternet);
router.get("/ativos", internetController.listarInternetAtiva);
router.get("/historico/:id", internetController.buscarHistorico);

export default router;
