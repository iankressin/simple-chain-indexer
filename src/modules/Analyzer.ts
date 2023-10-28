import { AppDataSource } from '../data-source';
import { Transaction } from '../entity/Transaction';
import { Account } from '../entity/Account';
import { DataSource } from 'typeorm';

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

    constructor(dataSource: DataSource) {
        this.dataSource = dataSource
    }

    public async report(): Promise<void> {
        const users = await this.getAllUsers()

        const accounts: AccountBatches = {}

        await Promise.all(users.map(async account => {
            const accountBatches = await this.getAllTransactionsFromAccount(account.address)

            if(accountBatches.length)
                accounts[account.address] = accountBatches
        }))

        const averageTransactionsByBatch = this.getAverageTransactionPerBatch(accounts)
        const transactionsInBatchMode = this.getBatchesModeWithMoreThanOneTransaction(accounts)

        console.log({
            averageTransactionsByBatch,
            transactionsInBatchMode,
        })
    }

    private getBatchesModeWithMoreThanOneTransaction(accountBatches: AccountBatches) {
        // {
        //  '0x1..': [
        //      { start, end, txs }
        //      { start, end, txs }
        //      { start, end, txs }
        //  ],
        //  '0x2..': [
        //      { start, end, txs }
        //      { start, end, txs }
        //      { start, end, txs }
        //  ]
        //  '0x3..': [
        //      { start, end, txs }
        //      { start, end, txs }
        //      { start, end, txs }
        //  ]
        // }


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

    private getMostUsedContracts() {}

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

    private getAllUsers(): Promise<Account[]> {
         return this.dataSource.getRepository(Account)
            .createQueryBuilder('account')
            .select()
            .getMany()
    }

    private async getAllTransactionsFromAccount(address: string)/*: Promise<Record<string, Transaction[][]>>*/ {
        const transactions = await this.dataSource.getRepository(Transaction)
            .createQueryBuilder('transaction')
            .select()
            .where('transaction.from = :from', { from: address })
            .orderBy('transaction.block')
            .getMany()
        

        return this.batchTransactionsByBlockOffset(transactions)
    }

    // Transactions separated in batches where the block number of a transaction needs to be within 10 blocks of one of other batches
    // If not, create a new batch
    private batchTransactionsByBlockOffset(transactions: Transaction[]) {
        const defaultBlockOffset = 20 // ~ 4 minutes
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
