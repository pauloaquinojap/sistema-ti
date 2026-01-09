/**
 * RELATORIOS.JS
 * Lógica para controle da Central de Relatórios
 */

// 1. Função principal disparada pelos cards
function gerarRelatorio(tipo) {
  if (tipo === "inventario_geral") {
    abrirModalFiltro();
  } else {
    // Implementação futura para outros cards
    alert(
      "Este relatório ( " +
        tipo +
        " ) está em fase de desenvolvimento e será liberado em breve."
    );
  }
}

// 2. Controle do Modal de Filtros
function abrirModalFiltro() {
  const modal = document.getElementById("modal-filtro-inventario");
  modal.classList.remove("hidden");

  // Resetar o formulário ao abrir para limpar filtros anteriores
  document.getElementById("form-filtro-inventario").reset();
}

function fecharModalFiltro() {
  const modal = document.getElementById("modal-filtro-inventario");
  modal.classList.add("hidden");
}

// 3. Processamento e Envio para o Back-end
async function processarRelatorioInventario() {
  const form = document.getElementById("form-filtro-inventario");
  const formData = new FormData(form);

  // Criar objeto de parâmetros para a URL (Query Strings)
  const params = new URLSearchParams();

  for (const [key, value] of formData.entries()) {
    if (value && value !== "") {
      params.append(key, value);
    }
  }

  // Exibe no console para conferência do desenvolvedor
  console.log("Filtros selecionados:", params.toString());

  /**
   * IMPORTANTE:
   * Aqui enviamos o usuário para a rota do servidor que gera o PDF ou Excel.
   * O '_blank' abre em uma nova aba para que o sistema não feche.
   */
  const urlFinal = `/api/relatorios/inventario-pdf?${params.toString()}`;

  // Notificação visual simples
  const btn = document.querySelector("#form-filtro-inventario .btn-submit");
  const originalText = btn.innerHTML;

  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Gerando...';
  btn.style.backgroundColor = "#95a5a6";
  btn.disabled = true;

  // Simula um pequeno delay antes de abrir (opcional, para feedback visual)
  setTimeout(() => {
    window.open(urlFinal, "_blank");

    // Volta o botão ao normal e fecha o modal
    btn.innerHTML = originalText;
    btn.style.backgroundColor = "#27ae60";
    btn.disabled = false;
    fecharModalFiltro();
  }, 1000);
}

// 4. Fechar modal ao clicar fora da caixa branca
window.onclick = function (event) {
  const modal = document.getElementById("modal-filtro-inventario");
  if (event.target == modal) {
    fecharModalFiltro();
  }
};

// 5. Atalho Tecla ESC para fechar modal
document.addEventListener("keydown", function (event) {
  if (event.key === "Escape") {
    fecharModalFiltro();
  }
});
