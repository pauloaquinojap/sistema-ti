// fornecedor.js
let todosFornecedores = [];
let currentFornecedorId = null;
let filtroStatus = "ativos"; // padrão

// =========================================================================
// 1. INICIALIZAÇÃO E EVENTOS
// =========================================================================
document.addEventListener("DOMContentLoaded", () => {
  loadFornecedores();
  aplicarMascaras();

  // Busca na tabela
  document.getElementById("input-busca")?.addEventListener("keyup", (e) => {
    filtrarTabela(e.target.value);
  });

  // Gatilho BrasilAPI ao sair do campo CNPJ
  document.getElementById("cnpj-cadastro")?.addEventListener("blur", (e) => {
    const tipoElement = document.querySelector(
      'input[name="tipo_pessoa"]:checked'
    );
    const tipo = tipoElement ? tipoElement.value : "PJ";
    // Evita sobrescrever se estiver editando (pois o usuário pode estar apenas corrigindo outro dado)
    const isEditing = document.getElementById("fornecedor-id").value !== "";
    if (tipo === "PJ" && !isEditing) buscarCNPJ(e.target.value);
  });

  // Lógica do Input de Arquivo (Visualização do nome)
  const fileInput = document.getElementById("arquivo-fornecedor");
  const fileNameDisplay = document.getElementById("file-name-display");
  const btnRemoveFile = document.getElementById("btn-remove-file");

  fileInput?.addEventListener("change", function () {
    if (this.files.length > 0) {
      fileNameDisplay.textContent = this.files[0].name;
      btnRemoveFile.classList.remove("hidden");
    }
  });

  btnRemoveFile?.addEventListener("click", () => {
    if (fileInput) fileInput.value = "";
    if (fileNameDisplay)
      fileNameDisplay.textContent = "Nenhum arquivo selecionado";
    btnRemoveFile.classList.add("hidden");
  });
});

// =========================================================================
// 2. CONTROLE DE MODAIS E FORMULÁRIO
// =========================================================================
function openCadastroModal() {
  const form = document.getElementById("cadastro-fornecedor-form");
  if (form) form.reset();

  // Limpa o ID oculto para o sistema saber que é um NOVO registro
  const idInput = document.getElementById("fornecedor-id");
  if (idInput) idInput.value = "";

  // Ajusta o título
  const modalTitle = document.querySelector("#cadastroModal h2");
  if (modalTitle) modalTitle.textContent = "➕ Cadastrar Novo Fornecedor";

  // Reset visual do arquivo
  document.getElementById("file-name-display").textContent =
    "Nenhum arquivo selecionado";
  document.getElementById("btn-remove-file").classList.add("hidden");

  document.getElementById("cadastroModal").classList.remove("hidden");
}

function closeCadastroModal() {
  const modal = document.getElementById("cadastroModal");
  const form = document.getElementById("cadastro-fornecedor-form");
  modal.classList.add("hidden");
  form.reset();

  // Reset visual
  const razaoInput = document.getElementById("razao_social-cadastro");
  if (razaoInput) {
    razaoInput.placeholder = "";
    razaoInput.disabled = false;
  }
  document.getElementById("file-name-display").textContent =
    "Nenhum arquivo selecionado";
  document.getElementById("btn-remove-file").classList.add("hidden");

  if (window.toggleTipoPessoa) window.toggleTipoPessoa("PJ");
}

// SUBMIT DO FORMULÁRIO (ATUALIZADO PARA SUPORTAR EDIÇÃO)
document
  .getElementById("cadastro-fornecedor-form")
  ?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const form = e.target;
    const submitBtn = form.querySelector('button[type="submit"]');

    // VERIFICAÇÃO SE É EDIÇÃO OU NOVO
    const fornecedorId = document.getElementById("fornecedor-id").value;
    const isEditing = fornecedorId && fornecedorId !== "";

    submitBtn.disabled = true;
    submitBtn.textContent = "Salvando...";

    const formData = new FormData(form);

    try {
      // Se tiver ID, usa rota de edição (PUT), se não, usa cadastro (POST)
      const url = isEditing
        ? `/api/fornecedor/${fornecedorId}`
        : "/api/fornecedor/cadastro";
      const method = isEditing ? "PUT" : "POST";

      const response = await fetch(url, {
        method: method,
        body: formData,
      });

      const resultado = await response.json();

      if (response.ok) {
        alert(resultado.message || "Operação realizada com sucesso!");
        closeCadastroModal();
        loadFornecedores();
      } else {
        alert("Erro: " + (resultado.message || "Erro desconhecido"));
      }
    } catch (err) {
      console.error("Erro de conexão:", err);
      alert("Erro de conexão ao salvar.");
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "Salvar Fornecedor";
    }
  });

