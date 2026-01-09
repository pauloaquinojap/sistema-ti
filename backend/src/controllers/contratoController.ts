import pool from "../config/db";
import fs from "fs";
import path from "path";
import { Request, Response } from "express";

// Função auxiliar para garantir que o que vai para o banco é número ou NULL
const limparNumero = (valor: any): number | null => {
  if (valor === null || valor === undefined || valor === "") return null;
  const limpo = String(valor).replace(/\./g, "").replace(",", ".");
  const numero = parseFloat(limpo);
  return isNaN(numero) ? null : numero;
};

// --- 1. CADASTRAR NOVO CONTRATO ---
export const cadastrarContrato = async (req: Request, res: Response) => {
  try {
    const corpo = req.body;
    const values = [
      corpo.numero_contrato,
      corpo.tipo_contrato,
      corpo.status || "Ativo",
      limparNumero(corpo.fornecedor_id),
      corpo.data_inicio,
      corpo.data_fim,
      corpo.renovacao_automatica === "Sim" ||
        corpo.renovacao_automatica === "true",
      limparNumero(corpo.prazo_renovacao) || 0,
      limparNumero(corpo.valor_contrato) || 0,
      limparNumero(corpo.valor_mensal) || 0,
      corpo.forma_pagamento,
      limparNumero(corpo.dia_vencimento),
      corpo.indice_reajuste,
      corpo.descricao,
      corpo.escopo,
      corpo.observacoes,
      corpo.gestor_contrato,
      corpo.departamento,
      req.file ? req.file.filename : null,
    ];

    const query = `
        INSERT INTO contratos (
          numero_contrato, tipo_contrato, status, fornecedor_id, 
          data_inicio, data_fim, renovacao_automatica, prazo_renovacao,
          valor_contrato, valor_mensal, forma_pagamento, dia_vencimento, indice_reajuste,
          descricao, escopo, observacoes, gestor_contrato, departamento,
          anexo_path
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
        RETURNING *;
      `;

    const result = await pool.query(query, values);
    res
      .status(201)
      .json({
        mensagem: "Contrato cadastrado com sucesso!",
        contrato: result.rows[0],
      });
  } catch (error: any) {
    console.error("Erro no cadastro:", error.message);
    res
      .status(500)
      .json({ mensagem: "Erro ao salvar contrato.", detalhe: error.message });
  }
};

// --- 2. LISTAR CONTRATOS ---
export const listarContratos = async (req: Request, res: Response) => {
  try {
    const query = `
        SELECT c.*, f.razao_social AS fornecedor_nome, f.cnpj
        FROM contratos c
        LEFT JOIN fornecedores f ON c.fornecedor_id = f.id
        ORDER BY c.id DESC; 
      `;
    const result = await pool.query(query);
    res.status(200).json(result.rows);
  } catch (error: any) {
    res
      .status(500)
      .json({ mensagem: "Erro ao listar contratos.", detalhe: error.message });
  }
};

// --- 3. BUSCAR DETALHES E HISTÓRICO ---
export const buscarDetalhes = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const sqlContrato = `SELECT c.*, f.razao_social AS fornecedor_nome, f.cnpj FROM contratos c LEFT JOIN fornecedores f ON c.fornecedor_id = f.id WHERE c.id = $1`;
    const resultContrato = await pool.query(sqlContrato, [id]);
    if (resultContrato.rows.length === 0)
      return res.status(404).json({ mensagem: "Contrato não encontrado." });

    const sqlAditivos = `SELECT id, numero_aditivo, tipo_aditivo, data_assinatura, descricao_escopo, valor_adicionado, nova_data_termino, anexo_path as anexo_aditivo FROM aditivos WHERE contrato_id = $1 ORDER BY data_assinatura DESC`;
    const resultAditivos = await pool.query(sqlAditivos, [id]);

    res
      .status(200)
      .json({
        contrato: resultContrato.rows[0],
        aditivos: resultAditivos.rows,
      });
  } catch (error: any) {
    res.status(500).json({ mensagem: "Erro ao buscar detalhes." });
  }
};

