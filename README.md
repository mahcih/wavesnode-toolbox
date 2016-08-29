This toolbox contains scripts to test the Waves' fullnodes & network
Created by mahcih - see https://wavesplatform.slack.com #testnet-maintainers

Some general usage notes:

- Use by calling NodeJS: node tools.js [-param]

- Param balance: displays wallet balances
- Param split  : splits address balance to multiple addresses
- Param merge  : merges all balances in the wallet to one address
- Param spam   : spams the network to perform load testing
- Param faucet : continuously request tokens from waves faucet

- Master node is used for private/secured functions (i.e. send tokens)
- Recipient nodes are used to find remote addresses to send tokens to
- Recipient node can be the same as master node if you only have one node

- Wallet main address is generally the address where you keep the most tokens on
- Wallet main address is used as the main address to split tokens from
- Wallet main address is used as the main address to merge tokens to
- Wallet main address is used to request tokens from faucet;

- Wallet split size is the amount of addresses to split the main address balance over
- Main address should contain enough tokens to split at least walletSplitSize * minSplitAmount
- Split is equally shared over all addresses



