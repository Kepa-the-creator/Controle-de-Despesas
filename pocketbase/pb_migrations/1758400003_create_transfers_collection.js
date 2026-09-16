/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const usersCollection = app.findCollectionByNameOrId("users");
  const accountsCollection = app.findCollectionByNameOrId("accounts");

  const collection = new Collection({
    name: "transfers",
    type: "base",
    listRule: "user = @request.auth.id",
    viewRule: "user = @request.auth.id",
    createRule: "@request.auth.id != '' && user = @request.auth.id",
    updateRule: "user = @request.auth.id",
    deleteRule: "user = @request.auth.id",
    fields: [
      {
        name: "fromAccount",
        type: "relation",
        required: true,
        collectionId: accountsCollection.id,
        cascadeDelete: true,
        maxSelect: 1,
      },
      {
        name: "toAccount",
        type: "relation",
        required: true,
        collectionId: accountsCollection.id,
        cascadeDelete: true,
        maxSelect: 1,
      },
      { name: "amount", type: "number", required: true },
      { name: "date", type: "date", required: true },
      { name: "description", type: "text", required: false },
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
  const collection = app.findCollectionByNameOrId("transfers");
  return app.delete(collection);
});
