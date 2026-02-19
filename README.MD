# Backend

### Cria o ambiente virtual (venv)
python3 -m venv venv

### Ativa o ambiente virtual (Comando específico para Linux/Mac)
source venv/bin/activate

### Executar o servidor
uvicorn main:app --reload

# BD

docker compose up -d


# ☁️ Infraestrutura e Deploy (Nuvem)

Este projeto adota uma arquitetura moderna baseada em microsserviços na nuvem, utilizando a trindade de plataformas gratuitas para o deploy:

### 1. Banco de Dados: Neon (Serverless Postgres)
O coração dos dados. Um banco PostgreSQL escalável e sem servidor.
* **Painel de Controle (Dashboard):** [console.neon.tech](https://console.neon.tech/)
* **Link da Aplicação:** *(O banco não possui link público web por segurança; ele é acessado exclusivamente pelo Back-end através da Connection String)*.

### 2. Back-end: Render (Python / FastAPI)
A inteligência do negócio. A API que processa as regras e se comunica com o banco de dados.
* **Painel de Controle (Dashboard):** [dashboard.render.com](https://dashboard.render.com/)
* **Link da API (Swagger UI):** [https://financas-app-niso.onrender.com/docs](https://financas-app-niso.onrender.com/docs)

### 3. Front-end: Vercel (Angular)
A interface do usuário. Consome a API do Render para exibir os dados de forma fluida e reativa.
* **Painel de Controle (Dashboard):** [vercel.com/dashboard](https://vercel.com/dashboard)
* **Link da Aplicação:** [https://financas-app-rho.vercel.app/p](https://financas-app-rho.vercel.app/)