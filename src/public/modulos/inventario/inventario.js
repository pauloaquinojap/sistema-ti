let inventarioData = []; // Armazena todos os equipamentos

// --- 0. INJEÇÃO DA LATA DE LIXO (CSS ANIMATION) ---
const injectTrashIcon = () => {
  if (!document.getElementById("trash-animation-container")) {
    const trashDiv = document.createElement("div");
    trashDiv.id = "trash-animation-container";
    trashDiv.innerHTML = '<i class="fa-solid fa-trash-can"></i>'; // Requer FontAwesome
    document.body.appendChild(trashDiv);
  }
};

// --- 1. FUNÇÕES DE FEEDBACK E MODAL DE CADASTRO ---

const showFeedback = (message, type, targetId = "feedback-message") => {
  const feedback = document.getElementById(targetId);
  if (!feedback) return;

  feedback.textContent = message;
  feedback.classList.remove("success", "error", "hidden");
  feedback.classList.add(type);

  // Tempo aumentado para 3 segundos para dar tempo de ler no meio da tela
  setTimeout(() => {
    feedback.classList.add("hidden");
  }, 3000);
};

const openCadastroModal = () => {
  const modal = document.getElementById("cadastro-modal");
  const form = document.getElementById("cadastro-equipamento-form");

  if (!modal || !form) return;

  modal.classList.remove("hidden");
  form.reset();

  const tipoAquisicao = document.getElementById("tipo_aquisicao");
  if (tipoAquisicao) tipoAquisicao.value = "";

  if (typeof clearFileSelection === "function") {
    clearFileSelection();
  }

  toggleDataCompra();

  const feedbackModal = document.getElementById("feedback-modal-message");
  if (feedbackModal) feedbackModal.classList.add("hidden");

  document.body.classList.add("modal-open");

  const valorInput = document.getElementById("valor");
  if (valorInput) valorInput.value = "0,00";
};

const closeCadastroModal = () => {
  document.getElementById("cadastro-modal")?.classList.add("hidden");
  document.body.classList.remove("modal-open");
};

const toggleDataCompra = (modalId = "cadastro-modal") => {
  const isCadastro = modalId === "cadastro-modal";

  const tipoAquisicaoId = isCadastro ? "tipo_aquisicao" : "edit-tipo_aquisicao";
  const dataCompraFieldId = isCadastro
    ? "data-compra-field"
    : "edit-data-compra-field";
  const dataCompraInputId = isCadastro
    ? "data_comp_frontend"
    : "edit-data_compra_frontend";

  const tipoAquisicao = document.getElementById(tipoAquisicaoId)?.value;
  const dataCompraField = document.getElementById(dataCompraFieldId);
  const dataCompraInput = document.getElementById(dataCompraInputId);

  if (!dataCompraField || !dataCompraInput) return;

  if (tipoAquisicao === "COMPRA") {
    dataCompraField.classList.remove("hidden");
    dataCompraInput.setAttribute("required", "required");
  } else {
    dataCompraField.classList.add("hidden");
    dataCompraInput.removeAttribute("required");
    dataCompraInput.value = "";
  }
};

// --- FUNÇÕES DE CONTROLE DOS NOVOS MODAIS SEPARADOS ---

const closeEditModal = () => {
  document.getElementById("edicao-modal")?.classList.add("hidden");
  document.body.classList.remove("modal-open");
  document.getElementById("feedback-edit-message")?.classList.add("hidden");
};

const closeTransferModal = () => {
  document.getElementById("transferencia-modal")?.classList.add("hidden");
  document.getElementById("transferencia-form")?.reset();
  document.body.classList.remove("modal-open");
  document.getElementById("feedback-transfer-message")?.classList.add("hidden");
};

const closeAcaoTecnicaModal = () => {
  document.getElementById("manutencao-modal")?.classList.add("hidden");
  document.body.classList.remove("modal-open");
};

