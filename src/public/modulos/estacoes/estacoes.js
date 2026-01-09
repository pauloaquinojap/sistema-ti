// 1. Inicializar Zoom e Pan
const canvas = document.getElementById("map-canvas");
const panzoom = Panzoom(canvas, {
  maxScale: 3,
  minScale: 0.3,
  contain: "outside",
});

canvas.parentElement.addEventListener("wheel", panzoom.zoomWithWheel);

// --- CORREÇÃO DE ZOOM: Reposicionar e Redimensionar as linhas ---
canvas.addEventListener("panzoomchange", (e) => {
  if (window.todasAsLinhas) {
    const scale = panzoom.getScale(); // Pega o nível de zoom atual
    requestAnimationFrame(() => {
      window.todasAsLinhas.forEach((linha) => {
        try {
          // Atualiza a grossura da linha baseado no zoom
          linha.size = 3 * scale;
          // Recalcula a posição
          linha.position();
        } catch (e) {
          console.warn("Erro ao reposicionar linha:", e);
        }
      });
    });
  }
});

function zoomIn() {
  panzoom.zoomIn();
}
function zoomOut() {
  panzoom.zoomOut();
}
function resetZoom() {
  panzoom.reset();
}

// 2. Configurações de Cabos
const configsCabos = {
  REDE: { color: "#27ae60", label: "REDE LAN" },
  HDMI: { color: "#e67e22", label: "CABO HDMI" },
  VGA: { color: "#3498db", label: "CONEXÃO VGA" },
  FORCA: { color: "#e74c3c", label: "ENERGIA" },
};

let tipoCaboAtual = "REDE";
let selecionadoParaCabo = null;
let modoCaboAtivo = false;

function setLineType(tipo) {
  tipoCaboAtual = tipo;
  modoCaboAtivo = true;
  if (selecionadoParaCabo) {
    document
      .getElementById(`item-${selecionadoParaCabo}`)
      ?.classList.remove("selecionado-cabo");
  }
  selecionadoParaCabo = null;
  document
    .querySelectorAll(".btn-cable")
    .forEach((btn) => btn.classList.remove("active"));
  const btnAtivo = document.getElementById(`btn-${tipo}`);
  if (btnAtivo) btnAtivo.classList.add("active");
}

function desativarModoCabo() {
  modoCaboAtivo = false;
  selecionadoParaCabo = null;
  document
    .querySelectorAll(".map-element")
    .forEach((el) => el.classList.remove("selecionado-cabo"));
  document
    .querySelectorAll(".btn-cable")
    .forEach((btn) => btn.classList.remove("active"));
}

// --- EXCLUSÃO ---
async function apagarItem(id, el) {
  if (!confirm("Remover este item e suas conexões do mapa?")) return;
  try {
    const response = await fetch(`/api/estacoes/excluir/${id}`, {
      method: "DELETE",
    });
    const resData = await response.json();
    if (resData.success) {
      if (window.todasAsLinhas) {
        window.todasAsLinhas = window.todasAsLinhas.filter((linha) => {
          if (linha.start === el || linha.end === el) {
            linha.remove();
            return false;
          }
          return true;
        });
      }
      el.remove();
    }
  } catch (err) {
    console.error("Erro ao excluir:", err);
  }
}

// --- RENDERIZAÇÃO ---
function renderizarElemento(id, info) {
  const div = document.createElement("div");
  div.id = `item-${id}`;
  div.className = "map-element";
  div.setAttribute("data-tipo", info.tipo_item);

  div.addEventListener("contextmenu", (e) => {
    e.preventDefault();
    e.stopPropagation();
    apagarItem(id, div);
  });

  if (info.tipo_item === "BASE") {
    div.classList.add("mesa-container");
    div.style.left = `${info.x}px`;
    div.style.top = `${info.y}px`;
    div.innerHTML = `<div class="mesa-label">${info.label_mapa}</div><div class="mesa-slots"></div>`;
    canvas.appendChild(div);
    tornarElementoMovel(div, id);
  } else {
    div.innerHTML = `<i class="fa-solid ${info.icone_classe}"></i><span>${info.label_mapa}</span>`;
    div.onclick = (e) => {
      e.stopPropagation();
      if (modoCaboAtivo) handleConexaoCabo(id);
    };

    if (info.base_pai_id) {
      const mesa = document.getElementById(`item-${info.base_pai_id}`);
      if (mesa) {
        mesa.querySelector(".mesa-slots").appendChild(div);
        div.style.position = "relative";
      }
    } else {
      div.style.left = `${info.x}px`;
      div.style.top = `${info.y}px`;
      canvas.appendChild(div);
      tornarElementoMovel(div, id);
    }
  }
}

