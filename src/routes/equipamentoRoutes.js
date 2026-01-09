const express = require("express");
const router = express.Router();
const equipamentoController = require("../controllers/equipamentoController");
const multer = require("multer");

// --- Configuração do Multer para Upload de Arquivos ---
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const fileExtension = file.originalname.split(".").pop();
    cb(null, `equipamento-${uniqueSuffix}.${fileExtension}`);
  },
});

const upload = multer({ storage: storage });
// --- FIM Configuração Multer ---

// Rotas de Cadastro, Listagem, Detalhes e Exclusão
router.post(
  "/cadastro",
  upload.single("anexo"),
  equipamentoController.cadastrarEquipamento
);
router.get("/ativos", equipamentoController.listarEquipamentosAtivos);
router.get("/:id", equipamentoController.buscarEquipamentoPorId);

// ROTA EXISTENTE: ATUALIZA DADOS GERAIS (PUT)
router.put("/:id", equipamentoController.atualizarEquipamento);

// ROTA NOVA: ATUALIZA DADOS DE LOCALIZAÇÃO (PATCH)
router.patch("/transferir/:id", equipamentoController.transferirEquipamento);

router.delete("/excluir/:id", equipamentoController.excluirEquipamento);

// ROTA NOVA: Adicionar Anexo a um Equipamento Existente
// O nome do campo de arquivo no form-data deve ser 'novo_anexo'
router.post(
  "/anexo/:id",
  upload.single("novo_anexo"),
  equipamentoController.adicionarAnexoSecundario
);

router.post("/acao-tecnica/:id", equipamentoController.registrarAcaoTecnica);

module.exports = router;
