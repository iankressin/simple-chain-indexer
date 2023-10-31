import {MigrationInterface, QueryRunner, TableColumn} from 'typeorm'

export class AddBlocktimeToChain1633401112345 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.addColumn('chain', new TableColumn({
            name: 'blocktime',
            type: 'int',
            isNullable: false,
            unsigned: true,
        }))
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropColumn('chain', 'blocktime')
    }
}
