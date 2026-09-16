/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const usersCollection = app.findCollectionByNameOrId("users");

  const collection = new Collection({
    name: "fixed_expenses",
    type: "base",
    listRule: "user = @request.auth.id",
    viewRule: "user = @request.auth.id",
    createRule: "@request.auth.id != '' && user = @request.auth.id",
    updateRule: "user = @request.auth.id",
    deleteRule: "user = @request.auth.id",
    fields: [
      { name: "description", type: "text", required: true },
      { name: "amount", type: "number", required: true },
      { name: "category", type: "text", required: true },
      {
        name: "paymentMethod",
        type: "select",
        required: false,
        maxSelect: 1,
        values: ["pix", "credit_card", "debit_card", "cash"],
      },
      { name: "dayOfMonth", type: "number", required: true, min: 1, max: 31 },
      { name: "active", type: "bool" },
      {
        name: "user",
        type: "relation",
        required: true,
        collectionId: usersCollection.id,
        cascadeDelete: true,
        maxSelect: 1,
      },
    ],
  });

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("fixed_expenses");
  return app.delete(collection);
});
