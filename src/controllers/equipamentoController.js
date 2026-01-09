const pool = require("../config/db");
const fs = require("fs"); // Necessário para manipular arquivos

// --- 1. FUNÇÃO CADASTRAR EQUIPAMENTO (POST) ---
const cadastrarEquipamento = async (req, res) => {
  const {
    tipo_equipamento,
    modelo,
    numero_serie,
    patrimonio,
    valor,
    empresa_responsavel,
    usuario_atual,
    loja_atual,
    tipo_aquisicao,
    observacoes,
    data_cadastro,
    configuracao,
  } = req.body;

  const nomeOriginalAnexo = req.file ? req.file.originalname : null;
  const anexoPath = req.file ? req.file.path : null;

  if (numero_serie) {
    const checkQuery = "SELECT id FROM equipamentos WHERE numero_serie = $1";
    try {
      const checkResult = await pool.query(checkQuery, [numero_serie]);
      if (checkResult.rowCount > 0) {
        if (anexoPath) fs.unlinkSync(anexoPath);
        return res.status(400).json({
          mensagem: "Equipamento com este número de série já existe.",
        });
      }
    } catch (error) {
      console.error("Erro na checagem de série:", error.message);
    }
  }

  const equipamentoQuery = `
        INSERT INTO equipamentos (
            tipo_equipamento, modelo, numero_serie, patrimonio, valor, empresa_responsavel, 
            usuario_atual, loja_atual, tipo_aquisicao, observacoes, data_cadastro, anexo_path, status, configuracao
        ) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'ATIVO', $13) 
        RETURNING id
    `;

  const dataFinal = data_cadastro || new Date().toISOString();

  const values = [
    tipo_equipamento,
    modelo,
    numero_serie,
    patrimonio,
    valor,
    empresa_responsavel,
    usuario_atual,
    loja_atual,
    tipo_aquisicao,
    observacoes,
    dataFinal,
    anexoPath,
    configuracao,
  ];

  try {
    await pool.query("BEGIN");

    const result = await pool.query(equipamentoQuery, values);
    const equipamentoId = result.rows[0].id;

    if (anexoPath) {
      const anexoQuery = `
                INSERT INTO anexos_equipamentos (equipamento_id, nome_arquivo, caminho_arquivo) 
                VALUES ($1, $2, $3)
            `;
      const caminhoParaServir = anexoPath.replace(/\\/g, "/");

      await pool.query(anexoQuery, [
        equipamentoId,
        nomeOriginalAnexo,
        caminhoParaServir,
      ]);
    }

    await pool.query("COMMIT");

    res.status(201).json({
      mensagem: "Equipamento cadastrado com sucesso!",
      equipamento: { id: equipamentoId, patrimonio, numero_serie },
    });
  } catch (error) {
    await pool.query("ROLLBACK");
    console.error(
      "Erro ao cadastrar equipamento (ROLLBACK EXECUTADO):",
      error.message
    );

    if (anexoPath) {
      fs.unlink(anexoPath, (err) => {
        if (err)
          console.error("Falha ao remover arquivo após erro de DB:", err);
      });
    }

    res.status(500).json({
      mensagem: "Erro ao cadastrar equipamento.",
      detalhe: error.message,
    });
  }
};

// --- 2. FUNÇÃO BUSCAR EQUIPAMENTO POR ID (GET) ---
const buscarEquipamentoPorId = async (req, res) => {
  const { id } = req.params;
  try {
    const equipamentoQuery = `
            SELECT id, patrimonio, numero_serie, tipo_equipamento, modelo, usuario_atual, 
                   loja_atual, tipo_aquisicao, valor, empresa_responsavel, observacoes, 
                   status, data_cadastro, anexo_path, configuracao 
            FROM equipamentos 
            WHERE id = $1
        `;
    const equipamentoResult = await pool.query(equipamentoQuery, [id]);

    if (equipamentoResult.rowCount === 0) {
      return res.status(404).json({ mensagem: "Equipamento não encontrado." });
    }
    const equipamento = equipamentoResult.rows[0];

    const anexosQuery = `
            SELECT id, nome_arquivo, caminho_arquivo, data_upload 
            FROM anexos_equipamentos 
            WHERE equipamento_id = $1
            ORDER BY data_upload DESC
        `;
    const anexosResult = await pool.query(anexosQuery, [id]);

    const historicoQuery = `
            SELECT id, data_registro, tipo_acao, detalhes, usuario_responsavel,
                   usuario_novo, loja_nova, usuario_anterior, loja_anterior, motivo_transferencia,
                   valor_manutencao, motivo_manutencao, descricao_detalhada, data_proxima_manutencao
            FROM historico_equipamentos 
            WHERE equipamento_id = $1
            ORDER BY data_registro DESC
        `;
    const historicoResult = await pool.query(historicoQuery, [id]);

    res.status(200).json({
      ...equipamento,
      anexos: anexosResult.rows,
      historico: historicoResult.rows,
    });
  } catch (error) {
    console.error("Erro ao buscar equipamento por ID:", error.message);
    res.status(500).json({
      mensagem: "Erro ao buscar equipamento.",
      detalhe: error.message,
    });
  }
};

