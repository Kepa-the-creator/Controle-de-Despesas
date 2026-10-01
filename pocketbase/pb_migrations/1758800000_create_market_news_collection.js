/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = new Collection({
    name: "market_news",
    type: "base",
    // Notícia não é dado de uma pessoa específica — é a mesma lista pra
    // qualquer um que abrir o app, então não tem campo "user" nem regra de
    // dono. Leitura é pública; escrita fica só pra superusuário (quem
    // alimenta essa coleção é um workflow externo — n8n — autenticado como
    // admin do PocketBase, não um usuário comum do app).
    listRule: "",
    viewRule: "",
    createRule: null,
    updateRule: null,
    deleteRule: null,
    fields: [
      { name: "title", type: "text", required: true },
      { name: "url", type: "url", required: true },
      { name: "source", type: "text", required: true },
      { name: "summary", type: "text", required: false },
      { name: "publishedAt", type: "date", required: true },
    ],
    indexes: [
      "CREATE UNIQUE INDEX idx_market_news_url ON market_news (url)",
    ],
  });

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("market_news");
  return app.delete(collection);
});
