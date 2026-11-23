#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
connect_url="${CONNECT_URL:-http://localhost:8083}"
body_file="$(mktemp)"
trap 'rm -f "$body_file"' EXIT

echo "Waiting for Kafka Connect at ${connect_url}"
for _ in $(seq 1 60); do
  if curl -sf "${connect_url}/connectors" >/dev/null; then
    break
  fi
  sleep 2
done

if ! curl -sf "${connect_url}/connectors" >/dev/null; then
  echo "Kafka Connect did not become ready" >&2
  exit 1
fi

status="$(curl -s -o "$body_file" -w "%{http_code}" \
  -X POST "${connect_url}/connectors" \
  -H "Content-Type: application/json" \
  --data-binary @"${root}/docker/debezium/orders-outbox.json")"

if [[ "$status" == "201" || "$status" == "409" ]]; then
  echo "orders-outbox connector is registered (${status})"
  exit 0
fi

echo "Connector registration failed with HTTP ${status}" >&2
cat "$body_file" >&2
exit 1