// --- 3. FUNÇÃO ADICIONAR ANEXO SECUNDÁRIO (POST) ---
const adicionarAnexoSecundario = async (req, res) => {
  const { id } = req.params;

  if (!req.file) {
    return res.status(400).json({ mensagem: "Nenhum arquivo enviado." });
  }

  const nomeOriginalAnexo = req.file.originalname;
  const anexoPath = req.file.path;

  try {
    const anexoQuery = `
            INSERT INTO anexos_equipamentos (equipamento_id, nome_arquivo, caminho_arquivo) 
            VALUES ($1, $2, $3)
            RETURNING id
        `;
    const caminhoParaServir = anexoPath.replace(/\\/g, "/");

    await pool.query(anexoQuery, [id, nomeOriginalAnexo, caminhoParaServir]);

    res.status(201).json({
      mensagem: `Anexo '${nomeOriginalAnexo}' adicionado com sucesso ao equipamento ${id}.`,
    });
  } catch (error) {
    console.error("Erro ao adicionar anexo secundário:", error.message);

    if (anexoPath) {
      fs.unlink(anexoPath, (err) => {
        if (err)
          console.error("Falha ao remover arquivo após erro de DB:", err);
      });
    }

    res.status(500).json({
      mensagem: "Erro ao salvar o registro do anexo no banco de dados.",
      detalhe: error.message,
    });
  }
};

// --- 4. FUNÇÃO EXCLUIR EQUIPAMENTO PERMANENTEMENTE (DELETE) ---
const excluirEquipamento = async (req, res) => {
  const { id } = req.params;

  try {
    const query =
      "DELETE FROM equipamentos WHERE id = $1 RETURNING id, numero_serie";
    const result = await pool.query(query, [id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ mensagem: "Equipamento não encontrado." });
    }

    res.status(200).json({
      mensagem: `Equipamento ID ${result.rows[0].id} (Nº Série ${
        result.rows[0].numero_serie || "N/A"
      }) excluído permanentemente!`,
      id_excluido: result.rows[0].id,
    });
  } catch (error) {
    console.error("Erro ao excluir equipamento:", error.message);
    res.status(500).json({
      mensagem: "Erro ao excluir equipamento.",
      detalhe: error.message,
    });
  }
};

// --- 5. FUNÇÃO LISTAR EQUIPAMENTOS ATIVOS (GET) ---
const listarEquipamentosAtivos = async (req, res) => {
  try {
    const query =
      "SELECT id, patrimonio, tipo_equipamento, modelo, usuario_atual, loja_atual, tipo_aquisicao, valor, observacoes, status, numero_serie, empresa_responsavel, configuracao FROM equipamentos WHERE status = 'ATIVO' ORDER BY patrimonio ASC";
    const result = await pool.query(query);
    res.status(200).json({ equipamentos: result.rows });
  } catch (error) {
    console.error("Erro ao listar equipamentos:", error.message);
    res.status(500).json({
      mensagem: "Erro ao listar equipamentos.",
      detalhe: error.message,
    });
  }
};

// --- 6. FUNÇÃO ATUALIZAR EQUIPAMENTO (PUT) ---
const atualizarEquipamento = async (req, res) => {
  const { id } = req.params;
  const {
    tipo_equipamento,
    modelo,
    patrimonio,
    numero_serie,
    valor,
    empresa_responsavel,
    tipo_aquisicao,
    data_compra_frontend,
    observacoes,
    configuracao,
  } = req.body;

  const valorNumerico = parseFloat(valor) || 0;

  const dataAquisicao =
    tipo_aquisicao === "COMPRA" && data_compra_frontend
      ? data_compra_frontend
      : null;

  const query = `
      UPDATE equipamentos SET
          tipo_equipamento = $1, 
          modelo = $2, 
          patrimonio = $3, 
          numero_serie = $4, 
          valor = $5, 
          empresa_responsavel = $6, 
          tipo_aquisicao = $7, 
          data_cadastro = $8,  
          observacoes = $9,
          configuracao = $10
      WHERE id = $11
      RETURNING *;
  `;

  const values = [
    tipo_equipamento,
    modelo,
    patrimonio,
    numero_serie,
    valorNumerico,
    empresa_responsavel,
    tipo_aquisicao,
    dataAquisicao,
    observacoes,
    configuracao,
    id,
  ];

  try {
    const result = await pool.query(query, values);

    if (result.rowCount === 0) {
      return res.status(404).json({ mensagem: "Equipamento não encontrado." });
    }

    const historicoQuery = `
        INSERT INTO historico_equipamentos (equipamento_id, tipo_acao, detalhes)
        VALUES ($1, 'ATUALIZACAO_DADOS_GERAIS', 'Dados gerais do equipamento atualizados.');
    `;
    await pool.query(historicoQuery, [id]);

    res.status(200).json({
      mensagem: `Equipamento ID ${id} atualizado com sucesso.`,
      equipamento: result.rows[0],
    });
  } catch (error) {
    console.error("Erro ao atualizar equipamento (PUT):", error.message);
    res.status(500).json({
      mensagem: "Erro ao atualizar equipamento.",
      detalhe: error.message,
    });
  }
};

