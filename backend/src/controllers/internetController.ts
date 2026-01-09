import { Request, Response } from "express";
import pool from "../config/db";

// --- 1. FUNÇÃO CADASTRAR LINK DE INTERNET (POST) ---
export const cadastrarInternet = async (req: Request, res: Response) => {
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
  } catch (error: any) {
    console.error("Erro ao cadastrar link de internet:", error.message);
    res.status(500).json({
      mensagem: "Erro ao cadastrar link de internet no banco de dados.",
      detalhe: error.message,
    });
  }
};

// --- 2. FUNÇÃO LISTAR LINKS ATIVOS (GET) ---
export const listarInternetAtiva = async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      "SELECT * FROM internet WHERE status = 'ATIVA' ORDER BY razao_social ASC"
    );

    res.status(200).json({
      total: result.rowCount,
      links: result.rows,
    });
  } catch (error: any) {
    console.error("Erro ao listar internet ativa:", error.message);
    res.status(500).json({
      mensagem: "Erro ao buscar links de internet ativos.",
      detalhe: error.message,
    });
  }
};

// --- 3. FUNÇÃO BUSCAR HISTÓRICO PARA O GRÁFICO (GET) ---
export const buscarHistorico = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      `SELECT download_bytes, upload_bytes, data_leitura 
       FROM historico_trafego 
       WHERE internet_id = $1 
       ORDER BY data_leitura DESC LIMIT 21`,
      [id]
    );

    const rows = result.rows.reverse();
    const dadosCalculados: any[] = [];

    for (let i = 1; i < rows.length; i++) {
      const dataAtual = new Date(rows[i].data_leitura).getTime();
      const dataAnterior = new Date(rows[i - 1].data_leitura).getTime();
      const tempoSegundos = (dataAtual - dataAnterior) / 1000;

      if (tempoSegundos > 0) {
        const downloadMbps = (
          ((Number(rows[i].download_bytes) -
            Number(rows[i - 1].download_bytes)) *
            8) /
          tempoSegundos /
          (1024 * 1024)
        ).toFixed(2);

        const uploadMbps = (
          ((Number(rows[i].upload_bytes) - Number(rows[i - 1].upload_bytes)) *
            8) /
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
  } catch (error: any) {
    console.error("Erro ao buscar histórico:", error.message);
    res.status(500).json({ mensagem: "Erro ao buscar dados do gráfico." });
  }
};
