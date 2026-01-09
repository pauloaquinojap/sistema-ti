import { Request, Response } from "express";
import pool from "../config/db";

export const getOpcoesFiltros = async (req: Request, res: Response) => {
  try {
    const tipos = await pool.query(
      "SELECT DISTINCT tipo_equipamento FROM equipamentos WHERE tipo_equipamento IS NOT NULL ORDER BY tipo_equipamento"
    );
    const lojas = await pool.query(
      "SELECT DISTINCT loja_atual FROM equipamentos WHERE loja_atual IS NOT NULL ORDER BY loja_atual"
    );
    const fornecedores = await pool.query(
      "SELECT DISTINCT empresa_responsavel FROM equipamentos WHERE empresa_responsavel IS NOT NULL ORDER BY empresa_responsavel"
    );

    res.json({
      tipos: tipos.rows.map((r) => r.tipo_equipamento),
      lojas: lojas.rows.map((r) => r.loja_atual),
      fornecedores: fornecedores.rows.map((r) => r.empresa_responsavel),
    });
  } catch (error) {
    console.error("Erro ao buscar opções:", error);
    res.status(500).json({ error: "Erro ao buscar filtros" });
  }
};

export const gerarRelatorioInventario = async (req: Request, res: Response) => {
  try {
    const { tipos, lojas, fornecedores, aquisicao } = req.body;

    let query = "SELECT * FROM equipamentos WHERE 1=1";
    const params: any[] = [];
    let paramIndex = 1;

    if (tipos && tipos.length > 0) {
      query += ` AND tipo_equipamento = ANY($${paramIndex})`;
      params.push(tipos);
      paramIndex++;
    }

    if (lojas && lojas.length > 0) {
      query += ` AND loja_atual = ANY($${paramIndex})`;
      params.push(lojas);
      paramIndex++;
    }

    if (fornecedores && fornecedores.length > 0) {
      query += ` AND empresa_responsavel = ANY($${paramIndex})`;
      params.push(fornecedores);
      paramIndex++;
    }

    if (aquisicao && aquisicao !== "AMBOS") {
      query += ` AND tipo_aquisicao = $${paramIndex}`;
      params.push(aquisicao);
      paramIndex++;
    }

    query += " ORDER BY tipo_equipamento, loja_atual";

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error("Erro ao gerar relatório filtrado:", error);
    res.status(500).json({ error: "Erro interno" });
  }
};

export const gerarRelatorioManutencao = async (req: Request, res: Response) => {
  try {
    const { subTipo, dataInicio, dataFim, tipos, lojas, fornecedores } =
      req.body;

    let query = "";
    const params: any[] = [];
    let paramIndex = 1;

    if (subTipo === "REALIZADAS") {
      query = `
          SELECT 
            h.data_registro as data_evento,
            h.detalhes,
            h.valor_manutencao,
            e.tipo_equipamento,
            e.modelo,
            e.numero_serie,
            e.patrimonio,
            e.loja_atual,
            e.empresa_responsavel,
            e.usuario_atual
          FROM historico_equipamentos h
          JOIN equipamentos e ON h.equipamento_id = e.id
          WHERE h.tipo_acao = 'MANUTENCAO'
        `;

      if (dataInicio && dataFim) {
        query += ` AND h.data_registro BETWEEN $${paramIndex} AND $${
          paramIndex + 1
        }`;
        params.push(dataInicio, dataFim);
        paramIndex += 2;
      }
    } else {
      query = `
          SELECT 
            e.data_proxima_manutencao as data_evento,
            e.tipo_equipamento,
            e.modelo,
            e.numero_serie,
            e.patrimonio,
            e.loja_atual,
            e.empresa_responsavel,
            e.usuario_atual,
            'Manutenção Agendada' as detalhes
          FROM equipamentos e
          WHERE e.data_proxima_manutencao IS NOT NULL
        `;

      if (dataInicio && dataFim) {
        query += ` AND e.data_proxima_manutencao BETWEEN $${paramIndex} AND $${
          paramIndex + 1
        }`;
        params.push(dataInicio, dataFim);
        paramIndex += 2;
      }
    }

    if (tipos && tipos.length > 0) {
      query += ` AND e.tipo_equipamento = ANY($${paramIndex})`;
      params.push(tipos);
      paramIndex++;
    }
    if (lojas && lojas.length > 0) {
      query += ` AND e.loja_atual = ANY($${paramIndex})`;
      params.push(lojas);
      paramIndex++;
    }
    if (fornecedores && fornecedores.length > 0) {
      query += ` AND e.empresa_responsavel = ANY($${paramIndex})`;
      params.push(fornecedores);
      paramIndex++;
    }

    query += " ORDER BY data_evento DESC";

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error("Erro ao gerar relatório de manutenção:", error);
    res.status(500).json({ error: "Erro interno ao gerar manutenção" });
  }
};
