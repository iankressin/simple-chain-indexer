import { AppDataSource } from '../data-source';
import { Transaction } from '../entity/Transaction';
import { Account } from '../entity/Account';
import { DataSource } from 'typeorm';
import { group } from 'console';

/**
* The main goal of this analysis is to find out if are there users doing a sequence of transactions frequently
* For that we need to figure out the number of wallets that are doing more than one transaction in a defined period of time
*
* Something like: select all transactions, group them by wallet, and group them by *10 minutes* timeframes, 
*/
export class Analyzer {
    private dataSource: DataSource

    constructor(dataSource: DataSource) {
        this.dataSource = dataSource
    }

    public async report(): Promise<void> {
        const users = await this.getAllUsers()

        const accountTransactions = await Promise.all(users.map(user => this.getAllTransactionsFromAccount(user.address)))
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
        

        console.log('Transactions: ', address, transactions.length)
    }

    // Transactions separated in groups where the block number of a transaction needs to be within 10 blocks of one of other groups
    // If not, create a new group
    private groupTransactionsByBlockOffset(transactions: Transaction[]) {
        const defaultBlockOffset = 40 // ~ 10 minutes

        const groups: {
            startBlock: number
            endBlock: number
            transactions: Transaction[]
        }[] = []

        transactions.map(transaction => {
            const group = groups.find(group =>
                this.isInBetweenBlocks(transaction.block, group.startBlock, group.endBlock)
            )

            if (group)
                group.transactions.push(transaction)
            else
                groups.push({
                    startBlock: transaction.block,
                    endBlock: transaction.block + defaultBlockOffset,
                    transactions: [transaction],
                })
        })

        console.log(groups)
    }

    private isInBetweenBlocks(block: number, start: number, end: number) {
        return block >= start && block < end
    }
}

(async () => {
    const dataSource = await AppDataSource.initialize()

    await new Analyzer(dataSource).report()
})()
