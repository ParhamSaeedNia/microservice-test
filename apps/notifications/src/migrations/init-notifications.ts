import type { MigrationInterface, QueryRunner } from 'typeorm';

export class InitNotifications1710000000000 implements MigrationInterface {
  name = 'InitNotifications1710000000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id uuid PRIMARY KEY,
        command_id uuid NOT NULL UNIQUE,
        customer_id uuid NOT NULL,
        order_id uuid NOT NULL,
        kind varchar(64) NOT NULL,
        message text NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS notifications`);
  }
}