// Função para abrir abas no modal de DETALHES
const openTab = (evt, tabName) => {
  const parentModal = evt.currentTarget.closest(".tabs-container");
  if (!parentModal) return;

  const tabContents = parentModal.getElementsByClassName("tab-content");
  for (let i = 0; i < tabContents.length; i++) {
    tabContents[i].classList.remove("active");
  }
  const tabButtons = parentModal.getElementsByClassName("tab-button");
  for (let i = 0; i < tabButtons.length; i++) {
    tabButtons[i].classList.remove("active");
  }
  document.getElementById(tabName)?.classList.add("active");
  evt.currentTarget.classList.add("active");
};

// --- FUNÇÃO DE MÁSCARA DE MOEDA ---
const formatCurrency = (input) => {
  let value = input.value;
  value = value.replace(/\D/g, "");
  if (value.length === 0) {
    input.value = "0,00";
    return;
  }
  let centavosString = value.padStart(3, "0");
  let reais = centavosString.substring(0, centavosString.length - 2);
  let centavos = centavosString.substring(centavosString.length - 2);
  if (reais.length > 1 && reais.startsWith("0")) {
    reais = reais.replace(/^0+/, "");
    if (reais.length === 0) reais = "0";
  }
  reais = reais
    .split("")
    .reverse()
    .join("")
    .match(/.{1,3}/g)
    .join(".")
    .split("")
    .reverse()
    .join("");
  input.value = reais + "," + centavos;
};

// --- 2. FUNÇÕES DE AÇÃO (EXCLUSÃO COM ANIMAÇÃO) ---

const excluirEquipamento = async (id) => {
  if (
    !confirm(
      "Tem certeza que deseja EXCLUIR PERMANENTEMENTE este equipamento? Essa ação não pode ser desfeita."
    )
  ) {
    return;
  }

  // Fecha o modal de detalhes se estiver aberto para ver a animação na tabela
  document.getElementById("details-modal-overlay")?.remove();

  try {
    const response = await fetch(`/api/equipamento/excluir/${id}`, {
      method: "DELETE",
    });
    const result = await response.json();

    if (response.ok) {
      // --- ANIMAÇÃO DE SUCESSO ---
      const row = document.querySelector(`tr[data-id='${id}']`);
      const trashIcon = document.getElementById("trash-animation-container");

      if (row && trashIcon) {
        trashIcon.classList.add("active");
        row.classList.add("row-deleting");
        setTimeout(() => trashIcon.classList.add("eating"), 200);
        setTimeout(() => {
          trashIcon.classList.remove("active", "eating");
          loadInventario();
          // ALTERADO: Agora exibe em vermelho (error) conforme solicitado
          showFeedback(result.mensagem, "error");
        }, 800);
      } else {
        loadInventario();
        showFeedback(result.mensagem, "error");
      }
    } else {
      showFeedback(`Falha ao excluir: ${result.mensagem}`, "error");
    }
  } catch (error) {
    console.error("Erro ao excluir equipamento:", error);
    showFeedback("Erro de conexão ao tentar excluir o equipamento.", "error");
  }
};

const handleNewAnexoSubmit = async (e) => {
  e.preventDefault();
  const equipamentoId = e.currentTarget.id.replace("form-add-anexo-", "");
  const anexoInput = document.getElementById("new-anexo");
  if (!anexoInput || anexoInput.files.length === 0) {
    alert("Por favor, selecione um arquivo para anexar.");
    return;
  }
  const formData = new FormData();
  formData.append("novo_anexo", anexoInput.files[0]);
  try {
    const response = await fetch(`/api/equipamento/anexo/${equipamentoId}`, {
      method: "POST",
      body: formData,
    });
    const result = await response.json();
    if (response.ok) {
      alert(result.mensagem || "Anexo adicionado com sucesso!");
      document.getElementById("details-modal-overlay")?.remove();
      viewDetails(equipamentoId);
    } else {
      alert(
        `Erro ao adicionar anexo: ${result.mensagem || "Erro desconhecido."}`
      );
    }
  } catch (error) {
    console.error("Erro ao enviar anexo:", error);
    alert("Erro de conexão com o servidor ao tentar adicionar o anexo.");
  }
  if (anexoInput) anexoInput.value = "";
};

