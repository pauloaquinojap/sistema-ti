const express = require("express");
const router = express.Router();
const dashboardController = require("../controllers/dashboardController");

// Rota GET: RESUMO FINANCEIRO (Agora aceita ?mes=X&ano=Y)
router.get("/financeiro", dashboardController.calcularResumoFinanceiro);

// Rota GET: RESUMO DE EQUIPAMENTOS POR TIPO
router.get("/equipamentos", dashboardController.contarEquipamentosPorTipo);

module.exports = router;
