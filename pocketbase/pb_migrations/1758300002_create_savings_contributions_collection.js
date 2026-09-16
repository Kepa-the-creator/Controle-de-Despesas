/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const usersCollection = app.findCollectionByNameOrId("users");
  const goalsCollection = app.findCollectionByNameOrId("savings_goals");

  const collection = new Collection({
    name: "savings_contributions",
    type: "base",
    listRule: "user = @request.auth.id",
    viewRule: "user = @request.auth.id",
    createRule: "@request.auth.id != '' && user = @request.auth.id",
    updateRule: "user = @request.auth.id",
    deleteRule: "user = @request.auth.id",
    fields: [
      {
        name: "goal",
        type: "relation",
        required: true,
        collectionId: goalsCollection.id,
        cascadeDelete: true,
        maxSelect: 1,
      },
      { name: "amount", type: "number", required: true },
      { name: "date", type: "date", required: true },
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
  const collection = app.findCollectionByNameOrId("savings_contributions");
  return app.delete(collection);
});
