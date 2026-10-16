# 🤖 Servidor MCP — Sistema de Gestão Financeira Pessoal & Familiar

Servidor **Model Context Protocol (MCP)** oficial para integração do Sistema de Gestão Financeira Pessoal & Familiar com assistentes de IA (Claude Desktop, Cursor, Antigravity, Windsurf e clientes MCP compatíveis).

Opera via transporte padrão `stdio` e consome a API REST do backend (`http://localhost:3001`), preservando **100% das regras de negócio**, precisão monetária (`DECIMAL(15,2)`), controle de acesso baseado em papéis (`OWNER`, `ADMIN`, `MEMBER`, `VIEWER`) e trilha de auditoria (`AuditLogInterceptor`).

---

## 🔑 Como Obter o Token MCP (Pela Interface Web)

1. Acesse a aplicação web (`http://localhost:3000`) e faça login.
2. No menu lateral esquerdo, clique em **Integração IA (MCP)** (`/mcp`).
3. Informe um nome para identificar o seu cliente (ex.: `Claude Desktop`, `Cursor IDE`) e escolha a validade desejada (30, 90, 365 dias ou Sem expiração).
4. Clique em **Gerar Token MCP**.
5. Copie o **Token de Acesso** ou diretamente o **Snippet JSON (`mcpServers`)** pronto para colar no seu cliente de IA.
6. Caso precise invalidar o acesso de algum dispositivo no futuro, basta clicar em **Revogar** na tabela de tokens ativos na mesma página `/mcp`.

---

## ⚙️ Variáveis de Ambiente

| Variável | Obrigatória | Padrão | Descrição |
| :--- | :---: | :---: | :--- |
| `MCP_API_URL` | Não | `http://localhost:3001` | URL base da API REST do backend financeiro. |
| `MCP_API_TOKEN` | Sim (Recomendado) | — | Token JWT gerado em 1 clique na tela web `/mcp`. |
| `MCP_USER_EMAIL` | Alternativa | — | E-mail do usuário (usado para login automático caso `MCP_API_TOKEN` não seja definido). |
| `MCP_USER_PASSWORD` | Alternativa | — | Senha do usuário (usado junto com `MCP_USER_EMAIL`). |
| `MCP_DEFAULT_FAMILY_ID` | Não | Visão Pessoal | UUID da família padrão para consultas e lançamentos compartilhados. |
| `MCP_HTTP_TIMEOUT_MS` | Não | `15000` | Timeout em milissegundos para chamadas HTTP ao backend. |

---

## 🚀 Instalação e Compilação

```bash
cd mcp-server
npm install
npm run build
```

O binário compilado ficará disponível em `dist/index.js`.

---

## 🖥️ Configuração nos Clientes de IA (`mcpServers`)

Adicione o bloco abaixo no arquivo de configuração do seu cliente MCP (ex.: `claude_desktop_config.json` ou `.cursor/mcp.json`):

```json
{
  "mcpServers": {
    "financeiro-familiar": {
      "command": "node",
      "args": ["/var/www/financeiro-familiar/mcp-server/dist/index.js"],
      "env": {
        "MCP_API_URL": "http://localhost:3001",
        "MCP_API_TOKEN": "SEU_TOKEN_GERADO_NA_TELA_WEB_MCP"
      }
    }
  }
}
```

---

## 🛠️ Catálogo Completo (31 Tools & 3 Resources)

### 1. Contexto & Famílias (3 Tools)
- `get_current_context`: Retorna perfil do usuário autenticado, famílias vinculadas e contexto padrão.
- `list_families`: Lista as famílias do usuário com membros e papéis RBAC.
- `list_family_people`: Lista pessoas/dependentes vinculados a uma família.

### 2. Contas, Categorias & Tags (7 Tools)
- `list_accounts`: Lista contas bancárias e carteiras ativas com saldos atuais.
- `get_account`: Detalha uma conta bancária específica.
- `create_account`: Cria nova conta (`CHECKING`, `SAVINGS`, `INVESTMENT`, `CASH`).
- `archive_account`: Arquiva (soft-delete) uma conta bancária.
- `list_categories`: Lista categorias e subcategorias (`INCOME` / `EXPENSE`).
- `create_category`: Cria categoria ou subcategoria personalizada.
- `list_tags`: Lista tags cadastradas no contexto pessoal ou familiar.

### 3. Transações & Transferências (4 Tools)
- `list_transactions`: Consulta extrato paginado com filtros avançados.
- `create_transaction`: Registra receita ou despesa (à vista ou parcelada em até 72x no cartão).
- `transfer_between_accounts`: Realiza transferência atômica entre duas contas bancárias.
- `delete_transaction`: Exclui (soft-delete) uma transação ou grupo de parcelas com estorno automático.

### 4. Cartões de Crédito & Faturas (4 Tools)
- `list_credit_cards`: Lista cartões de crédito com limite total, comprometido, disponível e faturas.
- `create_credit_card`: Cadastra novo cartão de crédito vinculado a uma conta bancária.
- `get_invoice_details`: Detalha fatura mensal e todas as transações/parcelas alocadas.
- `pay_credit_card_invoice`: Liquida fatura aberta/fechada debitando a conta bancária escolhida.

### 5. Orçamentos & Metas Financeiras / Cofrinhos (8 Tools)
- `list_budgets`: Lista tetos de gastos mensais com percentual consumido e alertas (`80%` / `100%`).
- `create_budget`: Cria teto de gastos mensal para uma categoria.
- `update_budget`: Atualiza limite ou alertas de um orçamento.
- `delete_budget`: Exclui um teto de gastos.
- `list_goals`: Lista metas financeiras (cofrinhos) com saldo acumulado e histórico.
- `create_goal`: Cria nova meta financeira vinculada a uma conta bancária de custódia.
- `deposit_to_goal`: Realiza aporte em meta financeira (com débito opcional da conta).
- `withdraw_from_goal`: Realiza resgate de meta financeira (com crédito opcional na conta).

### 6. Relatórios & Exportação CSV (5 Tools)
- `get_dashboard_summary`: Resumo executivo do Dashboard (saldo líquido, receitas, despesas e últimas transações).
- `get_expenses_by_category`: Distribuição de despesas por categoria no mês.
- `get_expenses_by_tag`: Distribuição de despesas por tag no mês.
- `get_cash_flow`: Evolução mensal de receitas vs. despesas (1 a 24 meses).
- `export_transactions_csv`: Exporta extrato filtrado em formato CSV.

### 7. Resources MCP (3 Resources)
- `financeiro://dashboard/summary`: Snapshot JSON do resumo executivo do mês atual.
- `financeiro://accounts/list`: Catálogo JSON de contas bancárias ativas e saldos.
- `financeiro://categories/catalog`: Catálogo JSON de categorias e subcategorias (`INCOME` e `EXPENSE`).

---

## 🧪 Testes Automatizados

```bash
npm test
```
