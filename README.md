🖥️ Sistema de Gestão de TI

Sistema Full Stack para controle de inventário, contratos, fornecedores e monitoramento de links de internet via SNMP.

🚀 Tecnologias Utilizadas
Frontend: HTML5, CSS3, JavaScript (Vanilla).
Backend: Node.js com TypeScript.
Banco de Dados: PostgreSQL.
Monitoramento: Protocolo SNMP (Worker dedicado).

📁 Estrutura do ProjetoPlaintextsistema-ti/
├── backend/
│ ├── src/
│ │ ├── config/ # Conexão com banco de dados (db.ts)
│ │ ├── controllers/ # Lógica de negócio (TypeScript)
│ │ ├── routes/ # Definição das rotas da API
│ │ ├── workers/ # Scripts de monitoramento (Internet)
│ │ └── public/ # Frontend estático (HTML/JS/CSS)
│ ├── server.ts # Arquivo principal do servidor
│ └── package.json # Dependências e scripts
└── uploads/ # Arquivos anexados (fotos/contratos)

🛠️ Como rodar o projetoPré-requisitosNode.js instalado.PostgreSQL rodando.

1. Configuração do BancoCrie um arquivo .env na raiz da pasta backend com suas credenciais:Snippet de códigoPORT=80 DATABASE_URL=postgres://usuario:senha@localhost:5432/nome_do_banco
2. InstalaçãoEntre na pasta do backend e instale as dependências:Bashcd backend
   npm install
3. Rodar em modo de desenvolvimentoO projeto utiliza ts-node-dev para reiniciar automaticamente a cada alteração:Bashnpm run dev

📡 Endpoints PrincipaisMóduloRota BaseDescriçãoEquipamentos/api/equipamentoCadastro e listagem de inventário.

Fornecedores/api/fornecedorGestão de empresas e contatos.
Internet/api/internetMonitoramento de tráfego (SNMP).
Relatórios/api/relatoriosFiltros avançados para exportação.
💡 Dicas de ManutençãoFrontend: Lembre-se que os arquivos dentro de src/public devem ser .js. O navegador não interpreta arquivos .ts nativamente.Git: Antes de subir para o GitHub, certifique-se de que a pasta node_modules e o arquivo .env estão no seu .gitignore.
