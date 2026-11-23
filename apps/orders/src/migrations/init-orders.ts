import type { MigrationInterface, QueryRunner } from 'typeorm';

export class InitOrders1710000000000 implements MigrationInterface {
  name = 'InitOrders1710000000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id uuid PRIMARY KEY,
        sku varchar(64) NOT NULL,
        quantity integer NOT NULL,
        unit_price integer NOT NULL,
        customer_id uuid NOT NULL,
        status varchar(32) NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS outbox (
        id uuid PRIMARY KEY,
        aggregate_type text NOT NULL,
        aggregate_id text NOT NULL,
        event_type text NOT NULL,
        payload jsonb NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS processed_events (
        event_id uuid PRIMARY KEY,
        processed_at timestamptz NOT NULL DEFAULT now()
      )
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS processed_events`);
    await queryRunner.query(`DROP TABLE IF EXISTS outbox`);
    await queryRunner.query(`DROP TABLE IF EXISTS orders`);
  }
}
