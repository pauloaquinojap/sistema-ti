const express = require("express");
const router = express.Router();
const internetController = require("../controllers/internetController");

router.post("/cadastro", internetController.cadastrarInternet);
router.get("/ativos", internetController.listarInternetAtiva);

// ADICIONE ESTA LINHA:
router.get("/historico/:id", internetController.buscarHistorico);

module.exports = router;
