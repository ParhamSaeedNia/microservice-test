CREATE DATABASE catalog;
CREATE DATABASE orders;
CREATE DATABASE inventory;
CREATE DATABASE notifications;

\c orders

CREATE TABLE IF NOT EXISTS public.outbox (
  id uuid PRIMARY KEY,
  aggregate_type text NOT NULL,
  aggregate_id text NOT NULL,
  event_type text NOT NULL,
  payload jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
