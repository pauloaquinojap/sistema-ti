import { Router } from "express";
import * as estacoesController from "../controllers/estacoesController";

const router: Router = Router();

// Listar todos os itens (Bases e Equipamentos)
router.get("/", estacoesController.listarBases);

// Adicionar um novo item ao mapa (Drag & Drop)
router.post("/adicionar", estacoesController.adicionarItem);

// Atualizar posição (Drag manual no mapa)
router.post("/update-posicao", estacoesController.salvarPosicao);

// Vincular a equipamento do inventário
router.post("/vincular", estacoesController.vincularEquipamento);

// Remover um item (Clique direito)
router.delete("/excluir/:id", estacoesController.excluirItem);

// --- ROTAS PARA CABOS ---

// Salvar uma nova conexão de cabo
router.post("/conectar", estacoesController.salvarConexao);

// Listar todas as conexões (para persistência ao atualizar a página)
router.get("/conexoes", estacoesController.listarConexoes);

export default router;
