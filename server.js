// server.js
const express = require("express");
const cors = require("cors");
const path = require("path");
const dotenv = require("dotenv");

const db = require("./src/config/db.js");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 80;

// [CONFIGURAÇÕES]
app.use(cors());
app.use(express.json());

// Servir arquivos estáticos
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use(
  "/uploads-fornecedor",
  express.static(path.join(__dirname, "uploads-fornecedor"))
);
app.use(
  "/uploads-contrato",
  express.static(path.join(__dirname, "uploads-contrato"))
);
app.use(express.static(path.join(__dirname, "src/public")));

let equipamentoRoutes,
  fornecedorRoutes,
  contratoRoutes,
  internetRoutes,
  dashboardRoutes,
  relatorioRoutes,
  estacoesRoutes; // Acrescentado o novo módulo

// TENTATIVA SEGURA DE CARREGAR AS ROTAS
try {
  equipamentoRoutes = require("./src/routes/equipamentoRoutes");
  fornecedorRoutes = require("./src/routes/fornecedorRoutes");
  contratoRoutes = require("./src/routes/contratoRoutes");
  internetRoutes = require("./src/routes/internetRoutes");
  dashboardRoutes = require("./src/routes/dashboardRoutes");
  relatorioRoutes = require("./src/routes/relatorioRoutes");
  estacoesRoutes = require("./src/routes/estacoesRoutes"); // Acrescentado o novo módulo

  console.log("✅ Arquivos de rotas carregados com sucesso.");
} catch (e) {
  console.error("❌ ERRO CRÍTICO AO CARREGAR ROTAS:", e.message);
  process.exit(1);
}

// CONEXÃO DE ROTAS
app.use("/api/equipamento", equipamentoRoutes);
app.use("/api/fornecedor", fornecedorRoutes);
app.use("/api/contrato", contratoRoutes);
app.use("/api/internet", internetRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/relatorios", relatorioRoutes);
app.use("/api/estacoes", estacoesRoutes); // Acrescentado o novo módulo

// ==========================================
// [INTEGRAÇÃO DO WORKER - MONITORAMENTO]
// ==========================================
try {
  // Verifique se o caminho abaixo está correto de acordo com sua pasta
  require("./src/workers/workerinternet.js");
  console.log("📡 Monitoramento SNMP (Worker) iniciado com sucesso!");
} catch (error) {
  console.error(
    "⚠️ Falha ao iniciar o Worker de monitoramento:",
    error.message
  );
}
// ==========================================

app.get("/", (req, res) => {
  res.send("Sistema de TI está rodando! 🚀");
});

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
