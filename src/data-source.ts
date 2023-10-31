import { DataSource } from "typeorm"
import { Account } from "./entity/Account"
import { Chain } from "./entity/Chain"
import { Transaction } from "./entity/Transaction"
import { AddBlocktimeToChain1633401112345 } from "./migration/1698514782831-AddBlocktimeToChain"
import { ChangeBlocktimeToDouble1698515881784 } from "./migration/1698515881784-ChangeBlocktimeToDouble"

export const AppDataSource = new DataSource({
    type: "mysql",
    host: "localhost",
    port: 3306,
    username: "paipa",
    password: "paipa",
    database: "indexer",
    synchronize: true,
    logging: false,
    entities: [Account, Transaction, Chain],
    migrations: [
        AddBlocktimeToChain1633401112345,
        ChangeBlocktimeToDouble1698515881784,
    ],
    subscribers: [],
})
