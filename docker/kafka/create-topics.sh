#!/bin/sh
set -eu
bootstrap="${KAFKA_BOOTSTRAP:-kafka:19092}"
for topic in orders.order-placed orders.order-cancelled inventory.stock-reserved inventory.reservation-failed; do
  /opt/kafka/bin/kafka-topics.sh --bootstrap-server "$bootstrap" --create --if-not-exists --topic "$topic" --partitions 1 --replication-factor 1
done
