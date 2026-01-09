const API_URL = "/api/relatorios";

document.addEventListener("DOMContentLoaded", () => {
  carregarOpcoesFiltros();
  // Define datas padrão para o filtro de manutenção (Início do ano até hoje)
  const hoje = new Date();
  const inicioAno = new Date(hoje.getFullYear(), 0, 1);

  if (document.getElementById("data-inicio-manut")) {
    document.getElementById("data-inicio-manut").valueAsDate = inicioAno;
  }
  if (document.getElementById("data-fim-manut")) {
    document.getElementById("data-fim-manut").valueAsDate = hoje;
  }
});

// --- UI HELPERS ---
function openModalInventario() {
  document
    .getElementById("modal-relatorio-inventario")
    .classList.remove("hidden");
}

function closeModalInventario() {
  document.getElementById("modal-relatorio-inventario").classList.add("hidden");
}

function switchTab(tabName) {
  document
    .querySelectorAll(".tab-content")
    .forEach((c) => c.classList.remove("active"));
  document
    .querySelectorAll(".tab-btn")
    .forEach((b) => b.classList.remove("active"));
  document.getElementById(`tab-${tabName}`).classList.add("active");
  event.currentTarget.classList.add("active");
}

function toggleDateLabel() {
  const tipo = document.querySelector(
    'input[name="subTipoManutencao"]:checked'
  ).value;
  const label = document.getElementById("label-datas");
  if (tipo === "REALIZADAS") {
    label.innerText = "Período em que foi realizada:";
  } else {
    label.innerText = "Período previsto para realização:";
  }
}

// --- CARREGAMENTO DE OPÇÕES (Preenche ambas as abas) ---
async function carregarOpcoesFiltros() {
  try {
    const res = await fetch(`${API_URL}/opcoes`);
    const data = await res.json();

    // Aba Geral
    preencherCheckboxList("container-tipos", data.tipos);
    preencherCheckboxList("container-fornecedores", data.fornecedores);
    preencherCheckboxList("container-lojas", data.lojas);

    // Aba Manutenção (IDs com sufixo -manut)
    preencherCheckboxList("container-tipos-manut", data.tipos);
    preencherCheckboxList("container-fornecedores-manut", data.fornecedores);
    preencherCheckboxList("container-lojas-manut", data.lojas);
  } catch (error) {
    console.error("Erro opções:", error);
  }
}

function preencherCheckboxList(containerId, listaItens) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = "";

  // Select All
  const divAll = document.createElement("div");
  divAll.className = "checkbox-item";
  divAll.innerHTML = `<input type="checkbox" id="all-${containerId}" onchange="toggleAll('${containerId}', this.checked)"><label for="all-${containerId}"><strong>Selecionar Todos</strong></label>`;
  container.appendChild(divAll);

  listaItens.forEach((item, index) => {
    if (!item) return;
    const div = document.createElement("div");
    div.className = "checkbox-item";
    div.innerHTML = `<input type="checkbox" value="${item}" class="chk-${containerId}" id="${containerId}-${index}"><label for="${containerId}-${index}">${item}</label>`;
    container.appendChild(div);
  });
}

function toggleAll(containerId, isChecked) {
  document
    .querySelectorAll(`.chk-${containerId}`)
    .forEach((chk) => (chk.checked = isChecked));
}

// --- COLETA DE FILTROS ---
function getFiltrosGeral() {
  return {
    tipos: Array.from(
      document.querySelectorAll(".chk-container-tipos:checked")
    ).map((c) => c.value),
    fornecedores: Array.from(
      document.querySelectorAll(".chk-container-fornecedores:checked")
    ).map((c) => c.value),
    lojas: Array.from(
      document.querySelectorAll(".chk-container-lojas:checked")
    ).map((c) => c.value),
    aquisicao: document.getElementById("select-aquisicao").value,
  };
}

