let todosContratos = [];
let currentContratoId = null;

// --- CÁLCULO AUTOMÁTICO DE VIGÊNCIA ---
function calcularDataFim() {
  const dataInicioInput = document.getElementById("cad-data-inicio");
  const prazoInput = document.getElementById("cad-prazo-meses");
  const campoDataFim = document.getElementById("cad-data-fim");

  if (!dataInicioInput || !prazoInput || !campoDataFim) return;

  const inicioStr = dataInicioInput.value;
  const meses = parseInt(prazoInput.value);

  if (inicioStr && !isNaN(meses) && meses >= 0) {
    const partes = inicioStr.split("-");
    const data = new Date(partes[0], partes[1] - 1, partes[2]);
    data.setMonth(data.getMonth() + meses);

    const ano = data.getFullYear();
    const mes = String(data.getMonth() + 1).padStart(2, "0");
    const dia = String(data.getDate()).padStart(2, "0");

    campoDataFim.value = `${ano}-${mes}-${dia}`;
  } else {
    campoDataFim.value = "";
  }
}

document.addEventListener("DOMContentLoaded", () => {
  listarContratos();
  carregarFornecedoresNoSelect();

  const formContrato = document.getElementById("form-cadastro-contrato");
  if (formContrato) formContrato.addEventListener("submit", salvarContrato);

  const formAditivo = document.getElementById("form-cadastro-aditivo");
  if (formAditivo) formAditivo.addEventListener("submit", salvarAditivo);

  const selectTipoAditivo = document.getElementById("tipo_aditivo_select");
  if (selectTipoAditivo) {
    selectTipoAditivo.addEventListener("change", ajustarCamposAditivo);
  }

  const fileInput = document.getElementById("arquivo-contrato");
  if (fileInput) {
    fileInput.addEventListener("change", (e) => {
      const fileName = e.target.files[0]
        ? e.target.files[0].name
        : "Nenhum arquivo selecionado";
      const display = document.getElementById("file-name-display");
      if (display) display.textContent = fileName;
    });
  }

  const toggle = document.getElementById("status-checkbox");
  if (toggle) {
    toggle.addEventListener("change", listarContratos);
  }

  window.onclick = (event) => {
    if (event.target.classList.contains("modal")) fecharModais();
  };
});

// --- LÓGICA DE CAMPOS DINÂMICOS DO ADITIVO ---
function ajustarCamposAditivo() {
  const tipo = document.getElementById("tipo_aditivo_select").value;
  const container = document.getElementById("container_dinamico_aditivo");
  if (!container) return;

  container.innerHTML = "";
  container.style.display = tipo ? "block" : "none";

  if (tipo === "valor") {
    container.innerHTML = `
            <div class="form-group">
                <label>Recorrência do Valor:</label>
                <select name="recorrencia_valor" class="form-control" required>
                    <option value="unica">Única (Acréscimo pontual)</option>
                    <option value="mensal">Mensal (Alteração na parcela)</option>
                </select>
            </div>
            <div class="form-group">
                <label>Valor Adicionado (R$):</label>
                <input type="text" name="valor_adicionado" class="form-control" placeholder="0,00" onkeyup="mascaraMoeda(this)" required>
            </div>
        `;
  } else if (tipo === "prazo") {
    const dataFimAtual =
      document.getElementById("detalhe-data-fim-hidden")?.value || "";
    container.innerHTML = `
            <div class="form-group">
                <label>Prazo Atual:</label>
                <input type="text" value="${dataFimAtual}" class="form-control" disabled style="background-color: #e9ecef; opacity: 0.7;">
            </div>
            <div class="form-group">
                <label>Novo Prazo (Data de Término):</label>
                <input type="date" name="nova_data_termino" class="form-control" required>
            </div>
        `;
  } else if (tipo === "escopo") {
    container.innerHTML = `
            <div class="form-group">
                <label>Descrição da Alteração de Escopo:</label>
                <textarea name="descricao_escopo" class="form-control" rows="4" required></textarea>
            </div>
        `;
  }
}

// --- 1. LISTAGEM E FILTROS ---
function alternarVisualizacaoContratos() {
  listarContratos();
}

async function listarContratos() {
  try {
    const res = await fetch("/api/contrato/listar");
    todosContratos = await res.json();
    renderizarTabela(todosContratos);
  } catch (e) {
    console.error("Erro ao listar:", e);
  }
}