// --- MODAIS DE EDIÇÃO / TRANSFERÊNCIA / AÇÃO ---

const openEditModal = async (id) => {
  document.getElementById("details-modal-overlay")?.remove();
  const item = await fetchEquipamentoDetails(id);
  if (!item) return;

  const editModalTitle = document.getElementById("edit-modal-title");
  if (editModalTitle)
    editModalTitle.textContent = `Editar Equipamento ID ${item.id}`;

  const editEquipamentoId = document.getElementById("edit-equipamento-id");
  if (editEquipamentoId) editEquipamentoId.value = item.id;

  document.getElementById("edit-tipo_equipamento").value =
    item.tipo_equipamento || "";
  document.getElementById("edit-modelo").value = item.modelo || "";
  document.getElementById("edit-patrimonio").value = item.patrimonio || "";
  document.getElementById("edit-numero_serie").value = item.numero_serie || "";
  document.getElementById("edit-empresa_responsavel").value =
    item.empresa_responsavel || "";

  const tipoAquisicaoSelect = document.getElementById("edit-tipo_aquisicao");
  if (tipoAquisicaoSelect)
    tipoAquisicaoSelect.value = item.tipo_aquisicao || "COMPRA";

  const valorAPI = parseFloat(item.valor || 0).toFixed(2);
  const valorFormatado = valorAPI
    .replace(".", ",")
    .replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  document.getElementById("edit-valor").value = valorFormatado;

  const dataCadastro = item.data_cadastro
    ? item.data_cadastro.split("T")[0]
    : "";
  document.getElementById("edit-data_compra_frontend").value = dataCadastro;

  toggleDataCompra("edicao-modal");
  document.getElementById("edit-observacoes").value = item.observacoes || "";
  document.getElementById("edicao-modal")?.classList.remove("hidden");
  document.body.classList.add("modal-open");
};

const openTransferModal = async (id) => {
  document.getElementById("details-modal-overlay")?.remove();
  const item = await fetchEquipamentoDetails(id);
  if (!item) return;

  const transferModalTitle = document.getElementById("transfer-modal-title");
  if (transferModalTitle)
    transferModalTitle.textContent = `Transferir Equipamento ID ${item.id}`;

  const transferEquipamentoId = document.getElementById(
    "transfer-equipamento-id"
  );
  if (transferEquipamentoId) transferEquipamentoId.value = item.id;

  document.getElementById("transfer-usuario_atual").value =
    item.usuario_atual || "";
  document.getElementById("transfer-loja_atual").value = item.loja_atual || "";
  document.getElementById("transfer-motivo").value = "";

  document.getElementById("transferencia-modal")?.classList.remove("hidden");
  document.body.classList.add("modal-open");
};

const openAcaoTecnicaModal = async (id) => {
  document.getElementById("details-modal-overlay")?.remove();
  const item = await fetchEquipamentoDetails(id);
  if (!item) return;

  const modal = document.getElementById("manutencao-modal");
  if (!modal) return;

  document.getElementById("manutencao-form")?.reset();

  if (document.getElementById("motivo-manutencao"))
    document.getElementById("motivo-manutencao").value = "";
  if (document.getElementById("acao-data-proxima"))
    document.getElementById("acao-data-proxima").value = "";

  document.getElementById("campos-upgrade")?.classList.add("hidden");
  document.getElementById("campos-manutencao")?.classList.add("hidden");

  const idField = document.getElementById("manutencao-equipamento-id");
  if (idField) idField.value = id;

  const configDisplay = document.getElementById("config-atual-display");
  if (configDisplay)
    configDisplay.value = item.configuracao || "Sem configuração registrada.";

  modal.classList.remove("hidden");
  document.body.classList.add("modal-open");
};

