import { Router } from "express";
import * as equipamentoController from "../controllers/equipamentoController";
import multer from "multer";

const router: Router = Router();

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

// Rotas de Cadastro, Listagem, Detalhes e Exclusão
router.post(
  "/cadastro",
  upload.single("anexo"),
  equipamentoController.cadastrarEquipamento
);

router.get("/ativos", equipamentoController.listarEquipamentosAtivos);
router.get("/:id", equipamentoController.buscarEquipamentoPorId);

// ATUALIZA DADOS GERAIS (PUT)
router.put("/:id", equipamentoController.atualizarEquipamento);

// ATUALIZA DADOS DE LOCALIZAÇÃO (PATCH)
router.patch("/transferir/:id", equipamentoController.transferirEquipamento);

router.delete("/excluir/:id", equipamentoController.excluirEquipamento);

// Adicionar Anexo a um Equipamento Existente
router.post(
  "/anexo/:id",
  upload.single("novo_anexo"),
  equipamentoController.adicionarAnexoSecundario
);

router.post("/acao-tecnica/:id", equipamentoController.registrarAcaoTecnica);

export default router;
