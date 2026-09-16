/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const accountsCollection = app.findCollectionByNameOrId("accounts");
  const collection = app.findCollectionByNameOrId("fixed_expenses");

  collection.fields.add(new Field({
    type: "relation",
    name: "account",
    collectionId: accountsCollection.id,
    cascadeDelete: false,
    minSelect: 0,
    maxSelect: 1,
    required: false,
  }));
  app.save(collection);

  // Backfill: associa cada despesa fixa existente à "Conta Principal" do
  // respectivo usuário (criada, se necessário, pela migration de
  // transactions — aqui só reaproveita ou cria se ainda não existir).
  try {
    const records = app.findRecordsByFilter("fixed_expenses", "", "", 2000, 0);
    const accountByUser = {};

    for (const record of records) {
      if (record.get("account")) continue;
      const userId = record.get("user");
      if (!userId) continue;

      if (!accountByUser[userId]) {
        const existing = app.findRecordsByFilter(
          "accounts",
          `user = "${userId}" && name = "Conta Principal"`,
          "",
          1,
          0
        );
        if (existing.length > 0) {
          accountByUser[userId] = existing[0].id;
        } else {
          const account = new Record(accountsCollection);
          account.set("name", "Conta Principal");
          account.set("initialBalance", 0);
          account.set("active", true);
          account.set("user", userId);
          app.save(account);
          accountByUser[userId] = account.id;
        }
      }

      record.set("account", accountByUser[userId]);
      app.save(record);
    }
  } catch (err) {
    console.log("fixed_expenses account backfill skipped: " + err);
  }

  const accountField = collection.fields.getByName("account");
  accountField.required = true;

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("fixed_expenses");
  collection.fields.removeByName("account");
  return app.save(collection);
});
