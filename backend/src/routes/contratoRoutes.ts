import express, { Router } from "express";
import * as contratoController from "../controllers/contratoController";
import * as equipamentoController from "../controllers/equipamentoController";
import multer from "multer";
import path from "path";

const router: Router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads-contrato/"),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({ storage });

router.post(
  "/cadastro",
  upload.single("arquivo"),
  contratoController.cadastrarContrato
);
router.get("/listar", contratoController.listarContratos);
router.get("/detalhes/:id", contratoController.buscarDetalhes);
router.post(
  "/aditivo",
  upload.single("arquivo"),
  contratoController.cadastrarAditivo
);
router.put("/descontinuar/:id", contratoController.descontinuarContrato);
router.put("/reativar/:id", contratoController.reativarContrato);
router.delete("/excluir/:id", contratoController.excluirContrato);
router.delete("/aditivo/:id", contratoController.excluirAditivo);

// Rota integrada do outro controller
router.post("/acao-tecnica/:id", equipamentoController.registrarAcaoTecnica);

export default router;
