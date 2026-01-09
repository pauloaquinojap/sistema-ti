const pool = require("../config/db");
const fs = require("fs");
const path = require("path");

const contratoController = {
  // --- 1. CADASTRAR NOVO CONTRATO (VERSÃO COM LIMPEZA DE DADOS) ---
  cadastrarContrato: async (req, res) => {
    try {
      const corpo = req.body;

      // Função auxiliar para garantir que o que vai para o banco é número ou NULL
      const limparNumero = (valor) => {
        if (valor === null || valor === undefined || valor === "") return null;
        // Remove pontos de milhar e troca vírgula por ponto (caso venha da máscara)
        const limpo = String(valor).replace(/\./g, "").replace(",", ".");
        const numero = parseFloat(limpo);
        return isNaN(numero) ? null : numero;
      };

      const values = [
        corpo.numero_contrato,
        corpo.tipo_contrato,
        corpo.status || "Ativo",
        limparNumero(corpo.fornecedor_id), // Garante que id é integer
        corpo.data_inicio,
        corpo.data_fim,
        corpo.renovacao_automatica === "Sim" ||
          corpo.renovacao_automatica === "true",
        limparNumero(corpo.prazo_renovacao) || 0,
        limparNumero(corpo.valor_contrato) || 0,
        limparNumero(corpo.valor_mensal) || 0,
        corpo.forma_pagamento,
        limparNumero(corpo.dia_vencimento), // Geralmente o erro está aqui
        corpo.indice_reajuste,
        corpo.descricao,
        corpo.escopo,
        corpo.observacoes,
        corpo.gestor_contrato,
        corpo.departamento,
        req.file ? req.file.filename : null, // anexo_path
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
      res.status(201).json({
        mensagem: "Contrato cadastrado com sucesso!",
        contrato: result.rows[0],
      });
    } catch (error) {
      console.error("Erro no cadastro:", error.message);
      res
        .status(500)
        .json({ mensagem: "Erro ao salvar contrato.", detalhe: error.message });
    }
  },

  // --- 2. LISTAR CONTRATOS ---
  listarContratos: async (req, res) => {
    try {
      const query = `
        SELECT c.*, 
                f.razao_social AS fornecedor_nome, 
                f.razao_social AS empresa_responsavel, -- Mantendo compatibilidade
                f.cnpj
        FROM contratos c
        LEFT JOIN fornecedores f ON c.fornecedor_id = f.id
        ORDER BY c.id DESC; 
      `;
      const result = await pool.query(query);
      res.status(200).json(result.rows);
    } catch (error) {
      console.error("Erro na query de listagem:", error.message);
      res.status(500).json({
        mensagem: "Erro ao listar contratos.",
        detalhe: error.message,
      });
    }
  },

  // --- 3. BUSCAR DETALHES E HISTÓRICO ---
  buscarDetalhes: async (req, res) => {
    const { id } = req.params;
    try {
      // 1. Busca dados do contrato
      const sqlContrato = `
            SELECT c.*, f.razao_social AS fornecedor_nome, f.cnpj 
            FROM contratos c
            LEFT JOIN fornecedores f ON c.fornecedor_id = f.id
            WHERE c.id = $1
        `;
      const resultContrato = await pool.query(sqlContrato, [id]);

      if (resultContrato.rows.length === 0) {
        return res.status(404).json({ mensagem: "Contrato não encontrado." });
      }

      // 2. Busca aditivos DIRETAMENTE da tabela para garantir que venha o ID
      // Isso corrige o erro onde o ID vinha como undefined
      const sqlAditivos = `
            SELECT 
    id, 
    numero_aditivo,
    tipo_aditivo, 
    data_assinatura, 
    descricao_escopo, 
    valor_adicionado,
    nova_data_termino,
    anexo_path as anexo_aditivo
  FROM aditivos 
  WHERE contrato_id = $1 
  ORDER BY data_assinatura DESC
        `;
      const resultAditivos = await pool.query(sqlAditivos, [id]);

      res.status(200).json({
        contrato: resultContrato.rows[0],
        aditivos: resultAditivos.rows,
      });
    } catch (error) {
      console.error("Erro ao buscar detalhes:", error);
      res.status(500).json({ mensagem: "Erro ao buscar detalhes." });
    }
  },

  // --- 4. CADASTRAR ADITIVO ---
  cadastrarAditivo: async (req, res) => {
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
          resumoAuto = `Valor alterado de: R$ ${vMensalAnterior.toFixed(
            2
          )} para: R$ ${novoMensal.toFixed(2)}`;

          await client.query(
            "UPDATE contratos SET valor_contrato = $1, valor_mensal = $2 WHERE id = $3",
            [novoValorFinal, novoMensal, contrato_id]
          );
        } else {
          resumoAuto = `Valor único incluído de R$ ${vAdd.toFixed(2)}`;
          await client.query(
            "UPDATE contratos SET valor_contrato = $1 WHERE id = $2",
            [novoValorFinal, contrato_id]
          );
        }
      }

      if (tipo_aditivo === "prazo") {
        resumoAuto = `Data alterada de: ${new Date(
          data_termino_anterior
        ).toLocaleDateString("pt-BR")} para: ${new Date(
          nova_data_termino
        ).toLocaleDateString("pt-BR")}`;
        await client.query("UPDATE contratos SET data_fim = $1 WHERE id = $2", [
          nova_data_termino,
          contrato_id,
        ]);
      }

      const descricaoFinal =
        resumoAuto + (descricao_escopo ? " | " + descricao_escopo : "");

      const queryAditivo = `
            INSERT INTO aditivos (
                contrato_id, numero_aditivo, tipo_aditivo, data_assinatura,
                recorrencia_valor, valor_anterior, valor_adicionado, novo_valor,
                data_termino_anterior, nova_data_termino, descricao_escopo, anexo_path
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *;
        `;

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
        descricaoFinal,
        anexo_aditivo,
      ]);

      await client.query("COMMIT");
      res.status(201).json({ mensagem: "Aditivo salvo com sucesso!" });
    } catch (error) {
      await client.query("ROLLBACK");
      console.error("Erro no aditivo:", error);
      res.status(500).json({ mensagem: "Erro ao salvar aditivo." });
    } finally {
      client.release();
    }
  },

  // --- 5. DESCONTINUAR CONTRATO ---
  descontinuarContrato: async (req, res) => {
    try {
      const { id } = req.params;
      // Pega data enviada pelo front ou usa a data de hoje
      const { data_descontinuacao } = req.body;
      const dataFinal = data_descontinuacao || new Date();

      const query = `
        UPDATE contratos 
        SET status = 'Descontinuado', data_fim = $1 
        WHERE id = $2
      `;

      await pool.query(query, [dataFinal, id]);

      res.status(200).json({ mensagem: "Contrato descontinuado com sucesso!" });
    } catch (error) {
      console.error("Erro ao descontinuar contrato:", error);
      res.status(500).json({ error: "Erro interno ao descontinuar contrato." });
    }
  },

  // --- 6. EXCLUIR CONTRATO ---
  excluirContrato: async (req, res) => {
    const { id } = req.params;
    try {
      await pool.query("DELETE FROM aditivos WHERE contrato_id = $1", [id]);
      await pool.query("DELETE FROM contratos WHERE id = $1", [id]);
      res.status(200).json({ mensagem: "Contrato excluído com sucesso!" });
    } catch (error) {
      res.status(500).json({
        mensagem: "Erro ao excluir contrato.",
        detalhe: error.message,
      });
    }
  },

  // --- 7. EXCLUIR ADITIVO ---
  excluirAditivo: async (req, res) => {
    const { id } = req.params;

    // Validação de segurança: se o ID for a string "undefined", para aqui
    if (!id || id === "undefined") {
      return res
        .status(400)
        .json({ mensagem: "ID do aditivo inválido ou não fornecido." });
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // 1. Busca os dados do aditivo antes de deletar
      const aditivoRes = await client.query(
        "SELECT * FROM aditivos WHERE id = $1",
        [id]
      );

      if (aditivoRes.rows.length === 0) {
        await client.query("ROLLBACK");
        return res
          .status(404)
          .json({ mensagem: "Aditivo não encontrado no banco." });
      }

      const aditivo = aditivoRes.rows[0];
      const {
        contrato_id,
        tipo_aditivo,
        valor_adicionado,
        recorrencia_valor,
        data_termino_anterior,
      } = aditivo;

      // 2. Reverte as alterações no contrato
      if (tipo_aditivo === "valor") {
        const vAdd = parseFloat(valor_adicionado) || 0;
        if (recorrencia_valor === "mensal") {
          await client.query(
            "UPDATE contratos SET valor_contrato = valor_contrato - $1, valor_mensal = valor_mensal - $1 WHERE id = $2",
            [vAdd, contrato_id]
          );
        } else {
          await client.query(
            "UPDATE contratos SET valor_contrato = valor_contrato - $1 WHERE id = $2",
            [vAdd, contrato_id]
          );
        }
      } else if (tipo_aditivo === "prazo") {
        await client.query("UPDATE contratos SET data_fim = $1 WHERE id = $2", [
          data_termino_anterior,
          contrato_id,
        ]);
      }

      // 3. Deleta o registro
      await client.query("DELETE FROM aditivos WHERE id = $1", [id]);

      await client.query("COMMIT");
      res.status(200).json({ mensagem: "Aditivo excluído com sucesso!" });
    } catch (error) {
      await client.query("ROLLBACK");
      console.error("Erro ao excluir aditivo:", error);
      res.status(500).json({ mensagem: "Erro interno ao excluir aditivo." });
    } finally {
      client.release();
    }
  },

  // --- 8. REATIVAR CONTRATO (NOVA FUNÇÃO) ---
  reativarContrato: async (req, res) => {
    try {
      const { id } = req.params;
      const query = `
        UPDATE contratos 
        SET status = 'Ativo' 
        WHERE id = $1
      `;
      await pool.query(query, [id]);
      res.status(200).json({ mensagem: "Contrato reativado com sucesso!" });
    } catch (error) {
      console.error("Erro ao reativar contrato:", error);
      res.status(500).json({ mensagem: "Erro interno ao reativar contrato." });
    }
  },
}; // FIM DO OBJETO contratoController

module.exports = contratoController;
