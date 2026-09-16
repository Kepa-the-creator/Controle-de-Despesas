/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const usersCollection = app.findCollectionByNameOrId("users");

  const collection = new Collection({
    name: "accounts",
    type: "base",
    listRule: "user = @request.auth.id",
    viewRule: "user = @request.auth.id",
    createRule: "@request.auth.id != '' && user = @request.auth.id",
    updateRule: "user = @request.auth.id",
    deleteRule: "user = @request.auth.id",
    fields: [
      { name: "name", type: "text", required: true },
      { name: "initialBalance", type: "number", required: false },
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
  const collection = app.findCollectionByNameOrId("accounts");
  return app.delete(collection);
});
