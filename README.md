# 💰 Sistema de Gestão Financeira Pessoal & Familiar

<p align="center">
  <img src="https://img.shields.io/badge/Next.js%2014-000000?style=for-the-badge&logo=nextdotjs&logoColor=white" alt="Next.js" />
  <img src="https://img.shields.io/badge/NestJS%2010-E0234E?style=for-the-badge&logo=nestjs&logoColor=white" alt="NestJS" />
  <img src="https://img.shields.io/badge/PostgreSQL%2016-4169E1?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/Prisma%20ORM-2D3748?style=for-the-badge&logo=prisma&logoColor=white" alt="Prisma" />
  <img src="https://img.shields.io/badge/TailwindCSS-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white" alt="Tailwind CSS" />
  <img src="https://img.shields.io/badge/Docker%20Compose-2496ED?style=for-the-badge&logo=docker&logoColor=white" alt="Docker" />
</p>

Plataforma completa e moderna para controle financeiro pessoal e em grupo familiar, com suporte a múltiplas contas bancárias, cartões de crédito com ciclos de fechamento e fatura, parcelamentos, tetos de gastos com alertas de consumo, metas financeiras com aportes e exportação de relatórios.

---

## ✨ Funcionalidades Principais

- **👤 Visão Pessoal vs. 🏠 Visão Familiar (Context Switcher)**:
  - Alternância instantânea no cabeçalho entre finanças individuais e finanças compartilhadas da família.
  - Controle de permissões baseado em papéis (RBAC): `OWNER`, `ADMIN`, `MEMBER` e `VIEWER`.
- **🏦 Contas & Carteiras**:
  - Gestão de Contas Correntes, Poupanças, Investimentos e Dinheiro Físico.
  - Acompanhamento de saldo inicial vs. saldo atual em tempo real.
  - Arquivamento de contas inativas com preservação de histórico.
- **💳 Cartões de Crédito & Gestão de Faturas**:
  - Cadastro de cartões com limite total, disponível e barra visual de limite comprometido.
  - Ciclos automáticos de fatura (`YYYY-MM`) baseados no dia de fechamento e vencimento.
  - Liquidação/pagamento de faturas com débito automático em conta bancária.
- **💸 Lançamentos Financeiros & Extrato**:
  - Receitas, despesas e transferências bancárias atômicas entre contas.
  - Compras parceladas no cartão de crédito com divisão exata de centavos e alocação nas faturas subsequentes.
  - Lançamentos com flag de privacidade (`isPrivate`) que ocultam detalhes de outros membros familiares.
- **🎯 Tetos de Gastos & Orçamentos (Budgets)**:
  - Definição de limites mensais de gastos por categoria.
  - Cálculo de consumo em tempo real com alertas visuais ao atingir 80% e 100% do teto.
- **🏆 Metas Financeiras (Goals & Sonhos)**:
  - Criação de metas com valor alvo e data limite estimada.
  - Histórico de aportes com débito automático opcional de conta corrente.
- **📊 Relatórios & Exportação**:
  - Dashboard consolidado com KPIs (Saldo Geral, Receitas, Despesas e Balanço Líquido).
  - Gráficos interativos com **Recharts** (distribuição por categoria e fluxo de caixa de 6 meses).
  - Exportação completa do extrato filtrado em planilha **CSV**.

---

## 🏛️ Arquitetura & Stack Tecnológica

```
financeiro-familiar/
├── backend/                     # API RESTful em NestJS 10 + TypeScript
│   ├── prisma/                  # Modelagem Relacional e Seed Script
│   │   ├── schema.prisma        # 11 Tabelas com tipos PostgreSQL DECIMAL(15,2)
│   │   └── seed.ts              # Categorias padrão e usuário administrador
│   ├── src/
│   │   ├── modules/             # Auth, Users, Families, Accounts, Credit Cards,
│   │   │                        # Categories, Transactions, Budgets, Goals, Reports
│   │   └── common/              # Guards JWT, Decorators, Interceptors
│   └── test/                    # 11 Suítes de Teste (Unitários e Integração E2E)
│
├── frontend/                    # Web App em Next.js 14 (App Router) + React 18
│   ├── src/
│   │   ├── app/                 # Rotas: /, /login, /register, /transactions,
│   │   │                        # /accounts, /cards, /budgets, /goals, /family, /reports
│   │   ├── components/layout/   # AppShell responsivo com Sidebar e Context Switcher
│   │   ├── context/             # AuthProvider com persistência e RBAC
│   │   └── lib/                 # Cliente HTTP fetch e formatadores monetários
│
└── docker-compose.yml           # Orquestração de Containers (Postgres, API, Web)
```

---

## 🚀 Como Executar

### Pré-requisitos
- [Docker](https://www.docker.com/) e [Docker Compose](https://docs.docker.com/compose/) instalados, **OU**
- Node.js 20+ e PostgreSQL 16 local.

---

### Opção 1: Execução com Docker Compose (Recomendado)

1. Clone o repositório:
```bash
git clone git@github.com:italoaraujo/financeiro-familiar.git
cd financeiro-familiar
```

2. Suba todos os serviços:
```bash
docker compose up --build
```

3. Acesse os serviços nos seguintes endereços:
- **Aplicação Web (Frontend)**: [http://localhost:3000](http://localhost:3000)
- **API REST (Backend)**: [http://localhost:3001](http://localhost:3001)
- **Documentação Interativa (Swagger)**: [http://localhost:3001/api/docs](http://localhost:3001/api/docs)
- **Banco de Dados PostgreSQL**: `localhost:5432`

---

### Opção 2: Execução Manual para Desenvolvimento Local

#### 1. Iniciar Banco de Dados
```bash
docker compose up -d postgres
```

#### 2. Configurar e Iniciar o Backend
```bash
cd backend
npm install
cp .env.example .env

# Sincronizar o banco e popular dados iniciais
npx prisma db push
npm run prisma:seed

# Iniciar em modo de desenvolvimento
npm run start:dev
```

#### 3. Configurar e Iniciar o Frontend
```bash
cd ../frontend
npm install

# Iniciar em modo de desenvolvimento
npm run dev
```

---

## 🔑 Credenciais Padrão para Demonstração

O banco de dados é inicializado automaticamente com um usuário e categorias de exemplo:

- **E-mail**: `admin@exemplo.com`
- **Senha**: `123456`

---

## 🧪 Testes Automatizados

O projeto possui suítes completas de testes unitários e de integração de domínio para garantir a precisão de cálculos decimais monetários e regras de negócio:

```bash
# Executar todos os testes no backend
npm --prefix backend test
```

---

## 📜 Licença

Este projeto é disponibilizado sob a licença [MIT](LICENSE).
