import { DataSource } from "typeorm"
import { Account } from "./entity/Account"
import { Chain } from "./entity/Chain"
import { Transaction } from "./entity/Transaction"

export const AppDataSource = new DataSource({
    type: "mysql",
    host: "localhost",
    port: 3306,
    username: "paipa",
    password: "paipa",
    database: "indexer",
    synchronize: true,
    logging: true,
    entities: [Account, Transaction, Chain],
    migrations: [],
    subscribers: [],
})
