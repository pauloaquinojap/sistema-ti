const pool = require("../config/db");

// --- 1. FUNÇÃO CADASTRAR FORNECEDOR (POST) ---
const cadastrarFornecedor = async (req, res) => {
  const {
    // 1. Dados Básicos
    tipo_pessoa,
    cnpj,
    razao_social,
    nome_fantasia,
    inscricao_estadual,
    inscricao_municipal,
    cnae,
    observacoes,
    // 2. Detalhes
    data_abertura,
    natureza_juridica,
    logradouro,
    numero,
    complemento,
    bairro,
    cidade,
    estado_uf,
    cep,
    nome_responsavel,
    cargo_responsavel,
    telefone_fixo,
    celular_whatsapp,
    email_principal,
    email_financeiro,
  } = req.body;

  // Lógica de Anexo: Pega o nome do arquivo se ele existir (via Multer)
  const anexo_url = req.file ? req.file.filename : null;

  let client;

  try {
    client = await pool.connect();
    await client.query("BEGIN");

    // LÓGICA DE DUPLICIDADE: Verifica se o CNPJ já existe
    const checkQuery = "SELECT id, ativo FROM fornecedores WHERE cnpj = $1";
    const checkResult = await client.query(checkQuery, [cnpj]);

    let fornecedorId;
    let isReactivation = false;

    if (checkResult.rows.length > 0) {
      const existing = checkResult.rows[0];

      if (existing.ativo) {
        throw new Error("CNPJ_DUPLICADO");
      } else {
        // Reativação e Atualização
        isReactivation = true;
        fornecedorId = existing.id;

        const updatePrincipal = `
          UPDATE fornecedores 
          SET tipo_pessoa = $1, razao_social = $2, nome_fantasia = $3, 
              inscricao_estadual = $4, inscricao_municipal = $5, cnae = $6, 
              observacoes = $7, ativo = TRUE, email = $8, data_descontinuacao = NULL,
              anexo_url = COALESCE($9, anexo_url)
          WHERE id = $10
        `;
        await client.query(updatePrincipal, [
          tipo_pessoa,
          razao_social,
          nome_fantasia,
          inscricao_estadual,
          inscricao_municipal,
          cnae,
          observacoes,
          email_principal,
          anexo_url, // Atualiza se enviado, senão mantém o antigo
          fornecedorId,
        ]);
      }
    } else {
      // Inserção Normal
      const principalQuery = `
        INSERT INTO fornecedores 
        (tipo_pessoa, cnpj, razao_social, nome_fantasia, inscricao_estadual, 
         inscricao_municipal, cnae, observacoes, ativo, email, anexo_url) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, TRUE, $9, $10) 
        RETURNING id`;

      const result = await client.query(principalQuery, [
        tipo_pessoa,
        cnpj,
        razao_social,
        nome_fantasia,
        inscricao_estadual,
        inscricao_municipal,
        cnae,
        observacoes,
        email_principal,
        anexo_url,
      ]);
      fornecedorId = result.rows[0].id;
    }

    // Gerenciar Tabela de DETALHES
    if (isReactivation) {
      const updateDetalhes = `
        UPDATE fornecedor_detalhes SET
          data_abertura = $2, natureza_juridica = $3, logradouro = $4, numero = $5, 
          complemento = $6, bairro = $7, cidade = $8, estado_uf = $9, cep = $10, 
          nome_responsavel = $11, cargo_responsavel = $12, telefone_fixo = $13, 
          celular_whatsapp = $14, email_principal = $15, email_financeiro = $16
        WHERE fornecedor_id = $1`;

      await client.query(updateDetalhes, [
        fornecedorId,
        data_abertura || null,
        natureza_juridica,
        logradouro,
        numero,
        complemento,
        bairro,
        cidade,
        estado_uf,
        cep,
        nome_responsavel,
        cargo_responsavel,
        telefone_fixo,
        celular_whatsapp,
        email_principal,
        email_financeiro,
      ]);
    } else {
      const detalhesQuery = `
        INSERT INTO fornecedor_detalhes (
          fornecedor_id, data_abertura, natureza_juridica, logradouro, numero, complemento,
          bairro, cidade, estado_uf, cep, nome_responsavel, cargo_responsavel,
          telefone_fixo, celular_whatsapp, email_principal, email_financeiro
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`;

      await client.query(detalhesQuery, [
        fornecedorId,
        data_abertura || null,
        natureza_juridica,
        logradouro,
        numero,
        complemento,
        bairro,
        cidade,
        estado_uf,
        cep,
        nome_responsavel,
        cargo_responsavel,
        telefone_fixo,
        celular_whatsapp,
        email_principal,
        email_financeiro,
      ]);
    }

    // Histórico
    const acaoTexto = isReactivation
      ? "Reativação de Fornecedor"
      : "Criação de Fornecedor";
    await client.query(
      "INSERT INTO fornecedor_historico (fornecedor_id, acao, usuario_responsavel, data_acao) VALUES ($1, $2, 'Sistema', NOW())",
      [fornecedorId, acaoTexto]
    );

    await client.query("COMMIT");
    res.status(201).json({
      message: isReactivation
        ? "Fornecedor reativado e atualizado!"
        : "Fornecedor cadastrado com sucesso!",
      id: fornecedorId,
    });
  } catch (error) {
    if (client) await client.query("ROLLBACK");
    if (error.message === "CNPJ_DUPLICADO") {
      return res
        .status(409)
        .json({ message: "Este CNPJ já está cadastrado e ativo." });
    }
    console.error("Erro ao processar fornecedor:", error);
    res
      .status(500)
      .json({ message: "Erro ao cadastrar fornecedor.", error: error.message });
  } finally {
    if (client) client.release();
  }
};

