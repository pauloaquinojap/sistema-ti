// Importa a biblioteca do PostgreSQL
const { Pool } = require("pg");

// Importa a biblioteca para ler o arquivo .env
require("dotenv").config();

// Cria a "Piscina" de conexões (Pool)
// Isso permite que o sistema gerencie várias conexões simultâneas
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

// Teste rápido para ver se conectou
pool.connect((err, client, release) => {
  if (err) {
    return console.error("❌ Erro ao conectar no Banco de Dados:", err.message);
  }
  client.query("SELECT NOW()", (err, result) => {
    release(); // Libera a conexão
    if (err) {
      return console.error("❌ Erro ao executar query:", err.message);
    }
    console.log("✅ Conectado ao PostgreSQL com sucesso!");
    console.log("📅 Hora do Servidor:", result.rows[0].now);
  });
});

// Exporta o "pool" para ser usado em outros arquivos
module.exports = pool;