// =========================================================================
// 3. MÁSCARAS E INTEGRAÇÕES
// =========================================================================
function aplicarMascaras() {
  document.getElementById("cnpj-cadastro")?.addEventListener("input", (e) => {
    let v = e.target.value.replace(/\D/g, "");
    const tipo =
      document.querySelector('input[name="tipo_pessoa"]:checked')?.value ||
      "PJ";
    if (tipo === "PJ") {
      v = v
        .replace(/^(\d{2})(\d)/, "$1.$2")
        .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
        .replace(/\.(\d{3})(\d)/, ".$1/$2")
        .replace(/(\d{4})(\d)/, "$1-$2");
    } else {
      v = v
        .replace(/(\d{3})(\d)/, "$1.$2")
        .replace(/(\d{3})(\d)/, "$1.$2")
        .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
    }
    e.target.value = v;
  });

  document
    .getElementById("celular_whatsapp-cadastro")
    ?.addEventListener("input", (e) => {
      let v = e.target.value.replace(/\D/g, "");
      v = v
        .replace(/^(\d{2})(\d)/g, "($1) $2")
        .replace(/(\d)(\d{4})$/, "$1-$2");
      e.target.value = v;
    });

  document.getElementById("cep-cadastro")?.addEventListener("input", (e) => {
    let v = e.target.value.replace(/\D/g, "");
    v = v.replace(/(\d{5})(\d)/, "$1-$2");
    e.target.value = v;
  });
}

async function buscarCNPJ(cnpjOriginal) {
  const cnpj = cnpjOriginal.replace(/\D/g, "");
  if (cnpj.length !== 14) return;

  const razaoInput = document.getElementById("razao_social-cadastro");
  razaoInput.placeholder = "Buscando dados na Receita...";
  razaoInput.disabled = true;

  try {
    const response = await fetch(
      `https://brasilapi.com.br/api/cnpj/v1/${cnpj}`
    );
    const data = await response.json();

    if (response.ok) {
      document.getElementById("razao_social-cadastro").value =
        data.razao_social || "";
      document.getElementById("nome_fantasia-cadastro").value =
        data.nome_fantasia || "";
      if (data.cnae_fiscal) {
        document.getElementById("cnae-cadastro").value = `${
          data.cnae_fiscal
        } - ${data.cnae_fiscal_descricao || ""}`;
      }
      document.getElementById("cep-cadastro").value = data.cep || "";
      document.getElementById("logradouro-cadastro").value =
        data.logradouro || "";
      document.getElementById("numero-cadastro").value = data.numero || "";
      document.getElementById("complemento-cadastro").value =
        data.complemento || "";
      document.getElementById("bairro-cadastro").value = data.bairro || "";
      document.getElementById("cidade-cadastro").value = data.municipio || "";
      document.getElementById("estado_uf-cadastro").value = data.uf || "";
      document.getElementById("data_abertura-cadastro").value =
        data.data_inicio_atividade || "";
      document.getElementById("natureza_juridica-cadastro").value =
        data.natureza_juridica || "";
      document.getElementById("email_principal-cadastro").value =
        data.email || "";
    }
  } catch (error) {
    console.error("Erro na busca de CNPJ", error);
  } finally {
    razaoInput.placeholder = "";
    razaoInput.disabled = false;
  }
}

