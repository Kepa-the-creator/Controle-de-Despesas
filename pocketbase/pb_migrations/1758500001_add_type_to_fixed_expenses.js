/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("fixed_expenses");

  collection.fields.add(new Field({
    type: "select",
    name: "type",
    required: false,
    maxSelect: 1,
    values: ["income", "expense"],
  }));
  app.save(collection);

  // Backfill: tudo que já existia era despesa
  try {
    const records = app.findRecordsByFilter("fixed_expenses", "", "", 2000, 0);
    for (const record of records) {
      if (!record.get("type")) {
        record.set("type", "expense");
        app.save(record);
      }
    }
  } catch (err) {
    console.log("fixed_expenses type backfill skipped: " + err);
  }

  const typeField = collection.fields.getByName("type");
  typeField.required = true;

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("fixed_expenses");
  collection.fields.removeByName("type");
  return app.save(collection);
});
