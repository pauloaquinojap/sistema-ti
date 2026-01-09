const express = require("express");
const router = express.Router();
const contratoController = require("../controllers/contratoController");
const equipamentoController = require("../controllers/equipamentoController"); // Importação necessária para a nova função
const multer = require("multer");
const path = require("path");

// --- CONFIGURAÇÃO DE UPLOAD ---
// Define onde os arquivos (contratos e aditivos) serão salvos
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Certifique-se de que a pasta 'uploads-contrato' existe na raiz do projeto
    cb(null, "uploads-contrato/");
  },
  filename: function (req, file, cb) {
    // Gera nome único: Timestamp + Random + Extensão original
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({ storage: storage });

// --- ROTAS DE CONTRATO ---

// 1. CADASTRAR CONTRATO (POST)
// Recebe dados do formulário + Arquivo inicial
router.post(
  "/cadastro",
  upload.single("arquivo"),
  contratoController.cadastrarContrato
);

// 2. LISTAR CONTRATOS (GET)
// Lista simples para a tabela principal
router.get("/listar", contratoController.listarContratos);

// 3. BUSCAR DETALHES E HISTÓRICO (GET)
// Esta rota agora retorna o contrato, fornecedor E a lista de aditivos
router.get("/detalhes/:id", contratoController.buscarDetalhes);

// 4. CADASTRAR ADITIVO (POST)
// Alterado para aceitar "anexo_aditivo" ou "arquivo" conforme o front-end
// Vou manter "arquivo" para seguir o seu padrão anterior,
// mas certifique-se que no HTML o <input name="arquivo"> seja usado.
router.post(
  "/aditivo",
  upload.single("arquivo"),
  contratoController.cadastrarAditivo
);

// 5. DESCONTINUAR CONTRATO (PUT)
router.put("/descontinuar/:id", contratoController.descontinuarContrato);

// 6. REATIVAR CONTRATO (PUT)
// Altera o status do contrato de volta para 'Ativo'
router.put("/reativar/:id", contratoController.reativarContrato);

// 7. EXCLUIR CONTRATO (DELETE)
// Remove o contrato e seus aditivos do banco
router.delete("/excluir/:id", contratoController.excluirContrato);

// Rota para excluir aditivo
router.delete("/aditivo/:id", contratoController.excluirAditivo);

// --- NOVA ROTA ADICIONADA ---
router.post("/acao-tecnica/:id", equipamentoController.registrarAcaoTecnica);

module.exports = router;