window.toggleTipoPessoa = function (tipo) {
  const isPJ = tipo === "PJ";
  const displayPJ = isPJ ? "block" : "none";

  document.getElementById("cnpj-label").innerText = isPJ ? "CNPJ:" : "CPF:";
  document.getElementById("razao_social-label").innerText = isPJ
    ? "Razão Social:"
    : "Nome Completo:";
  document.getElementById("label-data").innerText = isPJ
    ? "Data Abertura:"
    : "Data Nascimento:";

  const cnpjInput = document.getElementById("cnpj-cadastro");
  // Só limpa se não estiver editando para não perder o dado carregado
  if (!document.getElementById("fornecedor-id").value) {
    cnpjInput.value = "";
  }
  cnpjInput.placeholder = isPJ ? "00.000.000/0000-00" : "000.000.000-00";
  cnpjInput.maxLength = isPJ ? 18 : 14;

  [
    "nome_fantasia-group",
    "ie-group",
    "im-group",
    "cnae-group",
    "natureza-group",
  ].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.style.display = displayPJ;
  });
};

// =========================================================================
// 4. TABELA E DETALHES
// =========================================================================
async function loadFornecedores() {
  const tbody = document.getElementById("fornecedores-table-body");
  tbody.innerHTML = "<tr><td colspan='5'>Carregando...</td></tr>";

  try {
    const url =
      filtroStatus === "ativos"
        ? "/api/fornecedor/ativos"
        : "/api/fornecedor/inativos";

    const res = await fetch(url);
    const data = await res.json();

    renderTable(data);
  } catch (error) {
    tbody.innerHTML =
      "<tr><td colspan='5'>Erro ao carregar fornecedores.</td></tr>";
  }
}

function renderTable(lista) {
  const tbody = document.getElementById("fornecedores-table-body");
  tbody.innerHTML = "";

  if (lista.length === 0) {
    tbody.innerHTML =
      "<tr><td colspan='5'>Nenhum fornecedor encontrado.</td></tr>";
    return;
  }

  lista.forEach((f) => {
    const tr = document.createElement("tr");
    tr.style.cursor = "pointer";
    tr.onclick = () => abrirDetalhesFornecedor(f.id);

    tr.innerHTML = `
            <td>${f.cnpj || "-"}</td>
            <td><strong>${f.razao_social}</strong></td>
            <td>${f.nome_responsavel || "-"}</td>
            <td>${f.celular_whatsapp || "-"}</td>
            <td>${f.email || f.email_principal || "-"}</td>
        `;
    tbody.appendChild(tr);
  });
}

