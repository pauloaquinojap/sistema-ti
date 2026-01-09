import { Pool } from "pg";
import dotenv from "dotenv";

// Carrega as variáveis do .env
dotenv.config();

// Criamos o Pool com uma pequena correção: o port precisa ser um número no TS
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 5432,
});

// Teste de conexão usando Promises (mais moderno no TS)
pool
  .connect()
  .then((client) => {
    return client
      .query("SELECT NOW()")
      .then((res) => {
        client.release();
        console.log("✅ Conectado ao PostgreSQL com sucesso!");
        console.log("📅 Hora do Servidor:", res.rows[0].now);
      })
      .catch((err) => {
        client.release();
        console.error("❌ Erro ao executar query:", err.message);
      });
  })
  .catch((err) =>
    console.error("❌ Erro ao conectar no Banco de Dados:", err.message)
  );

// Exportação no padrão ES Modules
export default pool;
