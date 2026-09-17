/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("fixed_expenses");

  collection.fields.add(new Field({
    type: "text",
    name: "startMonth",
    required: false,
  }));
  app.save(collection);

  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const fixedExpenses = app.findRecordsByFilter("fixed_expenses", "", "", 2000, 0);
  for (const fe of fixedExpenses) {
    if (!fe.get("startMonth")) {
      fe.set("startMonth", currentMonth);
      app.save(fe);
    }
  }

  // Remove lançamentos gerados automaticamente pra meses anteriores ao
  // startMonth de cada lançamento fixo (backfill indevido de antes desse
  // ajuste, quando navegar pra um mês passado gerava o lançamento nele).
  try {
    for (const fe of fixedExpenses) {
      const startMonth = fe.get("startMonth");
      const generated = app.findRecordsByFilter(
        "transactions",
        `recurringSource = "${fe.id}"`,
        "",
        2000,
        0
      );
      for (const t of generated) {
        const txMonth = t.get("date").slice(0, 7);
        if (txMonth < startMonth) {
          app.delete(t);
        }
      }
    }
  } catch (err) {
    console.log("cleanup of retroactive recurring transactions skipped: " + err);
  }
}, (app) => {
  const collection = app.findCollectionByNameOrId("fixed_expenses");
  collection.fields.removeByName("startMonth");
  return app.save(collection);
});