async function abrirDetalhesFornecedor(id) {
  currentFornecedorId = id;
  try {
    const response = await fetch(`/api/fornecedor/${id}`);
    const f = await response.json();

    if (response.ok) {
      const container = document.getElementById("detalhes-container");

      const anexoHtml = f.anexo_url
        ? `<a href="/uploads-fornecedor/${f.anexo_url}" target="_blank" class="btn-primary" style="text-decoration:none; padding: 10px 20px; border-radius:4px; display: inline-block;">📄 Visualizar Documento / Anexo</a>`
        : '<span style="color:#999; font-style: italic;">Nenhum documento anexado</span>';

      container.innerHTML = `
        <h3 class="section-title">🏢 Dados Empresariais</h3>
        <div class="detalhes-grid">
          <div class="info-box"><strong>CNPJ:</strong><p>${
            f.cnpj || "-"
          }</p></div>
          <div class="info-box"><strong>Razão Social:</strong><p>${
            f.razao_social || "-"
          }</p></div>
          <div class="info-box"><strong>Nome Fantasia:</strong><p>${
            f.nome_fantasia || "-"
          }</p></div>
          <div class="info-box"><strong>Inscrição Estadual:</strong><p>${
            f.inscricao_estadual || "-"
          }</p></div>
          <div class="info-box"><strong>Inscrição Municipal:</strong><p>${
            f.inscricao_municipal || "-"
          }</p></div>
          <div class="info-box"><strong>CNAE:</strong><p>${
            f.cnae || "-"
          }</p></div>
          <div class="info-box"><strong>Data Abertura:</strong><p>${
            f.data_abertura
              ? new Date(f.data_abertura).toLocaleDateString("pt-BR")
              : "-"
          }</p></div>
          <div class="info-box"><strong>Natureza Jurídica:</strong><p>${
            f.natureza_juridica || "-"
          }</p></div>
        </div>

        <h3 class="section-title">📍 Endereço</h3>
        <div class="detalhes-grid">
          <div class="info-box"><strong>CEP:</strong><p>${
            f.cep || "-"
          }</p></div>
          <div class="info-box"><strong>Logradouro:</strong><p>${
            f.logradouro || "-"
          }</p></div>
          <div class="info-box"><strong>Número:</strong><p>${
            f.numero || "-"
          }</p></div>
          <div class="info-box"><strong>Complemento:</strong><p>${
            f.complemento || "-"
          }</p></div>
          <div class="info-box"><strong>Bairro:</strong><p>${
            f.bairro || "-"
          }</p></div>
          <div class="info-box"><strong>Cidade:</strong><p>${
            f.cidade || "-"
          }</p></div>
          <div class="info-box"><strong>UF:</strong><p>${
            f.estado_uf || "-"
          }</p></div>
        </div>

        <h3 class="section-title">📞 Contato e Responsável</h3>
        <div class="detalhes-grid">
          <div class="info-box"><strong>Nome Responsável:</strong><p>${
            f.nome_responsavel || "-"
          }</p></div>
          <div class="info-box"><strong>Cargo:</strong><p>${
            f.cargo_responsavel || "-"
          }</p></div>
          <div class="info-box"><strong>Tel. Fixo:</strong><p>${
            f.telefone_fixo || "-"
          }</p></div>
          <div class="info-box"><strong>Celular/Zap:</strong><p>${
            f.celular_whatsapp || "-"
          }</p></div>
          <div class="info-box"><strong>Email Principal:</strong><p>${
            f.email_principal || f.email || "-"
          }</p></div>
          <div class="info-box"><strong>Email Financeiro:</strong><p>${
            f.email_financeiro || "-"
          }</p></div>
        </div>

        <h3 class="section-title">📝 Observações</h3>
        <div class="info-box" style="grid-column: span 2; width: 100%; min-height: 60px; border-left: 3px solid #ccc;">
          <p style="white-space: pre-wrap;">${
            f.observacoes || "Sem observações."
          }</p>
        </div>

        <div style="margin-top:20px; background:#f0f7ff; padding:15px; border-radius:8px; border: 1px dashed var(--primary-color);">
            <strong>📎 Documentação / Anexo:</strong><br><br>
            ${anexoHtml}
        </div>
      `;

      const btnEditar = document.getElementById("btn-editar-final");
      if (btnEditar) {
        btnEditar.onclick = () => prepararEdicao();
      }

      document.getElementById("modalDetalhes").classList.remove("hidden");
    }
  } catch (err) {
    console.error("Erro ao abrir detalhes:", err);
    alert("Erro ao carregar detalhes.");
  }
}

// =========================================================================
// 5. DESCONTINUAÇÃO
// =========================================================================
function closeModalDetalhes() {
  document.getElementById("modalDetalhes").classList.add("hidden");
}
function abrirModalDescontinuar() {
  document.getElementById("modalDescontinuar").classList.remove("hidden");
}
function fecharModalDescontinuar() {
  document.getElementById("modalDescontinuar").classList.add("hidden");
}

