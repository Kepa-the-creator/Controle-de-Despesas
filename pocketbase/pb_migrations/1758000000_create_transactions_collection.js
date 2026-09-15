/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = new Collection({
    name: "transactions",
    type: "base",
    listRule: "@request.auth.id != ''",
    viewRule: "@request.auth.id != ''",
    createRule: "@request.auth.id != ''",
    updateRule: "@request.auth.id != ''",
    deleteRule: "@request.auth.id != ''",
    fields: [
      { name: "description", type: "text", required: true },
      { name: "amount", type: "number", required: true },
      {
        name: "type",
        type: "select",
        required: true,
        maxSelect: 1,
        values: ["income", "expense"],
      },
      { name: "category", type: "text", required: true },
      {
        name: "paymentMethod",
        type: "select",
        required: false,
        maxSelect: 1,
        values: ["pix", "credit_card", "debit_card", "cash"],
      },
      { name: "date", type: "date", required: true },
    ],
  });

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("transactions");
  return app.delete(collection);
});
