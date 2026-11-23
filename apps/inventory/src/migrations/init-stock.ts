import type { MigrationInterface, QueryRunner } from 'typeorm';

export class InitStock1710000000000 implements MigrationInterface {
  name = 'InitStock1710000000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS stock (
        sku varchar(64) PRIMARY KEY,
        on_hand integer NOT NULL
      )
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS stock`);
  }
}