function getFiltrosManutencao() {
  return {
    subTipo: document.querySelector('input[name="subTipoManutencao"]:checked')
      .value,
    dataInicio: document.getElementById("data-inicio-manut").value,
    dataFim: document.getElementById("data-fim-manut").value,
    tipos: Array.from(
      document.querySelectorAll(".chk-container-tipos-manut:checked")
    ).map((c) => c.value),
    fornecedores: Array.from(
      document.querySelectorAll(".chk-container-fornecedores-manut:checked")
    ).map((c) => c.value),
    lojas: Array.from(
      document.querySelectorAll(".chk-container-lojas-manut:checked")
    ).map((c) => c.value),
  };
}

// ==========================================
// LÓGICA: RELATÓRIO GERAL (INVENTÁRIO)
// ==========================================
async function gerarPDF() {
  const filtros = getFiltrosGeral();
  const dados = await fetchDados(filtros, "/inventario-geral");
  if (!dados) return;

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: "landscape" });

  doc.setFontSize(16);
  doc.text("Relatório Geral de Inventário", 14, 15);
  doc.setFontSize(10);
  doc.text(`Gerado em: ${new Date().toLocaleString()}`, 14, 22);

  const colunas = [
    "Tipo",
    "Modelo",
    "Série",
    "Loja",
    "Usuário",
    "Aquisição",
    "Valor (R$)",
  ];
  const linhas = dados.map((i) => [
    i.tipo_equipamento,
    i.modelo,
    i.numero_serie,
    i.loja_atual,
    i.usuario_atual,
    i.tipo_aquisicao,
    parseFloat(i.valor || 0).toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
    }),
  ]);

  doc.autoTable({
    head: [colunas],
    body: linhas,
    startY: 30,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [44, 62, 80] },
  });

  // Totais
  const stats = calcularTotaisGeral(dados);
  const finalY = doc.lastAutoTable.finalY + 10;

  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("Resumo:", 14, finalY);
  doc.setFont("helvetica", "normal");
  doc.text(
    `Próprios: ${stats.proprios.qtd} (${stats.proprios.valor})`,
    14,
    finalY + 7
  );
  doc.text(
    `Terceiros: ${stats.terceiros.qtd} (${stats.terceiros.valor})`,
    14,
    finalY + 14
  );
  doc.setFont("helvetica", "bold");
  doc.text(
    `TOTAL GERAL: ${stats.geral.qtd} (${stats.geral.valor})`,
    14,
    finalY + 24
  );

  doc.save("Inventario_Geral.pdf");
}

async function gerarExcel() {
  const filtros = getFiltrosGeral();
  const dados = await fetchDados(filtros, "/inventario-geral");
  if (!dados) return;

  const planilha = dados.map((i) => ({
    Tipo: i.tipo_equipamento,
    Modelo: i.modelo,
    Série: i.numero_serie,
    Loja: i.loja_atual,
    Usuário: i.usuario_atual,
    Aquisição: i.tipo_aquisicao,
    Valor: parseFloat(i.valor || 0),
  }));

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(planilha);
  XLSX.utils.book_append_sheet(wb, ws, "Inventario");
  XLSX.writeFile(wb, "Inventario_Geral.xlsx");
}

function calcularTotaisGeral(dados) {
  let stats = {
    proprios: { qtd: 0, val: 0 },
    terceiros: { qtd: 0, val: 0 },
    geral: { qtd: 0, val: 0 },
  };
  dados.forEach((i) => {
    const val = parseFloat(i.valor) || 0;
    const tipo = (i.tipo_aquisicao || "").toUpperCase();
    if (tipo === "LOCACAO" || tipo === "COMODATO") {
      stats.terceiros.qtd++;
      stats.terceiros.val += val;
    } else {
      stats.proprios.qtd++;
      stats.proprios.val += val;
    }
  });
  stats.geral.qtd = stats.proprios.qtd + stats.terceiros.qtd;
  stats.geral.val = stats.proprios.val + stats.terceiros.val;

  const fmt = (v) =>
    v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  return {
    proprios: { qtd: stats.proprios.qtd, valor: fmt(stats.proprios.val) },
    terceiros: { qtd: stats.terceiros.qtd, valor: fmt(stats.terceiros.val) },
    geral: { qtd: stats.geral.qtd, valor: fmt(stats.geral.val) },
  };
}