// --- 2. LISTAR FORNECEDORES ATIVOS (GET) ---
const listarFornecedoresAtivos = async (req, res) => {
  try {
    const query = `
      SELECT f.id, f.cnpj, f.razao_social, f.email, f.anexo_url, d.nome_responsavel, d.celular_whatsapp
      FROM fornecedores f
      LEFT JOIN fornecedor_detalhes d ON f.id = d.fornecedor_id
      WHERE f.ativo = TRUE
      ORDER BY f.razao_social ASC
    `;
    const result = await pool.query(query);
    res.status(200).json(result.rows);
  } catch (error) {
    res.status(500).json({ message: "Erro ao listar fornecedores." });
  }
};

// --- 3. BUSCAR DETALHES COMPLETOS ---
const buscarDetalhesFornecedor = async (req, res) => {
  const { id } = req.params;
  try {
    const query = `
      SELECT 
        f.id, f.tipo_pessoa, f.cnpj, f.razao_social, f.nome_fantasia, 
        f.inscricao_estadual, f.inscricao_municipal, f.cnae, f.observacoes, 
        f.ativo, f.email, f.anexo_url,
        d.data_abertura, d.natureza_juridica, d.logradouro, d.numero, 
        d.complemento, d.bairro, d.cidade, d.estado_uf, d.cep, 
        d.nome_responsavel, d.cargo_responsavel, d.telefone_fixo, 
        d.celular_whatsapp, d.email_principal, d.email_financeiro
      FROM fornecedores f
      LEFT JOIN fornecedor_detalhes d ON f.id = d.fornecedor_id
      WHERE f.id = $1
    `;
    const result = await pool.query(query, [id]);
    if (result.rows.length === 0)
      return res.status(404).json({ message: "Não encontrado." });

    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error("Erro no Controller:", error);
    res.status(500).json({ message: "Erro ao buscar detalhes." });
  }
};

// --- 4. DESCONTINUAR FORNECEDOR (DELETE) ---
const excluirFornecedor = async (req, res) => {
  const { id } = req.params;
  const { data_descontinuacao } = req.body;

  try {
    const query = `
        UPDATE fornecedores 
        SET ativo = FALSE, data_descontinuacao = $1 
        WHERE id = $2
    `;
    await pool.query(query, [data_descontinuacao || new Date(), id]);

    await pool.query(
      "INSERT INTO fornecedor_historico (fornecedor_id, acao, usuario_responsavel, data_acao) VALUES ($1, 'Descontinuação', 'Sistema', NOW())",
      [id]
    );

    res.status(200).json({ message: "Fornecedor descontinuado com sucesso." });
  } catch (error) {
    res.status(500).json({ message: "Erro ao descontinuar fornecedor." });
  }
};

// --- 5. ATUALIZAR FORNECEDOR (PUT) ---
const atualizarFornecedor = async (req, res) => {
  const { id } = req.params;
  const dados = req.body;
  let client;

  try {
    client = await pool.connect();
    await client.query("BEGIN");

    // Atualiza a tabela principal
    await client.query(
      `UPDATE fornecedores SET razao_social = $1, nome_fantasia = $2, 
       inscricao_estadual = $3, inscricao_municipal = $4, cnae = $5, observacoes = $6 
       WHERE id = $7`,
      [
        dados.razao_social,
        dados.nome_fantasia,
        dados.inscricao_estadual,
        dados.inscricao_municipal,
        dados.cnae,
        dados.observacoes,
        id,
      ]
    );

    // Atualiza a tabela de detalhes
    await client.query(
      `UPDATE fornecedor_detalhes SET 
        data_abertura = $1, natureza_juridica = $2, logradouro = $3, numero = $4, 
        complemento = $5, bairro = $6, cidade = $7, estado_uf = $8, cep = $9, 
        nome_responsavel = $10, cargo_responsavel = $11, telefone_fixo = $12, 
        celular_whatsapp = $13, email_principal = $14, email_financeiro = $15
       WHERE fornecedor_id = $16`,
      [
        dados.data_abertura,
        dados.natureza_juridica,
        dados.logradouro,
        dados.numero,
        dados.complemento,
        dados.bairro,
        dados.cidade,
        dados.estado_uf,
        dados.cep,
        dados.nome_responsavel,
        dados.cargo_responsavel,
        dados.telefone_fixo,
        dados.celular_whatsapp,
        dados.email_principal,
        dados.email_financeiro,
        id,
      ]
    );

    await client.query("COMMIT");
    res.status(200).json({ message: "Fornecedor atualizado com sucesso!" });
  } catch (error) {
    if (client) await client.query("ROLLBACK");
    console.error(error);
    res.status(500).json({ message: "Erro ao atualizar fornecedor." });
  } finally {
    if (client) client.release();
  }
};

// --- 6. LISTAR FORNECEDORES INATIVOS (GET) ---
const listarFornecedoresInativos = async (req, res) => {
  try {
    const query = `
      SELECT f.id, f.cnpj, f.razao_social, f.email, 
             d.nome_responsavel, d.celular_whatsapp
      FROM fornecedores f
      LEFT JOIN fornecedor_detalhes d ON f.id = d.fornecedor_id
      WHERE f.ativo = FALSE
      ORDER BY f.razao_social ASC
    `;
    const result = await pool.query(query);
    res.status(200).json(result.rows);
  } catch (error) {
    res.status(500).json({ message: "Erro ao listar fornecedores inativos." });
  }
};

module.exports = {
  cadastrarFornecedor,
  listarFornecedoresAtivos,
  buscarDetalhesFornecedor,
  excluirFornecedor,
  atualizarFornecedor,
  listarFornecedoresInativos, // <--- Adicionado aqui
};
