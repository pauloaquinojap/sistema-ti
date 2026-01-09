import { Router } from "express";
import * as fornecedorController from "../controllers/fornecedorController";
import multer from "multer";
import path from "path";

const router: Router = Router();

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

// --- 2. ROTAS DE LISTAGEM ---
router.get("/listar", fornecedorController.listarFornecedoresAtivos);
router.get("/ativos", fornecedorController.listarFornecedoresAtivos);
router.get("/inativos", fornecedorController.listarFornecedoresInativos);

// --- 3. ROTAS DINÂMICAS ---
router.get("/:id", fornecedorController.buscarDetalhesFornecedor);
router.delete("/:id", fornecedorController.excluirFornecedor);
router.put(
  "/:id",
  upload.single("arquivo"),
  fornecedorController.atualizarFornecedor
);

export default router;
