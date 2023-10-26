// extract block transactions
// decode the transactions
// check if sender is EOA, if it isn't interrupt => not interested in contracts for now
// store user transaction in a table o EOA transactions
// the goal is to later analyze and check if EOAs are 
// - doing multiple transactions in a short period of time
import 'reflect-metadata'
import { JsonRpcProvider } from "ethers";
import { Chain } from './entity/Chain'
import { Account } from './entity/Account'
import { Transaction } from './entity/Transaction'
import { AppDataSource } from './data-source';
import { DataSource } from 'typeorm';

class Indexer {
    private chain: Chain
    private provider: JsonRpcProvider
    private dataSource: DataSource

    constructor(chain: Chain) {
        this.chain = chain
        this.provider = new JsonRpcProvider(chain.rpc)
        this.dataSource = AppDataSource
    }

    public async watch() {
        await this.provider.on(
            'block',
            blockNumber => this.handleBlock(blockNumber)
        )
    }

    private async handleBlock(blockNumber: number) {
        const block = await this.provider.getBlock(blockNumber)

        if (!block) {
            console.log('Blocknumber doesnt exist on the RPC yet')
            return 
        }

        const transactionPromises = block.transactions.map(async txHash => {
            this.handleTransaction(txHash)
        })

        await Promise.all(transactionPromises)

        console.log('mined')
    }

    private async handleTransaction(txHash: string): Promise<Transaction> {
        const tx = await this.provider.getTransaction(txHash)

        const [from, to] = await Promise.all([
            await this.createAccount(tx.from),
            await this.createAccount(tx.to),
        ])

        const transaction = new Transaction()
        transaction.from = from
        transaction.to = to
        transaction.hash = tx.hash
        transaction.block = tx.blockNumber
        transaction.chain = this.chain

        return this.dataSource.manager.save(transaction)
    }

    private async createAccount(address: string): Promise<Account> {
        const account = new Account()
        account.address = address

        await this.dataSource.manager.upsert(Account, account, {
            skipUpdateIfNoValuesChanged: true,
            conflictPaths: ['address'],
        })

        return account
    }
}

(async () => {
    const ethereum = new Chain()
    ethereum.name = 'Ethereum'
    ethereum.id = 1
    ethereum.rpc = 'https://rpc.ankr.com/eth'

    const chains = [
        ethereum,
    ]

    const dataSource = await AppDataSource.initialize()

    await Promise.all(chains.map(chain => dataSource.manager.save(chain)))
    await new Indexer(ethereum).watch().catch(console.log)
})()


// import { AppDataSource } from "./data-source"
// import { User } from "./entity/User"
//
// AppDataSource.initialize().then(async () => {
//
//     console.log("Inserting a new user into the database...")
//     const user = new User()
//     user.firstName = "Timber"
//     user.lastName = "Saw"
//     user.age = 25
//     await AppDataSource.manager.save(user)
//     console.log("Saved a new user with id: " + user.id)
//
//     console.log("Loading users from the database...")
//     const users = await AppDataSource.manager.find(User)
//     console.log("Loaded users: ", users)
//
//     console.log("Here you can setup and run express / fastify / any other framework.")
//
// }).catch(error => console.log(error))
//