function renderizarTabela(lista) {
  const toggle = document.getElementById("status-checkbox");
  const mostrarAtivos = toggle ? toggle.checked : true;
  const tbody = document.getElementById("tabela-contratos-corpo");
  if (!tbody) return;

  tbody.innerHTML = "";

  // Filtra por Ativo / Descontinuado baseado no Switch
  const listaFiltradaStatus = lista.filter((c) => {
    const statusDB = (c.status || "").trim();
    // Se o switch está marcado (Ativos), mostra Ativos. Se não, mostra Descontinuados/Inativos.
    return mostrarAtivos ? statusDB === "Ativo" : statusDB !== "Ativo";
  });

  if (listaFiltradaStatus.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center">Nenhum contrato encontrado.</td></tr>`;
    return;
  }

  listaFiltradaStatus.forEach((c) => {
    const statusDB = (c.status || "").trim();

    // Define a classe CSS para a cor do badge (opcional, baseado no seu style.css)
    const statusClass =
      statusDB === "Ativo" ? "status-ativo" : "status-inativo";

    const tr = document.createElement("tr");
    tr.classList.add("clickable-row");
    tr.style.cursor = "pointer";
    tr.onclick = () => visualizarContrato(c.id);

    // Formatação da Vigência: "de data_inicio até data_fim"
    const vigenciaFormatada = ` ${formatarData(
      c.data_inicio
    )} até ${formatarData(c.data_fim)}`;

    tr.innerHTML = `
      <td>${c.numero_contrato}</td>
      <td>${c.fornecedor_nome || "N/A"}</td>
      <td>${c.tipo_contrato}</td>
      <td>${vigenciaFormatada}</td>
      <td><span class="status-badge ${statusClass}">${statusDB}</span></td>
    `;
    tbody.appendChild(tr);
  });
}

function aplicarFiltros() {
  const num = (
    document.getElementById("filtro-numero")?.value || ""
  ).toLowerCase();
  const emp = (
    document.getElementById("filtro-empresa")?.value || ""
  ).toLowerCase();
  const tipo = document.getElementById("filtro-tipo")?.value || "";

  const filtrados = todosContratos.filter((c) => {
    const matchNum = (c.numero_contrato || "").toLowerCase().includes(num);
    const matchEmp = (c.fornecedor_nome || "").toLowerCase().includes(emp);
    const matchTipo = tipo === "" || c.tipo_contrato === tipo;
    return matchNum && matchEmp && matchTipo;
  });

  renderizarTabela(filtrados);
}

// --- 2. SALVAMENTO ---
async function salvarContrato(e) {
  e.preventDefault();
  const formData = new FormData(e.target);
  formData.set("status", "Ativo");

  ["valor_contrato", "valor_mensal"].forEach((campo) => {
    const val = formData.get(campo);
    if (val) {
      const limpo = val.replace(/[^\d,]/g, "").replace(",", ".");
      formData.set(campo, limpo);
    }
  });

  try {
    const response = await fetch("/api/contrato/cadastro", {
      method: "POST",
      body: formData,
    });
    if (response.ok) {
      fecharModais();
      alert("Contrato salvo com sucesso!");
      e.target.reset();
      listarContratos();
    } else {
      const err = await response.json();
      alert("Erro: " + err.mensagem);
    }
  } catch (error) {
    alert("Erro ao conectar com o servidor");
  }
}

async function salvarAditivo(e) {
  e.preventDefault();
  const formData = new FormData(e.target);

  const vAdd = formData.get("valor_adicionado");
  if (vAdd) {
    formData.set(
      "valor_adicionado",
      vAdd.replace(/[^\d,]/g, "").replace(",", ".")
    );
  }

  try {
    const response = await fetch("/api/contrato/aditivo", {
      method: "POST",
      body: formData,
    });
    if (response.ok) {
      fecharModais();
      alert("Aditivo registrado com sucesso!");
      visualizarContrato(currentContratoId);
      listarContratos();
    } else {
      const err = await response.json();
      alert("Erro: " + err.mensagem);
    }
  } catch (error) {
    alert("Erro ao salvar aditivo");
  }
}

