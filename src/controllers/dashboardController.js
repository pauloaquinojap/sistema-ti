const pool = require("../config/db");

// --- 1. FUNÇÃO CALCULAR CUSTOS FINANCEIROS (GET) ---
const calcularResumoFinanceiro = async (req, res) => {
  const hoje = new Date();
  const mes = parseInt(req.query.mes) || hoje.getMonth() + 1;
  const ano = parseInt(req.query.ano) || hoje.getFullYear();

  const dataFiltroInicio = `${ano}-${mes.toString().padStart(2, "0")}-01`;

  let proximoMes = mes === 12 ? 1 : mes + 1;
  let proximoAno = mes === 12 ? ano + 1 : ano;
  const dataFiltroFim = `${proximoAno}-${proximoMes
    .toString()
    .padStart(2, "0")}-01`;

  try {
    // CUSTO DE LOCAÇÃO (Mensal: itens cadastrados antes ou no mês filtrado)
    const locacaoQuery = `
            SELECT COALESCE(SUM(valor), 0)::numeric(10, 2) AS custo_locacao
            FROM equipamentos  
            WHERE tipo_aquisicao = 'LOCACAO'
            AND status = 'ATIVO'
            AND data_cadastro < $1 
        `;
    const locacaoResult = await pool.query(locacaoQuery, [dataFiltroFim]);

    // CUSTO DE COMPRA (Mensal: itens COMPRADOS DENTRO DO MÊS FILTRADO)
    const compraQuery = `
            SELECT COALESCE(SUM(valor), 0)::numeric(10, 2) AS custo_compra
            FROM equipamentos  
            WHERE tipo_aquisicao = 'COMPRA'
            AND status = 'ATIVO'
            AND data_cadastro >= $1 AND data_cadastro < $2 
        `;
    const compraResult = await pool.query(compraQuery, [
      dataFiltroInicio,
      dataFiltroFim,
    ]);

    // CUSTO DE INTERNET (Mensal: links cadastrados antes ou no mês filtrado)
    const internetQuery = `
            SELECT COALESCE(SUM(valor_mensal), 0)::numeric(10, 2) AS custo_internet
            FROM internet
            WHERE status = 'ATIVA' 
            AND data_cadastro < $1
        `;
    const internetResult = await pool.query(internetQuery, [dataFiltroFim]);

    // Aqui você adicionaria a consulta de CUSTO CONTRATOS se ela já estivesse implementada
    // Por enquanto, mantenha o cálculo como nos exemplos anteriores

    const custoLocacao = parseFloat(locacaoResult.rows[0].custo_locacao);
    const custoCompra = parseFloat(compraResult.rows[0].custo_compra);
    const custoInternet = parseFloat(internetResult.rows[0].custo_internet);
    const custoTotalMensal = custoLocacao + custoInternet;

    res.status(200).json({
      mensagem: `Resumo financeiro para o mês ${mes}/${ano} calculado com sucesso!`,
      dados: {
        custo_locacao: custoLocacao.toFixed(2),
        custo_compra: custoCompra.toFixed(2), // Agora mensal
        custo_internet: custoInternet.toFixed(2),
        custo_mensal_total: custoTotalMensal.toFixed(2),
        // CUSTO CONTRATOS (Placeholder, ajustar quando a tabela for usada)
        custo_contratos: "0.00",
      },
    });
  } catch (error) {
    console.error("Erro ao calcular resumo financeiro:", error.message);
    res.status(500).json({
      mensagem: "Erro ao calcular resumo financeiro.",
      detalhe: error.message,
    });
  }
};

// --- 2. FUNÇÃO CONTAR EQUIPAMENTOS POR TIPO (GET) ---
const contarEquipamentosPorTipo = async (req, res) => {
  try {
    const query = `
            SELECT 
                tipo_equipamento, 
                COUNT(*)::integer AS total 
            FROM equipamentos  
            WHERE status = 'ATIVO'
            GROUP BY tipo_equipamento
            ORDER BY total DESC
        `;
    const result = await pool.query(query);

    const resumo = result.rows.reduce((acc, row) => {
      acc[row.tipo_equipamento.toLowerCase().replace(/[^a-z0-9]/g, "_")] =
        row.total;
      return acc;
    }, {});

    const tiposPadrao = [
      "notebook",
      "desktop",
      "monitor",
      "impressora",
      "servidor",
    ];
    let totalOutros = 0;

    // Inicializa os tipos padrão e soma os outros
    tiposPadrao.forEach((tipo) => {
      if (resumo[tipo]) {
        // Já existe, não faz nada
      } else {
        resumo[tipo] = 0; // Inicializa em zero
      }
    });

    // Soma o que não for tipo padrão
    Object.keys(resumo).forEach((key) => {
      if (!tiposPadrao.includes(key) && resumo[key] > 0) {
        totalOutros += resumo[key];
        delete resumo[key]; // Opcional: remover a chave não padrão
      }
    });

    // Adiciona a soma dos outros no campo servidor (ou pode criar 'outros')
    resumo.servidor += totalOutros;

    res.status(200).json({
      mensagem: "Resumo de equipamentos por tipo calculado com sucesso!",
      dados: resumo,
    });
  } catch (error) {
    console.error("Erro ao contar equipamentos:", error.message);
    res.status(500).json({
      mensagem: "Erro ao contar equipamentos.",
      detalhe: error.message,
    });
  }
};

module.exports = {
  calcularResumoFinanceiro,
  contarEquipamentosPorTipo,
};
