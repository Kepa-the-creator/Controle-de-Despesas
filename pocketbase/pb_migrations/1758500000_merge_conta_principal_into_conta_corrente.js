/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  // Para cada usuário que tenha tanto "Conta Principal" quanto "Conta
  // Corrente", move todas as transações e despesas fixas da primeira pra
  // segunda, e apaga a "Conta Principal" (que fica vazia depois disso).
  const accounts = app.findRecordsByFilter("accounts", "", "", 500, 0);

  const byUser = {};
  for (const acc of accounts) {
    const userId = acc.get("user");
    if (!byUser[userId]) byUser[userId] = [];
    byUser[userId].push(acc);
  }

  for (const userId in byUser) {
    const userAccounts = byUser[userId];
    const principal = userAccounts.find(
      (a) => a.get("name").trim().toLowerCase() === "conta principal"
    );
    const corrente = userAccounts.find(
      (a) => a.get("name").trim().toLowerCase() === "conta corrente"
    );
    if (!principal || !corrente || principal.id === corrente.id) continue;

    const transactions = app.findRecordsByFilter(
      "transactions",
      `account = "${principal.id}"`,
      "",
      2000,
      0
    );
    for (const t of transactions) {
      t.set("account", corrente.id);
      app.save(t);
    }

    const fixedExpenses = app.findRecordsByFilter(
      "fixed_expenses",
      `account = "${principal.id}"`,
      "",
      2000,
      0
    );
    for (const fe of fixedExpenses) {
      fe.set("account", corrente.id);
      app.save(fe);
    }

    try {
      app.delete(principal);
    } catch (err) {
      console.log("could not delete leftover Conta Principal: " + err);
    }
  }
}, (app) => {
  // Consolidação de dados não é reversível automaticamente (não há registro
  // de qual conta cada transação tinha antes da fusão).
});