// --- 3. DETALHES ---
async function visualizarContrato(id) {
  if (!id) return;
  try {
    const response = await fetch(`/api/contrato/detalhes/${id}`);
    if (!response.ok) throw new Error("Erro ao buscar detalhes");

    const data = await response.json();
    const c = data;
    const contratoData = c.numero_contrato ? c : data.contrato || {};
    const historico = c.aditivos || data.aditivos || [];

    currentContratoId = contratoData.id;

    const titulo = document.getElementById("view-numero-titulo");
    if (titulo)
      titulo.textContent = contratoData.numero_contrato || "Sem número";

    const grid = document.getElementById("view-detalhes-grid");
    if (grid) {
      grid.innerHTML = `
        <input type="hidden" id="detalhe-data-fim-hidden" value="${formatarData(
          contratoData.data_fim
        )}">
        <div class="view-item"><strong>Fornecedor:</strong> ${
          contratoData.fornecedor_nome ||
          contratoData.razao_social ||
          "Não informado"
        }</div>
        <div class="view-item"><strong>CNPJ:</strong> ${
          contratoData.cnpj || contratoData.cnpj_cpf || "N/A"
        }</div>
        <div class="view-item"><strong>Status:</strong> <span class="status-badge ${(
          contratoData.status || ""
        )
          .trim()
          .toLowerCase()}">${contratoData.status || "-"}</span></div>
        <div class="view-item"><strong>Vigência:</strong> ${formatarData(
          contratoData.data_inicio
        )} até ${formatarData(contratoData.data_fim)}</div>
        <div class="view-item"><strong>Valor Contrato:</strong> ${formatarMoeda(
          contratoData.valor_contrato
        )}</div>
        <div class="view-item"><strong>Valor Mensal:</strong> ${formatarMoeda(
          contratoData.valor_mensal
        )}</div>
        <div class="view-item"><strong>Renovação Automática:</strong> ${
          contratoData.renovacao_automatica ? "Sim" : "Não"
        }</div>
        <div class="view-item" style="grid-column: span 2"><strong>Descrição:</strong> ${
          contratoData.descricao || "-"
        }</div>
      `;
    }

    const tbody = document.querySelector("#tabela-aditivos tbody");
    if (tbody) {
      tbody.innerHTML = historico.length
        ? historico
            .map((item) => {
              let desc = item.descricao_escopo || "-";
              if (item.tipo_aditivo === "valor")
                desc = `Valor: ${formatarMoeda(item.valor_adicionado)}`;
              if (item.tipo_aditivo === "prazo")
                desc = `Novo prazo: ${formatarData(item.nova_data_termino)}`;
              return `
            <tr>
              <td><strong>Aditivo</strong></td> 
              <td>${item.tipo_aditivo}</td> 
              <td>${formatarData(item.data_assinatura)}</td> 
              <td>${desc}</td> 
              <td style="display: flex; gap: 10px; align-items: center;">
                ${
                  item.anexo_aditivo
                    ? `<a href="/uploads-contrato/${item.anexo_aditivo}" target="_blank" title="Ver Anexo">📂</a>`
                    : "-"
                }
                <button onclick="deletarAditivo(${
                  item.id
                }, ${currentContratoId})" style="background:none; border:none; cursor:pointer; color:red; font-size:18px;" title="Excluir Aditivo">🗑️</button>
              </td>
            </tr>`;
            })
            .join("")
        : '<tr><td colspan="5" style="text-align:center">Nenhum registro encontrado.</td></tr>';
    }

    const footer = document.querySelector("#modal-view .modal-footer");
    const status = (contratoData.status || "").trim();

    // Limpeza de botões antigos para evitar duplicatas
    const btnReativarExistente = document.getElementById(
      "btn-reativar-contrato"
    );
    if (btnReativarExistente) btnReativarExistente.remove();

    const btnNovoAditivo = document.getElementById("btn-novo-aditivo-trigger");
    const btnDescontinuar = document.getElementById("btn-descontinuar-trigger");
    const btnExcluir = document.getElementById("btn-excluir-contrato");

    if (status === "Ativo") {
      if (btnNovoAditivo) {
        btnNovoAditivo.style.display = "inline-block";
        btnNovoAditivo.onclick = () =>
          abrirModalAditivo(contratoData.id, contratoData.numero_contrato);
      }
      if (btnDescontinuar) {
        btnDescontinuar.style.display = "inline-block";
        btnDescontinuar.onclick = () => abrirModalDescontinuar(contratoData.id);
      }
    } else {
      if (btnNovoAditivo) btnNovoAditivo.style.display = "none";
      if (btnDescontinuar) btnDescontinuar.style.display = "none";

      const btnReativar = document.createElement("button");
      btnReativar.type = "button";
      btnReativar.id = "btn-reativar-contrato";
      btnReativar.className = "btn-success";
      btnReativar.style.backgroundColor = "#28a745";
      btnReativar.style.color = "white";
      btnReativar.textContent = "Reativar Contrato";
      btnReativar.onclick = () => reativarContrato(contratoData.id);
      if (footer) footer.appendChild(btnReativar);
    }

    if (btnExcluir) btnExcluir.onclick = () => excluirContrato(contratoData.id);

    abrirModal("modal-view");
  } catch (error) {
    console.error("Erro ao carregar detalhes:", error);
  }
}

