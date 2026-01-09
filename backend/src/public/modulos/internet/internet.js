document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("cadastro-internet-form");
  const feedback = document.getElementById("feedback-message");
  const listaMonitoramento = document.getElementById("lista-monitoramento");

  const showFeedback = (message, type) => {
    feedback.textContent = message;
    feedback.className = type;
    feedback.classList.remove("hidden");
    setTimeout(() => feedback.classList.add("hidden"), 5000);
  };

  // --- NOVA FUNÇÃO: BUSCAR E EXIBIR LINKS ---
  const carregarMonitoramento = async () => {
    try {
      const response = await fetch("/api/internet/ativos");
      const result = await response.json();

      if (response.ok && result.links.length > 0) {
        listaMonitoramento.innerHTML = "";

        result.links.forEach((link) => {
          const card = document.createElement("div");
          card.style =
            "border: 1px solid #ddd; padding: 15px; margin-bottom: 20px; border-radius: 8px; background: #fff; box-shadow: 0 2px 4px rgba(0,0,0,0.1);";

          card.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #eee; padding-bottom: 10px;">
                <div>
                    <strong style="font-size: 1.1em; color: #333;">${link.razao_social}</strong>
                    <p style="margin: 2px 0; color: #666; font-size: 0.9em;">IP: ${link.ip_monitoramento} | Plano: ${link.qtd_mb}Mbps</p>
                </div>
                <div id="status-${link.id}" style="padding: 4px 12px; background: #2ecc71; color: white; border-radius: 20px; font-size: 0.8em; font-weight: bold;">ONLINE</div>
            </div>
            <div style="margin-top: 15px; height: 180px;">
                <canvas id="chart-${link.id}"></canvas>
            </div>
          `;
          listaMonitoramento.appendChild(card);

          // Inicializa o gráfico e define atualização automática a cada 30 segundos
          inicializarGrafico(link.id);
          setInterval(() => inicializarGrafico(link.id), 30000);
        });
      } else {
        listaMonitoramento.innerHTML = "<p>Nenhum link ativo encontrado.</p>";
      }
    } catch (error) {
      console.error("Erro ao carregar monitoramento:", error);
      listaMonitoramento.innerHTML =
        "<p>Erro ao carregar dados do servidor.</p>";
    }
  };

  async function inicializarGrafico(id) {
    try {
      const response = await fetch(`/api/internet/historico/${id}`);
      const dados = await response.json();

      const canvas = document.getElementById(`chart-${id}`);
      if (!canvas) return;
      const ctx = canvas.getContext("2d");

      // Destrói gráfico anterior se existir para evitar bugs de hover
      if (window[`chartObj${id}`]) {
        window[`chartObj${id}`].destroy();
      }

      window[`chartObj${id}`] = new Chart(ctx, {
        type: "line",
        data: {
          labels: dados.map((d) =>
            new Date(d.data_leitura).toLocaleTimeString()
          ),
          datasets: [
            {
              label: "Download (Mbps)",
              data: dados.map((d) => d.download),
              borderColor: "#2ecc71",
              backgroundColor: "rgba(46, 204, 113, 0.1)",
              fill: true,
              tension: 0.4,
            },
            {
              label: "Upload (Mbps)",
              data: dados.map((d) => d.upload),
              borderColor: "#3498db",
              backgroundColor: "rgba(52, 152, 219, 0.1)",
              fill: true,
              tension: 0.4,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: { duration: 800 },
          scales: {
            y: { beginAtZero: true, title: { display: true, text: "Mbps" } },
          },
        },
      });
    } catch (error) {
      console.error(`Erro ao carregar dados do gráfico ${id}:`, error);
    }
  }

  carregarMonitoramento();

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());

    data.qtd_mb = parseInt(data.qtd_mb);
    data.valor_mensal = parseFloat(data.valor_mensal);
    data.dedicado = data.dedicado === "true";

    try {
      const response = await fetch("/api/internet/cadastro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (response.ok) {
        showFeedback(result.mensagem, "success");
        form.reset();
        carregarMonitoramento();
      } else {
        showFeedback(`Falha: ${result.detalhe || result.mensagem}`, "error");
      }
    } catch (error) {
      showFeedback("Erro de conexão.", "error");
    }
  });
});
