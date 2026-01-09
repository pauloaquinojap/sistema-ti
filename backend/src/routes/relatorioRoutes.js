const express = require("express");
const router = express.Router();
const relatorioController = require("../controllers/relatorioController");

// Rota para pegar as opções dos selects
router.get("/opcoes", relatorioController.getOpcoesFiltros);

// Rota POST para enviar os filtros e receber os dados
router.post("/inventario-geral", relatorioController.gerarRelatorioInventario);

// Rota POST para enviar os filtros e receber os dados de manuntenção
router.post("/manutencao", relatorioController.gerarRelatorioManutencao);

module.exports = router;
