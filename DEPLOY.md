# Deploy em VPS (migração do Coolify)

Este projeto roda em Docker puro numa VPS, sem depender do Coolify. A pilha
tem 3 containers:

- **frontend** — build do React/Vite servido por Nginx ([Dockerfile](Dockerfile))
- **pocketbase** — servidor PocketBase ([pocketbase/Dockerfile](pocketbase/Dockerfile)), dados persistidos no volume `pb_data`
- **caddy** — reverse proxy na frente dos dois, com HTTPS automático via Let's Encrypt ([Caddyfile](Caddyfile)) — só entra em cena na Fase 2, quando houver domínio

## Fase 1 — subir sem domínio (acesso por IP)

Pré-requisito: VPS com Docker e Docker Compose já instalados, portas 8080 e
8090 liberadas no firewall.

```bash
git clone <url-do-repositorio> controle-de-despesas
cd controle-de-despesas
cp .env.production.example .env.production
```

Edite `.env.production` e troque `SEU_IP_DA_VPS` pelo IP público real da VPS
em `PUBLIC_POCKETBASE_URL` (ex: `http://203.0.113.10:8090`).

### Migrar os dados do PocketBase atual

O PocketBase guarda tudo (usuários, coleções, registros, arquivos) na pasta
`pb_data`. Copie essa pasta do servidor antigo (o que tinha Zabbix + Coolify)
para a VPS nova antes de subir a stack:

```bash
# do servidor antigo para a VPS nova
rsync -avz /caminho/para/pb_data/ usuario@ip-da-vps-nova:/tmp/pb_data_migrado/
```

Na VPS nova, ainda sem subir os containers, restaure os dados no volume que o
Compose vai usar:

```bash
docker volume create controle-de-despesas_pb_data
docker run --rm \
  -v controle-de-despesas_pb_data:/pb/pb_data \
  -v /tmp/pb_data_migrado:/backup \
  alpine sh -c "cp -a /backup/. /pb/pb_data/"
```

> O nome do volume segue o padrão `<pasta-do-projeto>_pb_data`. Confirme com
> `docker compose config --volumes` antes de criar/popular, caso o nome da
> pasta clonada seja diferente de `controle-de-despesas`.

Se não houver nada para migrar (começando limpo), pule esta parte.

### Subir

```bash
docker compose --env-file .env.production up -d --build
```

Validar:

- `http://IP-DA-VPS:8080` → app carregando
- `http://IP-DA-VPS:8090/_/` → painel admin do PocketBase, com os dados migrados

## Fase 2 — domínio grátis via DuckDNS + HTTPS

1. Crie uma conta grátis em https://www.duckdns.org (login com GitHub/Google).
2. Cadastre **dois** nomes (o free tier permite até 5), ambos apontando para o
   IP público da VPS, ex:
   - `controledespesas.duckdns.org` → frontend
   - `controledespesas-pb.duckdns.org` → PocketBase
3. Em `.env.production`, preencha:
   ```
   FRONTEND_HOST=controledespesas.duckdns.org
   PB_HOST=controledespesas-pb.duckdns.org
   PUBLIC_POCKETBASE_URL=https://controledespesas-pb.duckdns.org
   ```
4. Suba o Caddy junto e reconstrua o frontend (para embutir a nova URL):

```bash
docker compose --env-file .env.production --profile https up -d --build
```

5. Acompanhe a emissão do certificado:

```bash
docker compose logs -f caddy
```

6. A partir daí o app fica em `https://controledespesas.duckdns.org` e o
   PocketBase em `https://controledespesas-pb.duckdns.org`. As portas
   8080/8090 continuam abertas por trás — se quiser, feche-as no firewall e
   deixe só 80/443 públicas.

> Se o IP da VPS mudar no futuro, atualize o IP nos dois nomes no painel do
> DuckDNS (ou configure o script de auto-update deles).

## Desligar o Coolify

Só depois de validar o cutover: pare/remova a aplicação e o PocketBase antigos
no Coolify (e verifique se o Zabbix que rodava junto precisa continuar de pé
em outro lugar) para não ficar com duas instâncias em paralelo.

## Atualizações futuras

```bash
git pull
docker compose --env-file .env.production up -d --build
# ou, se já estiver na fase 2:
docker compose --env-file .env.production --profile https up -d --build
```
