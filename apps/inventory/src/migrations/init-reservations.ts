import type { MigrationInterface, QueryRunner } from 'typeorm';

export class InitReservations1710000000001 implements MigrationInterface {
  name = 'InitReservations1710000000001';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS order_stock (
        order_id uuid PRIMARY KEY,
        sku varchar(64) NOT NULL,
        quantity integer NOT NULL,
        state varchar(32) NOT NULL
      )
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS processed_events (
        event_id uuid PRIMARY KEY,
        processed_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS pending_publishes (
        event_id uuid PRIMARY KEY,
        topic text NOT NULL,
        payload jsonb NOT NULL,
        published_at timestamptz
      )
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS pending_publishes`);
    await queryRunner.query(`DROP TABLE IF EXISTS processed_events`);
    await queryRunner.query(`DROP TABLE IF EXISTS order_stock`);
  }
}
