import express, { Request, Response } from "express";
import cors from "cors";
import path from "path";
import dotenv from "dotenv";

// Importamos o pool que você configurou no db.ts
import pool from "./src/config/db";

// Importação das rotas (Certifique-se de que os arquivos abaixo terminam com .ts)
import equipamentoRoutes from "./src/routes/equipamentoRoutes";
import fornecedorRoutes from "./src/routes/fornecedorRoutes";
import contratoRoutes from "./src/routes/contratoRoutes";
import internetRoutes from "./src/routes/internetRoutes";
import dashboardRoutes from "./src/routes/dashboardRoutes";
import relatorioRoutes from "./src/routes/relatorioRoutes";
import estacoesRoutes from "./src/routes/estacoesRoutes";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 80;

// [CONFIGURAÇÕES]
app.use(cors());
app.use(express.json());

// Servir arquivos estáticos
// No TS, __dirname continua funcionando para caminhos
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

// CONEXÃO DE ROTAS
app.use("/api/equipamento", equipamentoRoutes);
app.use("/api/fornecedor", fornecedorRoutes);
app.use("/api/contrato", contratoRoutes);
app.use("/api/internet", internetRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/relatorios", relatorioRoutes);
app.use("/api/estacoes", estacoesRoutes);

// ==========================================
// [INTEGRAÇÃO DO WORKER - MONITORAMENTO]
// ==========================================
try {
  // Se o worker ainda for .js, o TS consegue importar.
  // Se converter ele para .ts depois, o import continua igual.
  require("./src/workers/workerinternet.js");
  console.log("📡 Monitoramento SNMP (Worker) iniciado com sucesso!");
} catch (error: any) {
  console.error(
    "⚠️ Falha ao iniciar o Worker de monitoramento:",
    error.message
  );
}
// ==========================================

app.get("/", (req: Request, res: Response) => {
  res.send("Sistema de TI está rodando com TypeScript! 🚀");
});

app.listen(PORT, () => {
  console.log(`✅ Servidor rodando na porta ${PORT}`);
});
