const snmp = require("net-snmp");

const user = {
  name: "admin_snmp",
  level: snmp.SecurityLevel.authPriv,
  authProtocol: snmp.AuthProtocols.sha,
  authKey: "Japura@2025#Auth",
  privProtocol: snmp.PrivProtocols.aes,
  privKey: "Japura@2025#Priv",
};

// Tente aumentar o timeout para o handshake inicial
const options = {
  port: 161,
  timeout: 10000,
  retries: 3,
  engineID: null,
  context: "", // Importante para MikroTik
};

const ip = "192.168.1.254"; // IP que aparece no seu log
const session = snmp.createV3Session(ip, user, options);

const oids = ["1.3.6.1.2.1.1.1.0"]; // OID básica de System Description

console.log(`🚀 Testando conexão v3 com ${ip}...`);

session.get(oids, function (error, varbinds) {
  if (error) {
    console.error("❌ Falha no teste:");
    console.error(error.toString());
  } else {
    console.log("✅ Sucesso! Resposta do MikroTik:");
    console.log(varbinds[0].value.toString());
  }
  session.close();
});
