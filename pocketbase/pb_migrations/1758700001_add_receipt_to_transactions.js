/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("transactions");

  collection.fields.add(new Field({
    name: "receipt",
    type: "file",
    required: false,
    maxSelect: 1,
    maxSize: 8388608, // 8MB
    mimeTypes: ["image/jpeg", "image/png", "image/webp", "image/heic", "application/pdf"],
  }));

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("transactions");
  collection.fields.removeByName("receipt");
  return app.save(collection);
});