// --- 4. CADASTRAR ADITIVO ---
export const cadastrarAditivo = async (req: Request, res: Response) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    let {
      contrato_id,
      numero_aditivo,
      tipo_aditivo,
      data_assinatura,
      recorrencia_valor,
      valor_adicionado,
      nova_data_termino,
      descricao_escopo,
    } = req.body;
    const anexo_aditivo = req.file ? req.file.filename : null;

    const contratoRes = await client.query(
      "SELECT * FROM contratos WHERE id = $1",
      [contrato_id]
    );
    const contratoAtual = contratoRes.rows[0];

    let valor_anterior = contratoAtual.valor_contrato;
    let data_termino_anterior = contratoAtual.data_fim;
    let resumoAuto = "";

    if (tipo_aditivo === "valor") {
      const vAdd = parseFloat(valor_adicionado) || 0;
      const novoValorFinal = parseFloat(valor_anterior) + vAdd;
      if (recorrencia_valor === "mensal") {
        const vMensalAnterior = parseFloat(contratoAtual.valor_mensal) || 0;
        const novoMensal = vMensalAnterior + vAdd;
        resumoAuto = `Valor alterado para: R$ ${novoMensal.toFixed(2)}`;
        await client.query(
          "UPDATE contratos SET valor_contrato = $1, valor_mensal = $2 WHERE id = $3",
          [novoValorFinal, novoMensal, contrato_id]
        );
      } else {
        resumoAuto = `Valor único de R$ ${vAdd.toFixed(2)}`;
        await client.query(
          "UPDATE contratos SET valor_contrato = $1 WHERE id = $2",
          [novoValorFinal, contrato_id]
        );
      }
    }

    if (tipo_aditivo === "prazo") {
      resumoAuto = `Data alterada para: ${new Date(
        nova_data_termino
      ).toLocaleDateString("pt-BR")}`;
      await client.query("UPDATE contratos SET data_fim = $1 WHERE id = $2", [
        nova_data_termino,
        contrato_id,
      ]);
    }

    const queryAditivo = `INSERT INTO aditivos (contrato_id, numero_aditivo, tipo_aditivo, data_assinatura, recorrencia_valor, valor_anterior, valor_adicionado, novo_valor, data_termino_anterior, nova_data_termino, descricao_escopo, anexo_path) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`;
    await client.query(queryAditivo, [
      contrato_id,
      numero_aditivo,
      tipo_aditivo,
      data_assinatura,
      recorrencia_valor,
      valor_anterior,
      valor_adicionado || 0,
      parseFloat(valor_anterior) + (parseFloat(valor_adicionado) || 0),
      data_termino_anterior,
      nova_data_termino,
      resumoAuto + " | " + (descricao_escopo || ""),
      anexo_aditivo,
    ]);

    await client.query("COMMIT");
    res.status(201).json({ mensagem: "Aditivo salvo com sucesso!" });
  } catch (error) {
    await client.query("ROLLBACK");
    res.status(500).json({ mensagem: "Erro ao salvar aditivo." });
  } finally {
    client.release();
  }
};

// --- 5. DESCONTINUAR CONTRATO ---
export const descontinuarContrato = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { data_descontinuacao } = req.body;
    await pool.query(
      `UPDATE contratos SET status = 'Descontinuado', data_fim = $1 WHERE id = $2`,
      [data_descontinuacao || new Date(), id]
    );
    res.status(200).json({ mensagem: "Contrato descontinuado!" });
  } catch (error) {
    res.status(500).json({ error: "Erro ao descontinuar." });
  }
};

// --- 6. EXCLUIR CONTRATO ---
export const excluirContrato = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    await pool.query("DELETE FROM aditivos WHERE contrato_id = $1", [id]);
    await pool.query("DELETE FROM contratos WHERE id = $1", [id]);
    res.status(200).json({ mensagem: "Contrato excluído!" });
  } catch (error: any) {
    res
      .status(500)
      .json({ mensagem: "Erro ao excluir.", detalhe: error.message });
  }
};

// --- 7. EXCLUIR ADITIVO ---
export const excluirAditivo = async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!id || id === "undefined")
    return res.status(400).json({ mensagem: "ID inválido." });
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const aditivoRes = await client.query(
      "SELECT * FROM aditivos WHERE id = $1",
      [id]
    );
    if (aditivoRes.rows.length === 0) throw new Error("Não encontrado.");
    const {
      contrato_id,
      tipo_aditivo,
      valor_adicionado,
      recorrencia_valor,
      data_termino_anterior,
    } = aditivoRes.rows[0];

    if (tipo_aditivo === "valor") {
      const vAdd = parseFloat(valor_adicionado) || 0;
      const sql =
        recorrencia_valor === "mensal"
          ? "UPDATE contratos SET valor_contrato = valor_contrato - $1, valor_mensal = valor_mensal - $1 WHERE id = $2"
          : "UPDATE contratos SET valor_contrato = valor_contrato - $1 WHERE id = $2";
      await client.query(sql, [vAdd, contrato_id]);
    } else if (tipo_aditivo === "prazo") {
      await client.query("UPDATE contratos SET data_fim = $1 WHERE id = $2", [
        data_termino_anterior,
        contrato_id,
      ]);
    }

    await client.query("DELETE FROM aditivos WHERE id = $1", [id]);
    await client.query("COMMIT");
    res.status(200).json({ mensagem: "Aditivo excluído!" });
  } catch (error) {
    await client.query("ROLLBACK");
    res.status(500).json({ mensagem: "Erro ao excluir aditivo." });
  } finally {
    client.release();
  }
};

// --- 8. REATIVAR CONTRATO ---
export const reativarContrato = async (req: Request, res: Response) => {
  try {
    await pool.query(`UPDATE contratos SET status = 'Ativo' WHERE id = $1`, [
      req.params.id,
    ]);
    res.status(200).json({ mensagem: "Contrato reativado!" });
  } catch (error) {
    res.status(500).json({ mensagem: "Erro ao reativar." });
  }
};
