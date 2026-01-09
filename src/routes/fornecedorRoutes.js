const express = require("express");
const router = express.Router();
const fornecedorController = require("../controllers/fornecedorcontroller");
const multer = require("multer");
const path = require("path");

// Configuração do Multer (Uploads)
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads-fornecedor/");
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});
const upload = multer({ storage: storage });

// --- 1. ROTA DE CADASTRO (POST) ---
router.post(
  "/cadastro",
  upload.single("arquivo"),
  fornecedorController.cadastrarFornecedor
);

// --- 2. ROTAS DE LISTAGEM (ESTÁTICAS) ---
// ⚠️ IMPORTANTE: Estas rotas DEVEM vir ANTES da rota /:id
// Se o controller não tiver "listarFornecedores", usamos "listarFornecedoresAtivos"
router.get("/listar", fornecedorController.listarFornecedoresAtivos);
router.get("/ativos", fornecedorController.listarFornecedoresAtivos);
router.get("/inativos", fornecedorController.listarFornecedoresInativos);

// --- 3. ROTAS DINÂMICAS (COM PARÂMETROS - SEMPRE POR ÚLTIMO) ---
// O Express vai tentar encaixar qualquer coisa aqui. Se "/listar" estivesse abaixo,
// ele cairia aqui e daria o erro de integer.
router.get("/:id", fornecedorController.buscarDetalhesFornecedor);

// Rota DELETE
router.delete("/:id", fornecedorController.excluirFornecedor);

// Rota PUT
router.put(
  "/:id",
  upload.single("arquivo"),
  fornecedorController.atualizarFornecedor
);

module.exports = router;
