/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const fixedExpensesCollection = app.findCollectionByNameOrId("fixed_expenses");
  const collection = app.findCollectionByNameOrId("transactions");

  collection.fields.add(new Field({
    type: "text",
    name: "installmentGroup",
    required: false,
  }));
  collection.fields.add(new Field({
    type: "number",
    name: "installmentIndex",
    required: false,
  }));
  collection.fields.add(new Field({
    type: "number",
    name: "installmentTotal",
    required: false,
  }));
  collection.fields.add(new Field({
    type: "relation",
    name: "recurringSource",
    collectionId: fixedExpensesCollection.id,
    cascadeDelete: true,
    minSelect: 0,
    maxSelect: 1,
    required: false,
  }));

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("transactions");
  collection.fields.removeByName("installmentGroup");
  collection.fields.removeByName("installmentIndex");
  collection.fields.removeByName("installmentTotal");
  collection.fields.removeByName("recurringSource");
  return app.save(collection);
});