// --- 4. AÇÕES DE STATUS (DESCONTINUAR / REATIVAR) ---
function abrirModalDescontinuar(id) {
  currentContratoId = id;
  abrirModal("modal-descontinuar");
}

async function executarDescontinuacao() {
  const dataEncerrar = document.getElementById(
    "data-descontinuacao-input"
  ).value;
  try {
    const response = await fetch(
      `/api/contrato/descontinuar/${currentContratoId}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data_descontinuacao: dataEncerrar }),
      }
    );
    if (response.ok) {
      alert("Contrato encerrado com sucesso!");
      fecharModais();
      listarContratos();
    }
  } catch (error) {
    console.error(error);
  }
}

async function reativarContrato(id) {
  if (!confirm("Deseja realmente reativar este contrato?")) return;
  try {
    const res = await fetch(`/api/contrato/reativar/${id}`, { method: "PUT" });
    if (res.ok) {
      alert("Contrato reativado com sucesso!");
      fecharModais();
      listarContratos();
    }
  } catch (e) {
    console.error(e);
  }
}

// --- 5. UTILITÁRIOS ---
function formatarMoeda(valor) {
  if (valor === null || valor === undefined || valor === "") return "R$ 0,00";
  let n =
    typeof valor === "string"
      ? parseFloat(valor.replace(/[^\d.-]/g, ""))
      : valor;
  if (isNaN(n)) return "R$ 0,00";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(n);
}

function mascaraMoeda(i) {
  let v = i.value.replace(/\D/g, "");
  v = (v / 100).toFixed(2) + "";
  v = v.replace(".", ",");
  v = v.replace(/(\d)(\d{3})(\d{3}),/g, "$1.$2.$3,");
  v = v.replace(/(\d)(\d{3}),/g, "$1.$2,");
  i.value = "R$ " + v;
}

function formatarData(dataISO) {
  if (!dataISO) return "N/A";
  try {
    const data = new Date(dataISO);
    return data.toLocaleDateString("pt-BR", { timeZone: "UTC" });
  } catch (e) {
    return "Data Inválida";
  }
}

// --- 6. MODAIS ---
function abrirModal(id) {
  const m = document.getElementById(id);
  if (m) {
    m.style.display = "flex";
    setTimeout(() => m.classList.add("active"), 10);
  }
}

function fecharModais() {
  document.querySelectorAll(".modal").forEach((m) => {
    m.classList.remove("active");
    setTimeout(() => (m.style.display = "none"), 300);
  });
}

function abrirModalAditivo(id, num) {
  const idInput = document.getElementById("aditivo-contrato-id");
  const numInput = document.getElementById("aditivo-contrato-numero");
  if (idInput) idInput.value = id;
  if (numInput) numInput.value = num || "";
  const select = document.getElementById("tipo_aditivo_select");
  if (select) select.value = "";
  ajustarCamposAditivo();
  abrirModal("modal-aditivo");
}

async function carregarFornecedoresNoSelect() {
  try {
    const response = await fetch("/api/fornecedor/ativos");
    const fornecedores = await response.json();
    const select = document.getElementById("select-fornecedor");
    if (select) {
      select.innerHTML = '<option value="">Selecione o Fornecedor</option>';
      fornecedores.forEach((f) => {
        const opt = document.createElement("option");
        opt.value = f.id;
        opt.textContent = f.razao_social;
        select.appendChild(opt);
      });
    }
  } catch (e) {
    console.error(e);
  }
}

async function excluirContrato(id) {
  if (!confirm("Excluir este contrato permanentemente?")) return;
  try {
    const res = await fetch(`/api/contrato/excluir/${id}`, {
      method: "DELETE",
    });
    if (res.ok) {
      alert("Excluído!");
      fecharModais();
      listarContratos();
    }
  } catch (e) {
    alert("Erro ao excluir.");
  }
}

function abrirModalCadastro() {
  const form = document.getElementById("form-cadastro-contrato");
  if (form) form.reset();
  abrirModal("modal-cadastro");
}

async function deletarAditivo(idAditivo, idContrato) {
  if (!confirm("Tem certeza que deseja excluir este aditivo?")) return;
  try {
    const response = await fetch(`/api/contrato/aditivo/${idAditivo}`, {
      method: "DELETE",
    });
    if (response.ok) {
      alert("Aditivo excluído com sucesso!");
      visualizarContrato(idContrato);
      listarContratos();
    }
  } catch (error) {
    console.error(error);
  }
}
