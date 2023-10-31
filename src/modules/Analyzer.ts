import { AppDataSource } from '../data-source';
import { Transaction } from '../entity/Transaction';
import { Account } from '../entity/Account';
import { DataSource } from 'typeorm';
import { Chain } from '../entity/Chain';
import { ethers, JsonRpcProvider } from 'ethers';

interface Batch {
    startBlock: number
    endBlock: number
    transactions: Transaction[]
}

type AccountBatches = Record<string, Batch[]>

/**
* The main goal of this analysis is to find out if are there users doing a sequence of transactions frequently
* For that we need to figure out the number of wallets that are doing more than one transaction in a defined period of time
*
* Something like: select all transactions, batch them by wallet, and batch them by *10 minutes* timeframes, 
*/
export class Analyzer {
    private dataSource: DataSource
    private chain: Chain

    constructor(dataSource: DataSource) {
        this.dataSource = dataSource
    }

    public async report(): Promise<void> {
        const [accounts, chains] = await Promise.all([
            this.getAllAccounts(),
            this.getAllChains(),
        ])

        for (const chain of chains) {
            const accountBatches: AccountBatches = {}

            await Promise.all(accounts.map(async account => {
                const batches = await this.getAllTransactionsFromAccount(account.address, chain)

                if(batches.length)
                    accountBatches[account.address] = batches
            }))

            const averageTransactionsByBatch = this.getAverageTransactionPerBatch(accountBatches)
            const transactionsInBatchMode = this.getBatchesModeWithMoreThanOneTransaction(accountBatches)
            const mostUsedContracts = await this.getMostUsedContracts(chain)

            console.log(
                `==================== CHAIN: ${ chain.name } ====================`,
                {
                    averageTransactionsByBatch,
                    transactionsInBatchMode,
                    mostUsedContracts,
                },
                '========================== END =========================='
            )
        }
    }

    private getBatchesModeWithMoreThanOneTransaction(accountBatches: AccountBatches) {
        const mode:  Record<number, number> = {}

        Object.keys(accountBatches).map(key => {
            accountBatches[key].map(batch => { 
                mode[batch.transactions.length] = mode[batch.transactions.length] 
                    ? Number(mode[batch.transactions.length]) + 1
                    : 1 
            })
        }, )

        return mode
    }

    private getAccountWithMostBatches() {}

    // TODO: add contract name
    private async getMostUsedContracts(chain: Chain) {
        const provider = new JsonRpcProvider(chain.rpc)
        const contracts = await this.dataSource.getRepository(Transaction)
            .createQueryBuilder("transaction")
            .select("transaction.to")
            .addSelect("COUNT(*)", "count")
            .where("transaction.chain = :chain", { chain: chain.id })
            .groupBy("transaction.to")
            .orderBy("count", "DESC")
            .limit(20)
            .getRawMany();

        return (await Promise.all(contracts.map(async contract => {
           const code = await provider.getCode(contract.toAddress) 

           if (code === '0x') {
               console.log('not contract')

               return
           }

            return contract
        }))).filter(c => !!c)
    }

    private getAverageTransactionPerBatch(accounts: AccountBatches): number {
        const keys = Object.keys(accounts)
        const totalBatches = keys.reduce((acc, key) => acc + accounts[key].length, 0)
        const averageBatchesPerAccount = totalBatches / keys.length

        keys.reduce((acc, key) => {
            const totalAccountBatches = accounts[key].length

            if (!totalAccountBatches)
                return acc

            const totalTransactions = accounts[key].reduce((acc, batch)=> acc + batch.transactions.length, 0)

            return acc + totalTransactions / totalAccountBatches 
        }, 0)

        return averageBatchesPerAccount
    }

    private getAllAccounts(): Promise<Account[]> {
         return this.dataSource.getRepository(Account)
            .createQueryBuilder('account')
            .select()
            .getMany()
    }

    private async getAllChains() {
        return this.dataSource.getRepository(Chain)
        .createQueryBuilder('chain')
        .select()
        .getMany()
    }

    private async getAllTransactionsFromAccount(address: string, chain: Chain) {
        const transactions = await this.dataSource.getRepository(Transaction)
            .createQueryBuilder('transaction')
            .select()
            .where('transaction.from = :from', { from: address })
            .andWhere('transaction.chain = :chain', { chain: chain.id })
            .orderBy('transaction.block')
            .getMany()
        

        return this.batchTransactionsByBlockOffset(transactions, chain.blocktime)
    }


    // Transactions separated in batches where the block number of a transaction needs to be within 10 blocks of one of other batches
    // If not, create a new batch
    private batchTransactionsByBlockOffset(transactions: Transaction[], blocktime: number) {
        const timeToAnalyze = 5 * 60 // 5 minutes
        const defaultBlockOffset = timeToAnalyze / blocktime
        const batches: Batch[] = []

        transactions.map(transaction => {
            const batch = batches.find(batch =>
                this.isInBetweenBlocks(transaction.block, batch.startBlock, batch.endBlock)
            )

            if (batch)
                batch.transactions.push(transaction)
            else
                batches.push({
                    startBlock: transaction.block,
                    endBlock: transaction.block + defaultBlockOffset,
                    transactions: [transaction],
                })
        })

        return batches
    }

    private isInBetweenBlocks(block: number, start: number, end: number) {
        return block >= start && block < end
    }
}

(async () => {
    const dataSource = await AppDataSource.initialize()

    await new Analyzer(dataSource).report()
})()