// --- 7. FUNÇÃO TRANSFERIR EQUIPAMENTO (PATCH) ---
const transferirEquipamento = async (req, res) => {
  const { id } = req.params;
  const { usuario_atual, loja_atual, motivo_transferencia } = req.body;

  if (!usuario_atual && !loja_atual) {
    return res.status(400).json({
      mensagem:
        "Pelo menos 'usuario_atual' ou 'loja_atual' deve ser fornecido.",
    });
  }

  try {
    await pool.query("BEGIN");

    const buscaEquipamento = await pool.query(
      "SELECT usuario_atual, loja_atual FROM equipamentos WHERE id = $1",
      [id]
    );

    if (buscaEquipamento.rowCount === 0) {
      await pool.query("ROLLBACK");
      return res.status(404).json({ mensagem: "Equipamento não encontrado." });
    }

    const dadosAntigos = buscaEquipamento.rows[0];
    const userAntigo = dadosAntigos.usuario_atual || "Não informado";
    const lojaAntiga = dadosAntigos.loja_atual || "Não informada";

    const updateQuery = `
      UPDATE equipamentos SET
        usuario_atual = $1,
        loja_atual = $2
      WHERE id = $3
      RETURNING id, usuario_atual, loja_atual;
    `;
    const result = await pool.query(updateQuery, [
      usuario_atual,
      loja_atual,
      id,
    ]);

    const historicoQuery = `
      INSERT INTO historico_equipamentos 
      (equipamento_id, tipo_acao, detalhes, usuario_novo, loja_nova, usuario_anterior, loja_anterior, motivo_transferencia)
      VALUES ($1, 'TRANSFERENCIA', $2, $3, $4, $5, $6, $7);
    `;

    const detalhesTexto = `Transferido de ${userAntigo} para ${usuario_atual}`;

    const historicoValues = [
      id,
      detalhesTexto,
      usuario_atual,
      loja_atual,
      userAntigo,
      lojaAntiga,
      motivo_transferencia,
    ];

    await pool.query(historicoQuery, historicoValues);
    await pool.query("COMMIT");

    res.status(200).json({
      mensagem: `Transferência registrada com sucesso.`,
      equipamento: result.rows[0],
    });
  } catch (error) {
    await pool.query("ROLLBACK");
    console.error("Erro ao transferir equipamento:", error.message);
    res.status(500).json({
      mensagem: "Erro ao registrar transferência.",
      detalhe: error.message,
    });
  }
};

// --- 8. REGISTRAR AÇÃO TÉCNICA (POST) ---
const registrarAcaoTecnica = async (req, res) => {
  const { id } = req.params;
  const { tipo, novaConfiguracao, descricao, dataProxima, valor, motivo } =
    req.body;

  try {
    await pool.query("BEGIN");

    const buscaAtual = await pool.query(
      "SELECT configuracao FROM equipamentos WHERE id = $1",
      [id]
    );

    if (buscaAtual.rowCount === 0) {
      await pool.query("ROLLBACK");
      return res.status(404).json({ mensagem: "Equipamento não encontrado." });
    }

    const configuracaoAntiga =
      buscaAtual.rows[0].configuracao || "Não registrada";
    let detalhesHistorico = "";
    const valorFinanceiro =
      parseFloat(valor?.toString().replace(",", ".")) || 0;

    if (tipo === "UPGRADE") {
      // Atualiza para a nova configuração
      await pool.query(
        "UPDATE equipamentos SET configuracao = $1 WHERE id = $2",
        [novaConfiguracao, id]
      );
      // Salva apenas com o separador para o frontend tratar
      detalhesHistorico = `${configuracaoAntiga} -> ${novaConfiguracao}`;
    } else if (tipo === "MANUTENCAO") {
      await pool.query(
        "UPDATE equipamentos SET data_proxima_manutencao = $1 WHERE id = $2",
        [dataProxima, id]
      );
      detalhesHistorico = `Manutenção: ${motivo}`;
    }

    const insertHistoricoQuery = `
      INSERT INTO historico_equipamentos 
      (equipamento_id, tipo_acao, detalhes, valor_manutencao, motivo_manutencao, descricao_detalhada, data_proxima_manutencao) 
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `;

    await pool.query(insertHistoricoQuery, [
      id,
      tipo,
      detalhesHistorico,
      valorFinanceiro,
      motivo,
      descricao,
      tipo === "MANUTENCAO" ? dataProxima : null,
    ]);

    await pool.query("COMMIT");
    res.status(200).json({ mensagem: "Ação registrada com sucesso!" });
  } catch (error) {
    await pool.query("ROLLBACK");
    console.error("Erro ao registrar ação técnica:", error.message);
    res.status(500).json({ mensagem: "Erro interno no servidor." });
  }
};

module.exports = {
  cadastrarEquipamento,
  atualizarEquipamento,
  transferirEquipamento,
  listarEquipamentosAtivos,
  buscarEquipamentoPorId,
  excluirEquipamento,
  adicionarAnexoSecundario,
  registrarAcaoTecnica,
};
