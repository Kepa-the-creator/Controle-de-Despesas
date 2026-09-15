/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const usersCollection = app.findCollectionByNameOrId("users");
  const collection = app.findCollectionByNameOrId("transactions");

  collection.fields.add(new Field({
    type: "relation",
    name: "user",
    collectionId: usersCollection.id,
    cascadeDelete: true,
    minSelect: 0,
    maxSelect: 1,
    required: false,
  }));
  app.save(collection);

  // Backfill: registros criados antes de existir o campo "user" ficam com o
  // usuário mais antigo (primeira conta criada).
  try {
    const owners = app.findRecordsByFilter("users", "", "+created", 1, 0);
    if (owners.length > 0) {
      const ownerId = owners[0].id;
      const records = app.findRecordsByFilter("transactions", "", "", 500, 0);
      for (const record of records) {
        if (!record.get("user")) {
          record.set("user", ownerId);
          app.save(record);
        }
      }
    }
  } catch (err) {
    console.log("transactions backfill skipped: " + err);
  }

  const userField = collection.fields.getByName("user");
  userField.required = true;

  collection.listRule = "user = @request.auth.id";
  collection.viewRule = "user = @request.auth.id";
  collection.createRule = "@request.auth.id != '' && user = @request.auth.id";
  collection.updateRule = "user = @request.auth.id";
  collection.deleteRule = "user = @request.auth.id";

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("transactions");
  collection.fields.removeByName("user");

  collection.listRule = "@request.auth.id != ''";
  collection.viewRule = "@request.auth.id != ''";
  collection.createRule = "@request.auth.id != ''";
  collection.updateRule = "@request.auth.id != ''";
  collection.deleteRule = "@request.auth.id != ''";

  return app.save(collection);
});
