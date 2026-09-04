# Metas Financeiras: Vínculo Obrigatório a Contas (Cofrinhos) e Resgate Context

**Gathered:** 2026-09-04
**Spec:** `.specs/features/metas-vinculo-conta-e-resgate/spec.md`
**Status:** Ready for design

---

## Feature Boundary

Este recurso transforma as Metas Financeiras em "Cofrinhos / Caixinhas", vinculando cada meta obrigatoriamente a uma Conta Bancária de custódia. O sistema passa a permitir movimentação bidirecional de recursos (Aporte da conta para a meta e Resgate da meta de volta para a conta), impedindo rigorosamente a exclusão de qualquer meta que ainda possua saldo acumulado superior a zero.

---

## Implementation Decisions

### Vínculo de Conta Bancária na Meta (Cofrinho)
- Cada meta é obrigatoriamente associada a uma conta bancária (`accountId`) no momento de sua criação.
- Todos os aportes futuros são debitados exclusivamente da conta vinculada à meta.
- Todos os resgates futuros são creditados exclusivamente na conta vinculada à meta.
- Não é permitido criar uma meta sem conta vinculada.

### Resgate de Recursos da Meta (Retirada)
- Novo fluxo e endpoint de resgate (`POST /goals/:id/withdraw`).
- O valor do resgate não pode ser superior ao saldo acumulado na meta (`currentAmount`).
- A operação de resgate atualiza atomicamente o saldo da meta (decrementando) e o saldo da conta vinculada (incrementando).
- Registra transação financeira correspondente para conciliação contábil no extrato da conta.
- Registra o histórico da movimentação de resgate na meta.
- Se a meta estava no status `COMPLETED` e o resgate fizer o saldo cair abaixo do valor alvo (`targetAmount`), o status da meta retorna para `IN_PROGRESS`.

### Bloqueio de Exclusão com Saldo
- Exclusão estritamente bloqueada quando `currentAmount > 0`.
- O usuário deve realizar o resgate manual de todo o saldo acumulado até zerar a meta antes de poder excluí-la.
- O backend rejeita a tentativa de exclusão com `400 Bad Request` detalhando a necessidade de resgate prévio.
- O frontend desabilita a exclusão ou apresenta aviso claro e amigável impedindo a ação acidental enquanto houver saldo.

### Agent's Discretion
- Estrutura da tabela e relacionamento no Prisma para histórico unificado de aportes e resgates.
- Nomenclatura das categorias de sistema padrão para aportes e resgates de metas.
- Design dos componentes de interface no frontend mantendo o padrão visual Dark Neon / Tailwind já estabelecido.

### Declined / Undiscussed Gray Areas → Assumptions
- **Alteração da conta vinculada pós-criação**: Uma meta não deve permitir alterar a conta vinculada enquanto possuir saldo acumulado, para evitar descompasso contábil entre a conta de onde o dinheiro saiu e para onde ele voltaria.
- **Tratamento de metas pré-existentes sem conta no banco**: Na migration de banco de dados, caso existam metas sem conta vinculada, será associada a primeira conta ativa do usuário/família para preservar integridade relacional.

---

## Specific References
- Inspirado no conceito de "Caixinhas do Nubank / Cofrinhos de Bancos Digitais", onde cada cofrinho pertence e se comunica diretamente com a conta corrente/investimento do usuário.

---

## Deferred Ideas
- Rendimento automático diário baseado em CDI/Selic dentro da meta (guardado para versão futura de investimentos).
- Transferência direta de saldo entre duas metas diferentes sem passar pela conta intermediária.
