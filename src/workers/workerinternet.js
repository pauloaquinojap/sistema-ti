const snmp = require("net-snmp");
const cron = require("node-cron");
const pool = require("../config/db");

// OIDs de Alta Capacidade (HC) - Ideais para links acima de 50 Mbps
const OID_IN = "1.3.6.1.2.1.31.1.1.1.6."; // ifHCInOctets
const OID_OUT = "1.3.6.1.2.1.31.1.1.1.10."; // ifHCOutOctets

// Função auxiliar para converter o Buffer binário do Counter64 em String numérica para o Postgres
const parseCounter64 = (value) => {
  if (Buffer.isBuffer(value)) {
    // Converte o Buffer para hex e depois para BigInt para garantir precisão, retornando string
    return BigInt("0x" + value.toString("hex")).toString();
  }
  return value.toString();
};

async function coletarDados() {
  try {
    const res = await pool.query(
      "SELECT id, ip_monitoramento, snmp_community, snmp_interface_index FROM internet WHERE status = 'ATIVA'"
    );
    const lojas = res.rows;

    for (const loja of lojas) {
      if (!loja.ip_monitoramento) continue;

      const user = {
        name: "admin_snmp",
        level: snmp.SecurityLevel.authPriv,
        authProtocol: snmp.AuthProtocols.sha,
        authKey: "Japura@2025#Auth",
        privProtocol: snmp.PrivProtocols.aes,
        privKey: "Japura@2025#Priv",
      };

      const options = {
        port: 161,
        timeout: 10000,
        retries: 3,
        engineID: null,
        context: "",
      };

      const session = snmp.createV3Session(
        loja.ip_monitoramento,
        user,
        options
      );

      const interfaceIdx = loja.snmp_interface_index || 1;
      const oids = [OID_IN + interfaceIdx, OID_OUT + interfaceIdx];

      session.get(oids, async (error, varbinds) => {
        if (error) {
          console.error(
            `❌ Erro na loja ${loja.id} (${loja.ip_monitoramento}):`,
            error.toString()
          );
        } else {
          // APLICAÇÃO DA CORREÇÃO AQUI
          const download = parseCounter64(varbinds[0].value);
          const upload = parseCounter64(varbinds[1].value);

          try {
            // SALVA NO HISTÓRICO
            await pool.query(
              "INSERT INTO historico_trafego (internet_id, download_bytes, upload_bytes) VALUES ($1, $2, $3)",
              [loja.id, download, upload]
            );

            // Atualiza a última verificação
            await pool.query(
              "UPDATE internet SET ultima_verificacao = NOW() WHERE id = $1",
              [loja.id]
            );

            console.log(
              `✅ Loja ${loja.id} atualizada: ${download} IN / ${upload} OUT`
            );
          } catch (dbErr) {
            console.error(
              `❌ Erro ao salvar banco (Loja ${loja.id}):`,
              dbErr.message
            );
          }
        }
        session.close();
      });
    }
  } catch (err) {
    console.error("❌ Erro no Worker:", err.message);
  }
}

// Roda a cada 10 segundos
cron.schedule("*/10 * * * * *", () => {
  console.log("📡 Iniciando coleta SNMP...");
  coletarDados();
});
