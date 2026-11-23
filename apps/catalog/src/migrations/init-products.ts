import type { MigrationInterface, QueryRunner } from 'typeorm';

export class InitProducts1710000000000 implements MigrationInterface {
  name = 'InitProducts1710000000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS products (
        sku varchar(64) PRIMARY KEY,
        name varchar(200) NOT NULL,
        price integer NOT NULL,
        published boolean NOT NULL DEFAULT true,
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS products`);
  }
}
