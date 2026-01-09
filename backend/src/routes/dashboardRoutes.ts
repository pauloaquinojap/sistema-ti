import { Router } from "express";
import * as dashboardController from "../controllers/dashboardController";

const router: Router = Router();

// Rota GET: RESUMO FINANCEIRO (Aceita ?mes=X&ano=Y)
router.get("/financeiro", dashboardController.calcularResumoFinanceiro);

// Rota GET: RESUMO DE EQUIPAMENTOS POR TIPO
router.get("/equipamentos", dashboardController.contarEquipamentosPorTipo);

export default router;