function handleConexaoCabo(id) {
  const el = document.getElementById(`item-${id}`);
  if (!selecionadoParaCabo) {
    selecionadoParaCabo = id;
    el.classList.add("selecionado-cabo");
  } else {
    if (selecionadoParaCabo !== id) {
      conectarEstacoes(`item-${selecionadoParaCabo}`, `item-${id}`);
    }
    const anterior = document.getElementById(`item-${selecionadoParaCabo}`);
    if (anterior) anterior.classList.remove("selecionado-cabo");
    selecionadoParaCabo = null;
  }
}

async function carregarConexoes() {
  try {
    const resp = await fetch("/api/estacoes/conexoes");
    const conexoes = await resp.json();
    conexoes.forEach((con) => {
      conectarEstacoes(
        `item-${con.origem_id}`,
        `item-${con.destino_id}`,
        con.tipo_cabo,
        false
      );
    });
  } catch (err) {
    console.error("Erro ao carregar conexões:", err);
  }
}

async function conectarEstacoes(
  idOrigem,
  idDestino,
  tipoCabo = tipoCaboAtual,
  salvarNoBanco = true
) {
  const config = configsCabos[tipoCabo];
  const el1 = document.getElementById(idOrigem);
  const el2 = document.getElementById(idDestino);
  if (!el1 || !el2) return;

  const initialScale = panzoom.getScale();

  const linha = new LeaderLine(el1, el2, {
    color: config.color,
    size: 3 * initialScale,
    path: "grid",
    startPlug: "disc",
    endPlug: "arrow",
    // AJUSTE CRÍTICO: Move o SVG da linha para dentro do container do mapa
    parent: document.getElementById("canvas-container"),
    label: LeaderLine.captionLabel(config.label, {
      color: config.color,
      fontSize: 10,
      fontWeight: "bold",
      outlineColor: "#ffffff",
    }),
  });

  if (!window.todasAsLinhas) window.todasAsLinhas = [];
  window.todasAsLinhas.push(linha);

  if (salvarNoBanco) {
    await fetch("/api/estacoes/conectar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        origem_id: idOrigem.replace("item-", ""),
        destino_id: idDestino.replace("item-", ""),
        tipo_cabo: tipoCabo,
      }),
    });
  }
}

function tornarElementoMovel(el, id) {
  let isDragging = false;
  el.onmousedown = (e) => {
    if (e.button !== 0 || e.target.tagName === "I") return;
    isDragging = true;
    const scale = panzoom.getScale();
    let startX = e.clientX;
    let startY = e.clientY;

    document.onmousemove = (e) => {
      if (!isDragging) return;
      const dx = (e.clientX - startX) / scale;
      const dy = (e.clientY - startY) / scale;
      el.style.left = `${(parseFloat(el.style.left) || 0) + dx}px`;
      el.style.top = `${(parseFloat(el.style.top) || 0) + dy}px`;
      startX = e.clientX;
      startY = e.clientY;
      if (window.todasAsLinhas) {
        window.todasAsLinhas.forEach((l) => {
          l.position();
        });
      }
    };

    document.onmouseup = async () => {
      if (!isDragging) return;
      isDragging = false;
      document.onmousemove = null;
      await fetch("/api/estacoes/update-posicao", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          x: parseFloat(el.style.left),
          y: parseFloat(el.style.top),
        }),
      });
    };
  };
}

document.addEventListener("DOMContentLoaded", async () => {
  modoCaboAtivo = false;
  const resp = await fetch("/api/estacoes");
  const itens = await resp.json();
  itens.forEach((item) => {
    renderizarElemento(item.id, {
      x: item.pos_x,
      y: item.pos_y,
      icone_classe: item.icone_classe,
      label_mapa: item.patrimonio || item.label_mapa,
      tipo_item: item.tipo_item,
      base_pai_id: item.base_pai_id,
    });
  });
  await carregarConexoes();
});
