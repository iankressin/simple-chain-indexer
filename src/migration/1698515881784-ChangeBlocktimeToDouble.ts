import { MigrationInterface, QueryRunner, TableColumn } from "typeorm"

export class ChangeBlocktimeToDouble1698515881784 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.changeColumn("chain", "blocktime", 
            new TableColumn({
                name: "blocktime",
                type: "double",
                isNullable: false, // Adjust based on your needs
            })
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.changeColumn("chain", "blocktime",
            new TableColumn({
                name: "blocktime",
                type: "int",
                isNullable: true, // Adjust based on your needs
                unsigned: true,
            })
        );
    }

}
