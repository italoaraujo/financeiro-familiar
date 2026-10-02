# Hora e Minuto no Lançamento Context

**Gathered:** 2026-10-02
**Spec:** `.specs/features/hora-minuto-lancamento/spec.md`
**Status:** Ready for design

---

## Feature Boundary

Permitir a definição e visualização de horário (hora e minuto) ao criar lançamentos financeiros (despesa, receita, transferência) no modal de lançamento, refletindo no extrato e na ordenação cronológica.

---

## Implementation Decisions

### Preenchimento Inicial do Horário no Modal

- O campo de hora e minuto inicia vazio (ou com 00:00 como fallback opcional), permitindo que o usuário digite ou selecione hora e minuto caso deseje.
- Caso o usuário não informe horário, o sistema aplica um horário padrão neutro (12:00:00 ou 00:00:00) mantendo compatibilidade com transações legadas.

### Exibição na Listagem de Extrato

- O horário (HH:mm) será exibido na mesma coluna da data do lançamento (ex: data principal e horário discreto ao lado/abaixo como `02/10/2026 14:30`), proporcionando clareza sem poluir a tabela.
- Na ordenação do extrato (`orderBy`), lançamentos do mesmo dia serão ordenados respeitando a hora e minuto informados (decrescente).

### Parcelamento no Cartão de Crédito

- Ao registrar uma compra parcelada, o horário definido pelo usuário é atribuído à primeira parcela.
- As parcelas futuras subsequentes recebem o horário padrão de início de dia (00:00:00), conforme escolha do usuário.

### Modelagem e Banco de Dados

- Coluna de data/hora no banco de dados (`transaction_date`) ou campo complementar adaptado para suportar `DateTime` com fuso/horário no Postgres/Prisma (`@db.Timestamptz`), permitindo persistir ano, mês, dia, hora e minuto com integridade.
- Compatibilidade retroativa para registros anteriores já gravados.

### Agent's Discretion

- Formatação visual no Tailwind CSS seguindo o design system escuro já existente (badge discreta de hora ou texto `text-slate-400` / `text-slate-500` com ícone de relógio sutil se apropriado).
- Ajustes em DTOs de backend (`create-transaction.dto.ts` e `transfer.dto.ts`) para aceitar tanto formato `YYYY-MM-DD` quanto `YYYY-MM-DDTHH:mm` ou campo opcional de hora `HH:mm`.

### Declined / Undiscussed Gray Areas → Assumptions

- Filtros por período no extrato (startDate / endDate) continuam operando por dia completo (00:00:00 até 23:59:59), garantindo que buscas por data não excluam transações com hora definida.

---

## Specific References

- "Iniciar vazio (ou 00:00) e exigir preenchimento apenas se o usuário desejar."
- "Na mesma coluna da data (ex: data na linha principal e horário discreto logo abaixo ou ao lado: 02/10/2026 14:30)."
- "Apenas na primeira parcela; as futuras ficam com horário padrão (ex: 12:00 ou 00:00)."

---

## Deferred Ideas

- Edição posterior de horário em lote de lançamentos importados (caso venha a existir módulo de importação OFX/extrato bancário com reconciliação de horário).
