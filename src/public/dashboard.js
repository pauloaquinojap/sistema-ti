// Função auxiliar para formatar como moeda
const formatCurrency = (value) => {
  return `R$ ${parseFloat(value).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
  })}`;
};

// --- 1. CARREGAR DADOS FINANCEIROS ---
const loadFinancialData = async () => {
  const mes = document.getElementById("mes-filtro").value;
  const ano = document.getElementById("ano-filtro").value;

  let url = "/api/dashboard/financeiro";
  if (mes && ano) {
    url += `?mes=${mes}&ano=${ano}`;
  }

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (response.ok) {
      const {
        custo_locacao,
        custo_compra,
        custo_internet,
        custo_mensal_total,
      } = data.dados;

      document.getElementById("custo-total").textContent =
        formatCurrency(custo_mensal_total);
      document.getElementById("custo-locacao").textContent =
        formatCurrency(custo_locacao);
      document.getElementById("custo-compra").textContent =
        formatCurrency(custo_compra);
      document.getElementById("custo-internet").textContent =
        formatCurrency(custo_internet);
    } else {
      console.error(
        "Erro ao buscar dados financeiros:",
        data.detalhe || data.mensagem
      );
      document.getElementById("custo-total").textContent = "Erro ao carregar";
    }
  } catch (error) {
    console.error("Erro de rede ao carregar dados financeiros:", error);
    document.getElementById("custo-total").textContent = "Erro de Rede";
  }
};

// --- 2. CARREGAR DADOS DE EQUIPAMENTOS ---
const loadEquipmentData = async () => {
  const url = "/api/dashboard/equipamentos";

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (response.ok) {
      const resumo = data.dados;

      document.getElementById("count-notebook").textContent =
        resumo.notebook || 0;
      document.getElementById("count-desktop").textContent =
        resumo.desktop || 0;
      document.getElementById("count-monitor").textContent =
        resumo.monitor || 0;
      document.getElementById("count-impressora").textContent =
        resumo.impressora || 0;

      // Soma outros tipos que não são padronizados nos cards
      let outros = 0;
      Object.keys(resumo).forEach((key) => {
        if (!["notebook", "desktop", "monitor", "impressora"].includes(key)) {
          outros += resumo[key];
        }
      });
      document.getElementById("count-servidor").textContent = outros;
    } else {
      console.error(
        "Erro ao buscar resumo de equipamentos:",
        data.detalhe || data.mensagem
      );
    }
  } catch (error) {
    console.error("Erro de rede ao carregar resumo de equipamentos:", error);
  }
};

document.addEventListener("DOMContentLoaded", () => {
  // Define o mês e ano atual como padrão no filtro
  const hoje = new Date();
  document.getElementById("mes-filtro").value = hoje.getMonth() + 1;
  document.getElementById("ano-filtro").value = hoje.getFullYear();

  // Carrega dados iniciais
  loadFinancialData();
  loadEquipmentData();

  window.loadFinancialData = loadFinancialData;
});
