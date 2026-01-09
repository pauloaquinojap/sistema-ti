import { Request, Response } from "express";
import pool from "../config/db";

// --- FUNÇÕES DO CONTROLLER ---

// 1. Listar tudo o que deve aparecer no mapa (Bases e Itens)
export const listarBases = async (req: Request, res: Response) => {
  try {
    const query = `
      SELECT 
        b.*, 
        e.modelo, 
        e.patrimonio, 
        e.tipo_equipamento 
      FROM bases_trabalho b
      LEFT JOIN equipamentos e ON b.equipamento_id = e.id
      ORDER BY b.id ASC
    `;
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (error: any) {
    console.error("Erro ao listar bases:", error.message);
    res.status(500).json({ error: error.message });
  }
};

// 2. Adicionar novo item (Base ou Equipamento) vindo do Drag & Drop
export const adicionarItem = async (req: Request, res: Response) => {
  const { tipo_item, icone_classe, x, y, label_mapa, base_pai_id } = req.body;
  try {
    const query = `
      INSERT INTO bases_trabalho 
      (tipo_item, icone_classe, pos_x, pos_y, label_mapa, base_pai_id) 
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id
    `;
    const result = await pool.query(query, [
      tipo_item,
      icone_classe,
      x,
      y,
      label_mapa,
      base_pai_id || null,
    ]);

    res.json({ success: true, id: result.rows[0].id });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// 3. Salvar posição após arrastar no mapa
export const salvarPosicao = async (req: Request, res: Response) => {
  const { id, x, y } = req.body;
  try {
    await pool.query(
      "UPDATE bases_trabalho SET pos_x = $1, pos_y = $2 WHERE id = $3",
      [x, y, id]
    );
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// 4. Vincular um ícone do mapa a um ID real do seu inventário
export const vincularEquipamento = async (req: Request, res: Response) => {
  const { mapa_id, equipamento_id } = req.body;
  try {
    await pool.query(
      "UPDATE bases_trabalho SET equipamento_id = $1 WHERE id = $2",
      [equipamento_id, mapa_id]
    );
    res.json({ success: true, mensagem: "Vínculo realizado!" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// 5. Remover item do mapa
export const excluirItem = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    await pool.query("DELETE FROM bases_trabalho WHERE id = $1", [id]);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// 6. Salvar uma nova conexão de cabo entre dois itens
export const salvarConexao = async (req: Request, res: Response) => {
  const { origem_id, destino_id, tipo_cabo } = req.body;
  try {
    await pool.query(
      "INSERT INTO conexoes_trabalho (origem_id, destino_id, tipo_cabo) VALUES ($1, $2, $3)",
      [origem_id, destino_id, tipo_cabo]
    );
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// 7. Listar todas as conexões para redesenhar ao atualizar a página
export const listarConexoes = async (req: Request, res: Response) => {
  try {
    const result = await pool.query("SELECT * FROM conexoes_trabalho");
    res.json(result.rows);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
