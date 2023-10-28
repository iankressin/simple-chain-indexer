import { AppDataSource } from '../data-source';
import { Transaction } from '../entity/Transaction';
import { Account } from '../entity/Account';
import { DataSource } from 'typeorm';

interface Group {
    startBlock: number
    endBlock: number
    transactions: Transaction[]
}

type AccountGroups = Record<string, Group[]>

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

        const accounts: AccountGroups = {}

        await Promise.all(users.map(async account => {
            const accountGroups = await this.getAllTransactionsFromAccount(account.address)

            if(accountGroups.length)
                accounts[account.address] = accountGroups
        }))

        const averageGroupsPerAccount = this.getAvarageGroupsPerAccount(accounts)
        const mode = this.getGroupsMode(accounts)

        console.log({
            averageGroupsPerAccount,
            mode,
        })
    }

    private getGroupsMode(accountGroups: AccountGroups) {
        const mode = Object.keys(accountGroups).reduce((acc, key) => {
            const groupsLength = accountGroups[key].length

            acc[groupsLength] = acc[groupsLength] + 1

            return acc
        }, {} as Record<number, number>)

        return mode
    }

    private getMostUsedContracts() {
        const mostUsedContract = this.dataSource.getRepository(Transaction)
            .
    }

    private getAvarageGroupsPerAccount(accounts: AccountGroups): number {
        const keys = Object.keys(accounts)
        const totalGroups = keys.reduce((acc, key) => acc + accounts[key].length, 0)
        const averageGroupsPerAccount = totalGroups / keys.length

        return averageGroupsPerAccount
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
        

        return this.groupTransactionsByBlockOffset(transactions)
    }

    // Transactions separated in groups where the block number of a transaction needs to be within 10 blocks of one of other groups
    // If not, create a new group
    private groupTransactionsByBlockOffset(transactions: Transaction[]) {
        const defaultBlockOffset = 40 // ~ 10 minutes
        const groups: Group[] = []

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

        return groups
    }

    private isInBetweenBlocks(block: number, start: number, end: number) {
        return block >= start && block < end
    }
}

(async () => {
    const dataSource = await AppDataSource.initialize()

    await new Analyzer(dataSource).report()
})()