async function executarDescontinuacao() {
  const dataValue = document.getElementById("data_descontinuacao_input").value;
  if (!dataValue) return alert("Selecione a data!");
  if (!confirm("Confirmar descontinuação?")) return;

  try {
    const response = await fetch(`/api/fornecedor/${currentFornecedorId}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data_descontinuacao: dataValue }),
    });

    if (response.ok) {
      alert("Fornecedor descontinuado!");
      fecharModalDescontinuar();
      closeModalDetalhes();
      loadFornecedores();
    }
  } catch (err) {
    alert("Erro ao descontinuar.");
  }
}

// =========================================================================
// 6. EDIÇÃO DE FORNECEDOR (PREENCHIMENTO)
// =========================================================================
async function prepararEdicao() {
  if (!currentFornecedorId) return;

  try {
    // Busca dados completos do servidor (garante que tudo está atualizado)
    const response = await fetch(`/api/fornecedor/${currentFornecedorId}`);
    const fornecedor = await response.json();

    if (!response.ok || !fornecedor) {
      alert("Erro ao buscar dados do fornecedor para edição.");
      return;
    }

    // Preenche o ID oculto (essencial para o submit saber que é PUT)
    document.getElementById("fornecedor-id").value = fornecedor.id;

    document.getElementById("cnpj-cadastro").value = fornecedor.cnpj || "";
    document.getElementById("razao_social-cadastro").value =
      fornecedor.razao_social || "";
    document.getElementById("nome_fantasia-cadastro").value =
      fornecedor.nome_fantasia || "";
    document.getElementById("inscricao_estadual-cadastro").value =
      fornecedor.inscricao_estadual || "";
    document.getElementById("inscricao_municipal-cadastro").value =
      fornecedor.inscricao_municipal || "";
    document.getElementById("cnae-cadastro").value = fornecedor.cnae || "";

    // Tratamento de data para input date (YYYY-MM-DD)
    if (fornecedor.data_abertura) {
      document.getElementById("data_abertura-cadastro").value =
        fornecedor.data_abertura.split("T")[0];
    }

    document.getElementById("natureza_juridica-cadastro").value =
      fornecedor.natureza_juridica || "";

    document.getElementById("cep-cadastro").value = fornecedor.cep || "";
    document.getElementById("logradouro-cadastro").value =
      fornecedor.logradouro || "";
    document.getElementById("numero-cadastro").value = fornecedor.numero || "";
    document.getElementById("complemento-cadastro").value =
      fornecedor.complemento || "";
    document.getElementById("bairro-cadastro").value = fornecedor.bairro || "";
    document.getElementById("cidade-cadastro").value = fornecedor.cidade || "";
    document.getElementById("estado_uf-cadastro").value =
      fornecedor.estado_uf || "";

    document.getElementById("nome_responsavel-cadastro").value =
      fornecedor.nome_responsavel || "";
    document.getElementById("cargo_responsavel-cadastro").value =
      fornecedor.cargo_responsavel || "";
    document.getElementById("telefone_fixo-cadastro").value =
      fornecedor.telefone_fixo || "";
    document.getElementById("celular_whatsapp-cadastro").value =
      fornecedor.celular_whatsapp || "";
    document.getElementById("email_principal-cadastro").value =
      fornecedor.email_principal || "";
    document.getElementById("email_financeiro-cadastro").value =
      fornecedor.email_financeiro || "";
    document.getElementById("observacoes-cadastro").value =
      fornecedor.observacoes || "";

    const modalTitle = document.querySelector("#cadastroModal h2");
    if (modalTitle) modalTitle.textContent = "✏️ Editar Fornecedor";

    // Mostra o nome do arquivo se existir
    if (fornecedor.anexo_url) {
      document.getElementById("file-name-display").textContent =
        "Anexo atual: " + fornecedor.anexo_url;
    }

    closeModalDetalhes();
    document.getElementById("cadastroModal").classList.remove("hidden");
  } catch (err) {
    console.error("Erro ao preparar edição:", err);
    alert("Erro de conexão ao carregar dados.");
  }
}

function filtrarTabela(termo) {
  const filtrados = todosFornecedores.filter(
    (f) =>
      f.razao_social.toLowerCase().includes(termo.toLowerCase()) ||
      f.cnpj.includes(termo)
  );
  renderTable(filtrados);
}
// status

function toggleStatusFiltro() {
  const toggle = document.getElementById("status-toggle");
  const ativo = document.getElementById("label-ativo");
  const inativo = document.getElementById("label-inativo");

  if (filtroStatus === "ativos") {
    filtroStatus = "inativos";
    toggle.classList.add("inativo");
    ativo.classList.remove("active");
    inativo.classList.add("active");
  } else {
    filtroStatus = "ativos";
    toggle.classList.remove("inativo");
    inativo.classList.remove("active");
    ativo.classList.add("active");
  }

  loadFornecedores(); // recarrega a tabela
}