const toggleCamposDinamicos = () => {
  const tipo = document.getElementById("tipo_acao")?.value;
  const campoUpgrade = document.getElementById("campos-upgrade");
  const campoManutencao = document.getElementById("campos-manutencao");

  if (tipo === "UPGRADE") {
    campoUpgrade?.classList.remove("hidden");
    campoManutencao?.classList.add("hidden");
  } else if (tipo === "MANUTENCAO") {
    campoManutencao?.classList.remove("hidden");
    campoUpgrade?.classList.add("hidden");
  } else {
    campoUpgrade?.classList.add("hidden");
    campoManutencao?.classList.add("hidden");
  }
};

// --- SUBMISSÕES DE FORMS ---

const handleEditSubmit = async (e) => {
  e.preventDefault();
  const form = document.getElementById("edicao-form");
  const formData = new FormData(form);
  const equipamentoId = formData.get("id");
  const feedbackTarget = "feedback-edit-message";

  const data = {};
  for (let [key, value] of formData.entries()) {
    data[key] = value;
  }

  let valorFormatado = data.valor;
  valorFormatado = valorFormatado.replace(/\./g, "").replace(/,/g, ".");
  data.valor = valorFormatado;

  data.data_cadastro = data["edit-data_compra_frontend"];
  delete data["edit-data_compra_frontend"];

  try {
    const response = await fetch(`/api/equipamento/${equipamentoId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const result = await response.json();
    if (response.ok) {
      // ALTERADO: Mensagem fixa conforme solicitado
      showFeedback(
        "Equipamento atualizado com sucesso!",
        "success",
        feedbackTarget
      );
      loadInventario();
      setTimeout(() => {
        closeEditModal();
        viewDetails(equipamentoId);
      }, 2000);
    } else {
      showFeedback(
        result.mensagem || `Falha ao editar.`,
        "error",
        feedbackTarget
      );
    }
  } catch (error) {
    showFeedback("Erro de conexão.", "error", feedbackTarget);
  }
};

const handleTransferSubmit = async (e) => {
  e.preventDefault();
  const form = document.getElementById("transferencia-form");
  const feedbackTarget = "feedback-transfer-message";
  const equipamentoId = document.getElementById(
    "transfer-equipamento-id"
  ).value;

  const equipOriginal = inventarioData.find((item) => item.id == equipamentoId);
  const usuarioAntigo = equipOriginal
    ? equipOriginal.usuario_atual
    : "Não informado";
  const lojaAntiga = equipOriginal ? equipOriginal.loja_atual : "Não informada";

  const usuarioNovo = document
    .getElementById("transfer-usuario_atual")
    .value.trim();
  const lojaNova = document.getElementById("transfer-loja_atual").value.trim();
  const motivoDigitado = document
    .getElementById("transfer-motivo")
    .value.trim();

  if (!usuarioNovo && !lojaNova) {
    showFeedback("Preencha Usuário ou Loja/Setor.", "error", feedbackTarget);
    return;
  }
  if (!motivoDigitado) {
    showFeedback("O motivo é obrigatório.", "error", feedbackTarget);
    return;
  }

  const transferData = {
    usuario_atual: usuarioNovo,
    loja_atual: lojaNova,
    motivo_transferencia: motivoDigitado,
    usuario_anterior: usuarioAntigo,
    loja_anterior: lojaAntiga,
  };

  try {
    const response = await fetch(
      `/api/equipamento/transferir/${equipamentoId}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(transferData),
      }
    );
    const result = await response.json();
    if (response.ok) {
      showFeedback(
        result.mensagem || "Transferência realizada!",
        "success",
        feedbackTarget
      );
      loadInventario();
      setTimeout(() => {
        closeTransferModal();
        viewDetails(equipamentoId);
      }, 2000);
    } else {
      showFeedback(
        result.mensagem || "Falha na transferência.",
        "error",
        feedbackTarget
      );
    }
  } catch (error) {
    showFeedback("Erro de conexão.", "error", feedbackTarget);
  }
};

// --- 3. DETALHES ---

const fetchEquipamentoDetails = async (id) => {
  try {
    const response = await fetch(`/api/equipamento/${id}`);
    if (!response.ok) throw new Error("Item não encontrado.");
    return await response.json();
  } catch (error) {
    console.error(`Erro:`, error);
    return null;
  }
};

