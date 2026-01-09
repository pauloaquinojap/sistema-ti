document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("cadastro-internet-form");
  const feedback = document.getElementById("feedback-message");

  const showFeedback = (message, type) => {
    feedback.textContent = message;
    feedback.className = type;
    feedback.classList.remove("hidden");
    setTimeout(() => {
      feedback.classList.add("hidden");
    }, 5000);
  };

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());

    // Converte valores numéricos e booleanos
    data.qtd_mb = parseInt(data.qtd_mb);
    data.valor_mensal = parseFloat(data.valor_mensal);
    data.dedicado = data.dedicado === "true"; // Converte string 'true' para booleano true

    const url = "/api/internet/cadastro"; // Sua rota POST

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (response.ok) {
        showFeedback(result.mensagem, "success");
        form.reset();
      } else {
        showFeedback(
          `Falha ao cadastrar: ${result.detalhe || result.mensagem}`,
          "error"
        );
      }
    } catch (error) {
      console.error("Erro de rede ou API:", error);
      showFeedback(
        "Erro de conexão com o servidor. Verifique o console.",
        "error"
      );
    }
  });
});
