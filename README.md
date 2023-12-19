# Transaction Bundles Analyzer

## About

This repo tries to undestand the behavior of EOA on various EVM chains regarding the execution of batches of trasactions.
The `Analyzer` generates the following data: 
- Average amount of transactions executed by a single wallet in a given time frame and the 
- [Mode](https://en.wikipedia.org/wiki/Mode_(statistics)) of batches of transactions
- Most used contracts by chain


## Run the project

1. Run `npm i` command
2. Run `sudo docker compose up`
3. Run `npx ts-node ./src/modules/Index.ts` to start recording the trasactions to the database
4. Run `npx ts-node ./src/modules/Analyzer.ts` to generated the reports