const viewDetails = async (id) => {
  const item = await fetchEquipamentoDetails(id);
  if (!item) return;

  document.getElementById("details-modal-overlay")?.remove();
  const modalOverlay = document.createElement("div");
  modalOverlay.id = "details-modal-overlay";
  modalOverlay.className = "modal-overlay";

  const anexosCount = item.anexos ? item.anexos.length : 0;

  modalOverlay.innerHTML = `
    <div class="modal-content large-modal" onclick="event.stopPropagation()">
      <button class="close-btn" onclick="document.getElementById('details-modal-overlay').remove()">&times;</button>
      <h3>Equipamento: ${item.numero_serie || `ID ${item.id}`}</h3>
      
      <div class="tabs-container">
        <div class="tabs-header">
          <button class="tab-button active" onclick="openTab(event, 'tab-detalhes')">Detalhes</button>
          <button class="tab-button" onclick="openTab(event, 'tab-historico')">Histórico</button>
          <button class="tab-button" onclick="openTab(event, 'tab-anexos')">Anexos (${anexosCount})</button>
        </div>

        <div id="tab-detalhes" class="tab-content active">
          ${renderDetailsTab(item)}
          
          <div class="action-buttons-details">
            <button class="btn-details-default btn-edit" onclick="openEditModal(${
              item.id
            })">Editar</button>
            <button class="btn-details-default btn-transfer" onclick="openTransferModal(${
              item.id
            })">Transferir</button>
            <button class="btn-details-default btn-upgrade" onclick="openAcaoTecnicaModal(${
              item.id
            })">Upgrade/Manutenção</button>
            <button class="btn-details-delete btn-delete-action" onclick="excluirEquipamento(${
              item.id
            })">Excluir</button>
          </div>
        </div>

        <div id="tab-historico" class="tab-content">
          ${renderHistoricoTab(item.historico)}
        </div>

        <div id="tab-anexos" class="tab-content">
          ${renderAnexosTab(item.anexos, item.id)}
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(modalOverlay);
  modalOverlay.onclick = (e) => {
    if (e.target.id === "details-modal-overlay") modalOverlay.remove();
  };
  const formAnexo = document.getElementById(`form-add-anexo-${item.id}`);
  if (formAnexo) formAnexo.addEventListener("submit", handleNewAnexoSubmit);
};

const renderDetailsTab = (item) => {
  const dataInclusao = item.data_cadastro
    ? new Date(item.data_cadastro).toLocaleDateString("pt-BR")
    : "N/A";
  const valorFormatado = parseFloat(item.valor || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

  return `
    <table class="details-table">
      <tr>
        <th>Tipo</th><td>${item.tipo_equipamento || "N/A"}</td>
        <th>Usuário Atual</th><td>${item.usuario_atual || "N/A"}</td>
      </tr>
      <tr>
        <th>Modelo</th><td>${item.modelo || "N/A"}</td>
        <th>Loja Atual</th><td>${item.loja_atual || "N/A"}</td>
      </tr>
      <tr>
        <th>Configuração</th><td>${item.configuracao || "Não informada"}</td>
        <th>Empresa Resp.</th><td>${item.empresa_responsavel || "N/A"}</td>
      </tr>
      <tr>
        <th>Nº Série</th><td>${item.numero_serie || "N/A"}</td>
        <th>Tipo de Aquisição</th><td>${item.tipo_aquisicao || "N/A"}</td>
      </tr>
      <tr>
        <th>Nº Patrimônio</th><td>${item.patrimonio || "N/A"}</td>
        <th>Valor</th><td>${valorFormatado}</td>
      </tr>
      <tr>
        <th></th><td></td>
        <th>Data da Inclusão</th><td>${dataInclusao}</td>
      </tr>
      <tr class="obs-row">
        <th>Observações</th>
        <td colspan="3">${
          item.observacoes || "Nenhuma observação registrada."
        }</td>
      </tr>
    </table>
  `;
};

const renderHistoricoTab = (historico) => {
  if (!historico || historico.length === 0)
    return `<p>Nenhum histórico encontrado.</p>`;

  let html = `
    <div class="history-filter-container">
        <label>Filtrar por ação:</label>
        <select class="history-filter-select" onchange="filterHistoryList(this.value)">
            <option value="ALL">Todas</option>
            <option value="TRANSFERENCIA">Transferência</option>
            <option value="UPGRADE">Upgrade</option>
            <option value="MANUTENCAO">Manutenção</option>
            <option value="CADASTRO">Cadastro</option>
        </select>
    </div>
    <div id="history-list-container" style="display: flex; flex-direction: column; gap: 15px; margin-top: 15px;">`;

  const historicoExibicao = [...historico].sort(
    (a, b) => new Date(b.data_registro) - new Date(a.data_registro)
  );

  historicoExibicao.forEach((log) => {
    const dateObj = new Date(log.data_registro);
    const dataStr = dateObj.toLocaleDateString("pt-BR");
    const horaStr = dateObj.toLocaleTimeString("pt-BR");
    const typeClass = log.tipo_acao
      ? log.tipo_acao.trim().toUpperCase()
      : "OUTROS";
    const titulo = `[${dataStr}, ${horaStr}] - ${typeClass}`;

    let conteudoHtml = "";
    if (typeClass === "MANUTENCAO") {
      const valor = parseFloat(log.valor_manutencao || 0).toLocaleString(
        "pt-BR",
        { style: "currency", currency: "BRL" }
      );
      conteudoHtml = `<strong>Motivo:</strong> ${
        log.motivo_manutencao || "Não informado"
      }<br><strong>Descrição:</strong> ${
        log.descricao_detalhada || ""
      }<br><strong>Valor:</strong> ${valor}`;
    } else if (typeClass === "UPGRADE") {
      const detalhes = log.detalhes || "";
      let antiga = "Não registrada",
        nova = "Não registrada";
      if (detalhes.includes(" -> ")) {
        const partes = detalhes.split(" -> ");
        antiga = partes[0];
        nova = partes[1];
      } else {
        nova = detalhes.replace("Upgrade: ", "");
      }
      conteudoHtml = `<strong>Antiga configuração:</strong> ${antiga}<br><strong>Nova configuração:</strong> ${nova}`;
    } else if (typeClass === "TRANSFERENCIA") {
      conteudoHtml = `<strong>De:</strong> ${
        log.usuario_anterior || "N/A"
      } (Loja: ${log.loja_anterior || "N/A"})<br><strong>Para:</strong> ${
        log.usuario_novo || "N/A"
      } (Loja: ${log.loja_nova || "N/A"})`;
      if (log.motivo_transferencia) {
        conteudoHtml += `<br><strong>Motivo:</strong> ${log.motivo_transferencia}`;
      }
    } else {
      conteudoHtml = log.detalhes || "";
    }

    html += `
      <div class="historico-item type-${typeClass}" data-type="${typeClass}" style="margin-bottom: 10px; font-family: monospace, sans-serif; border-left: 4px solid #ccc; padding-left: 10px;">
        <div style="font-weight: bold; margin-bottom: 2px;">${titulo}</div>
        <div style="padding-left: 0;">${conteudoHtml}</div>
      </div>`;
  });
  html += "</div>";
  return html;
};

window.filterHistoryList = (filterVal) => {
  const container = document.getElementById("history-list-container");
  if (!container) return;
  const items = container.getElementsByClassName("historico-item");
  for (let item of items) {
    if (filterVal === "ALL" || item.dataset.type === filterVal) {
      item.style.display = "block";
    } else {
      item.style.display = "none";
    }
  }
};

const renderAnexosTab = (anexos, equipamentoId) => {
  const maxAnexos = 5;
  const currentAnexosCount = anexos ? anexos.length : 0;
  let html = "<h4>Anexos Cadastrados:</h4>";
  if (!anexos || anexos.length === 0) {
    html += "<p>Nenhum anexo encontrado.</p>";
  } else {
    html += '<ul class="anexo-list">';
    anexos.forEach((anexo) => {
      html += `<li><a href="/${anexo.caminho_arquivo}" target="_blank">${
        anexo.nome_arquivo
      }</a> <span style="font-size: 0.8em; color: #777;">(${new Date(
        anexo.data_upload
      ).toLocaleDateString("pt-BR")})</span></li>`;
    });
    html += "</ul>";
  }
  if (currentAnexosCount < maxAnexos) {
    html += `<hr style="margin:15px 0;"><h4>Adicionar Novo (${currentAnexosCount} de ${maxAnexos}):</h4><form id="form-add-anexo-${equipamentoId}"><input type="file" id="new-anexo" name="new-anexo" accept=".pdf,.png,.jpg,.jpeg" required><button type="submit" class="btn-submit" style="margin-top: 10px;">Adicionar</button></form>`;
  } else {
    html += `<hr><p class="limit-reached">Limite máximo atingido.</p>`;
  }
  return html;
};

// --- 4. LISTAGEM E FILTRO ---

const loadInventario = async () => {
  const tbody = document.querySelector("#inventario-table tbody");
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="7">Carregando...</td></tr>';
  try {
    const response = await fetch("/api/equipamento/ativos");
    const data = await response.json();
    inventarioData = data.equipamentos;
    filterInventario();
  } catch (error) {
    tbody.innerHTML = '<tr><td colspan="7">Erro ao carregar dados.</td></tr>';
  }
};

const filterInventario = () => {
  const tbody = document.querySelector("#inventario-table tbody");
  if (!tbody) return;

  const filterTipo =
    document.getElementById("filter-tipo")?.value.toLowerCase() || "";
  const filterSerie =
    document.getElementById("filter-serie")?.value.toLowerCase() || "";
  const filterLoja =
    document.getElementById("filter-loja")?.value.toLowerCase() || "";
  const filterUsuario =
    document.getElementById("filter-usuario")?.value.toLowerCase() || "";
  const filterFornecedor =
    document.getElementById("filter-fornecedor")?.value.toLowerCase() || "";

  const filteredData = inventarioData.filter((item) => {
    return (
      (item.tipo_equipamento?.toLowerCase() || "").includes(filterTipo) &&
      (item.numero_serie?.toLowerCase() || "").includes(filterSerie) &&
      (item.loja_atual?.toLowerCase() || "").includes(filterLoja) &&
      (item.usuario_atual?.toLowerCase() || "").includes(filterUsuario) &&
      (item.empresa_responsavel?.toLowerCase() || "").includes(filterFornecedor)
    );
  });

  tbody.innerHTML = "";
  if (filteredData.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="7">Nenhum equipamento encontrado.</td></tr>';
    return;
  }

  filteredData.forEach((item) => {
    const row = tbody.insertRow();
    row.classList.add("clickable-row");
    row.dataset.id = item.id;
    row.onclick = () => viewDetails(item.id);
    row.insertCell().textContent = item.tipo_equipamento || "N/A";
    row.insertCell().textContent = item.modelo || "N/A";
    row.insertCell().textContent = item.numero_serie || "N/A";
    row.insertCell().textContent = item.patrimonio || "N/A";
    row.insertCell().textContent = item.loja_atual || "N/A";
    row.insertCell().textContent = item.usuario_atual || "N/A";
    row.insertCell().textContent = item.empresa_responsavel || "N/A";
  });
};

// --- 5. INICIALIZAÇÃO ---

document.addEventListener("DOMContentLoaded", () => {
  injectTrashIcon();
  const cadastroForm = document.getElementById("cadastro-equipamento-form");
  const edicaoForm = document.getElementById("edicao-form");
  const transferenciaForm = document.getElementById("transferencia-form");
  const acaoTecnicaForm = document.getElementById("manutencao-form");

  if (cadastroForm) {
    cadastroForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const tipoAquisicaoSelect = document.getElementById("tipo_aquisicao");
      if (tipoAquisicaoSelect && tipoAquisicaoSelect.value === "") {
        showFeedback(
          "Selecione o Tipo de Aquisição.",
          "error",
          "feedback-modal-message"
        );
        return;
      }
      const formData = new FormData(cadastroForm);
      const dataCompra = formData.get("data_comp_frontend");
      if (dataCompra) formData.append("data_cadastro", dataCompra);
      formData.delete("data_comp_frontend");
      let valorFormatado = formData
        .get("valor")
        .replace(/\./g, "")
        .replace(/,/g, ".");
      formData.set("valor", valorFormatado);

      try {
        const response = await fetch("/api/equipamento/cadastro", {
          method: "POST",
          body: formData,
        });
        const result = await response.json();
        if (response.ok) {
          showFeedback(
            `EQUIPAMENTO INCLUÍDO`,
            "success",
            "feedback-modal-message"
          );
          cadastroForm.reset();
          document.getElementById("valor").value = "0,00";
          loadInventario();
          setTimeout(closeCadastroModal, 2000);
        } else {
          showFeedback(
            result.mensagem || "Erro.",
            "error",
            "feedback-modal-message"
          );
        }
      } catch (error) {
        showFeedback("Erro de conexão.", "error", "feedback-modal-message");
      }
    });
  }

  if (edicaoForm) edicaoForm.addEventListener("submit", handleEditSubmit);
  if (transferenciaForm)
    transferenciaForm.addEventListener("submit", handleTransferSubmit);

  document
    .getElementById("tipo_acao")
    ?.addEventListener("change", toggleCamposDinamicos);

  if (acaoTecnicaForm) {
    acaoTecnicaForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const feedbackTarget = "feedback-manutencao-message";
      const id = document.getElementById("manutencao-equipamento-id").value;
      const tipo = document.getElementById("tipo_acao").value;
      const valorRaw =
        document.getElementById("valor-manutencao-input")?.value || "0,00";
      const valorTratado = valorRaw.replace(/\./g, "").replace(/,/g, ".");

      const data = {
        tipo: tipo,
        novaConfiguracao: document.getElementById("nova-config")?.value,
        descricao: document.getElementById("desc-manutencao")?.value,
        motivo: document.getElementById("motivo-manutencao")?.value,
        dataProxima: document.getElementById("acao-data-proxima").value,
        valor: valorTratado,
      };

      try {
        const response = await fetch(`/api/equipamento/acao-tecnica/${id}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        const result = await response.json();
        if (response.ok) {
          showFeedback(
            "AÇÃO REGISTRADA COM SUCESSO!",
            "success",
            feedbackTarget
          );
          loadInventario();
          setTimeout(() => {
            closeAcaoTecnicaModal();
            viewDetails(id);
          }, 2000);
        } else {
          showFeedback(
            result.mensagem || "Erro ao registrar ação.",
            "error",
            feedbackTarget
          );
        }
      } catch (error) {
        showFeedback("Erro de conexão.", "error", feedbackTarget);
      }
    });
  }

  document
    .getElementById("edit-tipo_aquisicao")
    ?.addEventListener("change", () => toggleDataCompra("edicao-modal"));
  document
    .getElementById("tipo_aquisicao")
    ?.addEventListener("change", () => toggleDataCompra("cadastro-modal"));

  loadInventario();

  window.openModal = openCadastroModal;
  window.closeModal = closeCadastroModal;
  window.excluirEquipamento = excluirEquipamento;
  window.viewDetails = viewDetails;
  window.toggleDataCompra = toggleDataCompra;
  window.handleNewAnexoSubmit = handleNewAnexoSubmit;
  window.filterInventario = filterInventario;
  window.formatCurrency = formatCurrency;
  window.openEditModal = openEditModal;
  window.openTransferModal = openTransferModal;
  window.closeEditModal = closeEditModal;
  window.closeTransferModal = closeTransferModal;
  window.openAcaoTecnicaModal = openAcaoTecnicaModal;
  window.closeAcaoTecnicaModal = closeAcaoTecnicaModal;
  window.toggleCamposDinamicos = toggleCamposDinamicos;
  window.closeManutencaoModal = closeAcaoTecnicaModal;
  window.filterHistoryList = filterHistoryList;
});
