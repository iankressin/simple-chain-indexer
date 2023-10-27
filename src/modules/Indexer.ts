import 'reflect-metadata'
import { JsonRpcProvider } from "ethers";
import { Chain } from '../entity/Chain'
import { Account } from '../entity/Account'
import { Transaction } from '../entity/Transaction'
import { AppDataSource } from '../data-source';
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

        await Promise.all(
            block.transactions.map(txHash => this.handleTransaction(txHash))
        ).catch()
    }

    private async handleTransaction(txHash: string): Promise<Transaction | undefined> {
        const tx = await this.provider.getTransaction(txHash)

        if (!tx.from || !tx.to)
            return

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

        if (!address)
            console.log('DOESNT HAVE ADDRESS ===> ', { address })

        await this.dataSource.manager.upsert(Account, account, {
            skipUpdateIfNoValuesChanged: true,
            conflictPaths: [],
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

    // TODO: maybe arrow function can be removed and we can pass .save function directly to map
    await Promise.all(chains.map(chain => dataSource.manager.save(chain)))
    await new Indexer(ethereum).watch().catch(console.log)
})()

