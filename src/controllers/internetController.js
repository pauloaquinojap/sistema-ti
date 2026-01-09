const pool = require("../config/db");

// --- 1. FUNÇÃO CADASTRAR LINK DE INTERNET (POST) ---
const cadastrarInternet = async (req, res) => {
  const {
    cnpj_provedor,
    razao_social,
    qtd_mb,
    dedicado,
    valor_mensal,
    ip_monitoramento,
    snmp_community,
  } = req.body;

  const query = `
        INSERT INTO internet (
            cnpj_provedor, razao_social, qtd_mb, 
            dedicado, valor_mensal, ip_monitoramento, 
            snmp_community, status
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, 'ATIVA')
        RETURNING *;
    `;

  const values = [
    cnpj_provedor,
    razao_social,
    qtd_mb,
    dedicado,
    valor_mensal,
    ip_monitoramento,
    snmp_community || "public",
  ];

  try {
    const result = await pool.query(query, values);
    res.status(201).json({
      mensagem: "Link de Internet cadastrado com sucesso!",
      link: result.rows[0],
    });
  } catch (error) {
    console.error("Erro ao cadastrar link de internet:", error.message);
    res.status(500).json({
      mensagem: "Erro ao cadastrar link de internet no banco de dados.",
      detalhe: error.message,
    });
  }
};

// --- 2. FUNÇÃO LISTAR LINKS ATIVOS (GET) ---
const listarInternetAtiva = async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM internet WHERE status = 'ATIVA' ORDER BY razao_social ASC"
    );

    res.status(200).json({
      total: result.rowCount,
      links: result.rows,
    });
  } catch (error) {
    console.error("Erro ao listar internet ativa:", error.message);
    res.status(500).json({
      mensagem: "Erro ao buscar links de internet ativos.",
      detalhe: error.message,
    });
  }
};

// --- 3. FUNÇÃO BUSCAR HISTÓRICO PARA O GRÁFICO (GET) ---
const buscarHistorico = async (req, res) => {
  const { id } = req.params;
  try {
    // Buscamos 21 registros para poder calcular a diferença entre eles e ter 20 pontos de velocidade
    const result = await pool.query(
      `SELECT download_bytes, upload_bytes, data_leitura 
       FROM historico_trafego 
       WHERE internet_id = $1 
       ORDER BY data_leitura DESC LIMIT 21`,
      [id]
    );

    const rows = result.rows.reverse();
    const dadosCalculados = [];

    // Cálculo da velocidade: (Atual - Anterior) * 8 bits / tempo / 1024 / 1024
    for (let i = 1; i < rows.length; i++) {
      const tempoSegundos =
        (new Date(rows[i].data_leitura) - new Date(rows[i - 1].data_leitura)) /
        1000;

      if (tempoSegundos > 0) {
        const downloadMbps = (
          ((rows[i].download_bytes - rows[i - 1].download_bytes) * 8) /
          tempoSegundos /
          (1024 * 1024)
        ).toFixed(2);
        const uploadMbps = (
          ((rows[i].upload_bytes - rows[i - 1].upload_bytes) * 8) /
          tempoSegundos /
          (1024 * 1024)
        ).toFixed(2);

        dadosCalculados.push({
          data_leitura: rows[i].data_leitura,
          download: parseFloat(downloadMbps),
          upload: parseFloat(uploadMbps),
        });
      }
    }

    res.status(200).json(dadosCalculados);
  } catch (error) {
    console.error("Erro ao buscar histórico:", error.message);
    res.status(500).json({ mensagem: "Erro ao buscar dados do gráfico." });
  }
};

module.exports = {
  cadastrarInternet,
  listarInternetAtiva,
  buscarHistorico,
};
