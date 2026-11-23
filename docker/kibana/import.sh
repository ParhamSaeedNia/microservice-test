#!/bin/sh
set -eu
until curl -sf http://kibana:5601/api/status >/dev/null; do
  sleep 3
done
curl -sf -X POST "http://kibana:5601/api/saved_objects/_import?overwrite=true" \
  -H "kbn-xsrf: true" \
  --form file=@/saved.ndjson
echo "Kibana saved objects imported"
