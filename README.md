# Market

Five NestJS apps in one npm workspace. Catalog, orders, inventory, and notifications each own a Postgres database. The dispatcher only forwards inventory events to RabbitMQ.

Postgres is the system of record. Debezium publishes the orders outbox to Kafka. Kafka carries domain events. RabbitMQ carries the notification command. The diagram and the reason for each hop are in [docs/architecture.md](docs/architecture.md).

## Prerequisites

- Node.js 22
- npm
- Docker with Compose

`wal_level=logical` is required. Debezium cannot start without it. The Postgres service sets it in `docker-compose.yml`.

## Start the infrastructure

```bash
cp .env.example .env
docker compose up -d
```

Wait until the healthchecks are green. `docker compose ps` should show postgres, kafka, kafka-connect, rabbitmq, elasticsearch, logstash, kibana, prometheus, and grafana as healthy. `kibana-init` exits after it imports the index pattern.

Register the outbox connector after Connect is healthy. The script waits for Connect and treats an existing connector as success.

```bash
./scripts/register-debezium.sh
```

Host apps use `localhost:9094` for Kafka. Containers use `kafka:19092`.

## Start the apps

From the repo root, in separate terminals:

```bash
npm install
npm run start:dev -w @market/catalog
npm run start:dev -w @market/orders
npm run start:dev -w @market/inventory
npm run start:dev -w @market/notifications
npm run start:dev -w @market/dispatcher
```

`npm run start:dev` with no workspace starts catalog.

Ports: catalog 3001, orders 3002, inventory 3003, notifications 3004, dispatcher 3005. Grafana uses 3000.

Logs are JSON on stdout and, when `LOG_DIR` is set, in that directory. `.env.example` sets `LOG_DIR=../../logs` so a workspace script writes `logs/<service>.log` at the repo root. Logstash tails that directory. The index pattern is `market-logs-*`.

To run the apps in Docker instead:

```bash
docker compose --profile apps up -d --build
```

## Place an order

Catalog seeds three products when its table is empty: `mug` at 1299 cents, `notebook` at 1899, `pen` at 499. Inventory seeds `onHand` 100 for each sku and does not reset it on restart.

```bash
curl -s http://localhost:3003/stock/mug
curl -s -X POST http://localhost:3002/orders \
  -H 'content-type: application/json' \
  -d '{"sku":"mug","quantity":2,"customerId":"11111111-1111-4111-8111-111111111111"}'
```

The response is 201 and `status` is `placed`. The HTTP call returns after the local transaction commits. Inventory then reserves stock, the dispatcher sends a command, and the notification row shows up:

```bash
curl -s 'http://localhost:3004/notifications?customerId=11111111-1111-4111-8111-111111111111'
```

Cancel writes one `orders.order-cancelled` outbox row. A second cancel is 409.

```bash
curl -s -X POST http://localhost:3002/orders/<id>/cancel
```

## Consoles

- Catalog Swagger: http://localhost:3001/docs
- Orders Swagger: http://localhost:3002/docs
- Inventory Swagger: http://localhost:3003/docs
- Notifications Swagger: http://localhost:3004/docs
- Kibana: http://localhost:5601 (index pattern `market-logs-*`, saved search "orders errors")
- Grafana: http://localhost:3000 (admin / the value of `GRAFANA_ADMIN_PASSWORD`, default `admin`)
- Prometheus: http://localhost:9090
- RabbitMQ management: http://localhost:15672 (`market` / `market`)

## Tests

`npm test` and `npm run test:e2e` do not need Docker. The orders integration test runs only when `RUN_INTEGRATION=1` and skips if Docker is unavailable.

```bash
npm test
npm run test:e2e
RUN_INTEGRATION=1 npm test
```