// ==========================================
// LÓGICA: RELATÓRIO DE MANUTENÇÃO
// ==========================================

async function gerarPDFManutencao() {
  const filtros = getFiltrosManutencao();
  const dados = await fetchDados(filtros, "/manutencao");
  if (!dados) return;

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: "landscape" });

  // Configurações de colunas
  let colunas = ["Tipo", "Modelo", "Série", "Loja", "Data"];
  if (filtros.subTipo === "REALIZADAS") {
    colunas.push("Valor (R$)"); // Adiciona coluna de valor se for realizada
  }

  let totalGasto = 0;

  const linhas = dados.map((i) => {
    const valor = parseFloat(i.valor_manutencao || 0);
    totalGasto += valor;

    const row = [
      i.tipo_equipamento,
      i.modelo,
      i.numero_serie,
      i.loja_atual,
      new Date(i.data_evento).toLocaleDateString("pt-BR"),
    ];

    if (filtros.subTipo === "REALIZADAS") {
      row.push(valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 }));
    }
    return row;
  });

  doc.autoTable({
    head: [colunas],
    body: linhas,
    startY: 30,
    theme: "grid",
    headStyles: { fillColor: [34, 34, 34] },
  });

  const finalY = doc.lastAutoTable.finalY + 10;
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");

  if (filtros.subTipo === "REALIZADAS") {
    doc.text(`Total de Manutenções: ${dados.length}`, 14, finalY);
    doc.text(
      `VALOR TOTAL INVESTIDO: R$ ${totalGasto.toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
      })}`,
      14,
      finalY + 7
    );
  } else {
    doc.text(`Total de Equipamentos a Realizar: ${dados.length}`, 14, finalY);
  }

  doc.save("Relatorio_Financeiro_Manutencao.pdf");
}

async function gerarExcelManutencao() {
  const filtros = getFiltrosManutencao();
  if (!filtros.dataInicio || !filtros.dataFim)
    return alert("Selecione o período de datas.");

  const dados = await fetchDados(filtros, "/manutencao");
  if (!dados) return;

  const labelData =
    filtros.subTipo === "REALIZADAS" ? "Data Realização" : "Data Prevista";

  const planilha = dados.map((i) => ({
    Tipo: i.tipo_equipamento,
    Modelo: i.modelo,
    Série: i.numero_serie,
    Patrimônio: i.patrimonio,
    Loja: i.loja_atual,
    Fornecedor: i.empresa_responsavel,
    [labelData]: new Date(i.data_evento).toLocaleDateString("pt-BR"),
  }));

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(planilha);

  // Total no final
  XLSX.utils.sheet_add_aoa(
    ws,
    [
      [""],
      [
        filtros.subTipo === "REALIZADAS"
          ? "TOTAL MANUTENÇÕES REALIZADAS"
          : "TOTAL A REALIZAR",
        dados.length,
      ],
    ],
    { origin: -1 }
  );

  XLSX.utils.book_append_sheet(wb, ws, "Manutencao");
  XLSX.writeFile(wb, "Relatorio_Manutencao.xlsx");
}

// --- HELPER DE FETCH ---
async function fetchDados(body, endpoint) {
  try {
    const res = await fetch(`${API_URL}${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    if (json.length === 0) {
      alert("Nenhum registro encontrado.");
      return null;
    }
    return json;
  } catch (e) {
    console.error(e);
    alert("Erro ao buscar dados.");
    return null;
  }
}
