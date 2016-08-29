//Settings
var request = require('request');
var masterNodeIP = '127.0.0.1:6869';
var masterNodeAPIKey = 'YOUR_API_KEY';
var walletMainAddress = 'YOUR_MAIN_ADDRESS';
var faucetNodeIP = '52.30.47.67:9000';

var remoteNodeIPs = ['IP1:6869', 'IP2:6869', 'IPx:6869'];

var walletSplitSize = 10;
var minSplitAmount = 100000000;
var maxSpamTransactions = 100;

var transactionAmount = 1;
var transactionFee = 1;

var minReqDelay = 50;
var minSpamAmount = 11;
var maxSpamAmount = 20;
var minSpamFee = 1;
var maxSpamFee = 10;
var minSpamDelay = 250;
var maxSpamDelay = 1500;
var maxFailures = 10;

//Program variables
var stepNo = 0;
var failCount = 0;
var splitCount = 0;
var nodeCount = 0;
var spamCount = 0;
var faucetCount = 0;

var feeCosts = 0;
var mainBalance = 0;
var walletBalance = 0;
var requiredBalance = 0;
var balancePerAddress = 0;

var walletBalances = [];
var walletAddresses = [];
var recipientAddresses = [];

var walletMainAddressFound = false;
var walletMainBalanceSufficient = false;
var spamBalanceSufficient = false;

//Get addresses from the wallet on the master node
var getWalletAddresses = function(callback) {
    walletAddresses = [];
    console.log('Retrieving wallet addresses...');

    request.get({ url: 'http://' + masterNodeIP + '/addresses', headers: { "Accept": "application/json" } }, function(err, response, body) {
        if (!err) {
            walletAddresses = JSON.parse(body);
            console.log('Successfully retrieved addresses, wallet size: ' + walletAddresses.length);
            if(typeof(callback) === "function") callback();
        } else {
            console.log('Unable to retrieve wallet addresses: ' + err);
        }
    });
}

//Get addresses from the wallet on the remote node(s)
var getAllRecipientAddresses = function(callback) {
    recipientAddresses = [];

    if(remoteNodeIPs.length > 0) {
        console.log('Retrieving recipient addresses...');

        nodeCount = 0;
        failCount = 0;
        getRecipientAddresses(function getNextRecipientAddresses() {
            nodeCount++;
            if(nodeCount < remoteNodeIPs.length) {
                setTimeout(function() { getRecipientAddresses(getNextRecipientAddresses); }, minReqDelay);
            } else {
                console.log('Recipient addresses successfully retrieved');
                if(typeof(callback) === "function") callback();
            }
        });
    } else {
        console.log('Unable to retrieve recipient addresses, no IPs available');
    }
}

//Get addresses from the wallet on a specific remote node
var getRecipientAddresses = function(callback) {
    console.log('Retrieving addresses for node ' + remoteNodeIPs[nodeCount] + '...');

    request.get({ url: 'http://' + remoteNodeIPs[nodeCount] + '/addresses', headers: { "Accept": "application/json" } }, function(err, response, body) {
        if (!err) {
            var tmp;
            tmp = JSON.parse(body);
            Array.prototype.push.apply(recipientAddresses, tmp);
            console.log('Successfully retrieved addresses - wallet size: ' + tmp.length + ', total addresses for all recipients: ' + recipientAddresses.length);
        } else {
            failCount++;
            console.log('Unable to retrieve node addresses: ' + err);
        }

        if(failCount >= maxFailures) {
            console.log('Unable to retrieve all recipient addresses, terminating due to too much failures');
        } else {
            if(typeof(callback) === "function") callback();
        }
    });
}

//Get balance of each addresses in the wallet of the master node
var getWalletBalances = function(callback) {
    walletBalances = [];

    if(walletAddresses.length > 0) {
        console.log('Retrieving wallet balances...');

        var i = 0;
        failCount = 0;
        getAddressBalance(walletAddresses[i], function getNextAddressBalance() {
            i++;
            if(i < walletAddresses.length) {
                setTimeout(function() { getAddressBalance(walletAddresses[i], getNextAddressBalance); }, minReqDelay);
            } else {
                console.log('Wallet balances successfully retrieved');
                if(typeof(callback) === "function") callback();
            }
        });
    } else {
        console.log('Unable to retrieve wallet balances, no addresses available');
    }
}

//Get balance of a specific addres in the wallet of the master node
var getAddressBalance = function(address, callback) {
    console.log('Retrieving address balance...');

    request.get({ url: 'http://' + masterNodeIP + '/addresses/balance/' + address, headers: { "Accept": "application/json" } }, function(err, response, body) {
        if (!err) {
            var responseData = JSON.parse(body);
            walletBalances[address] = parseInt(responseData.balance);
            console.log('Address ' + address + ' balance: ' + walletBalances[address]);
        } else {
            failCount++;
            console.log('Failed to retrieve balance for address: ' + address + ' => ' + err);
        }

        if(failCount >= maxFailures) {
            console.log('Unable to retrieve address balance, terminating due to too much failures');
        } else {
            if(typeof(callback) === "function") callback();
        }
    });
}

//Verify if the main address is actually in the wallet of the master node
var verifyWalletMainAddress = function(callback) {
    walletMainAddressFound = false;
    console.log('Verifying if specified main address belongs to the wallet...');    

    if(walletAddresses.length > 0) {
        for (var i = 0; i < walletAddresses.length; i++) {
            if(walletAddresses[i].localeCompare(walletMainAddress)) {
                console.log(i + ': ' + walletAddresses[i]);
            } else {
                console.log(i + ': ' + walletAddresses[i] + ' <== main address');
                walletMainAddressFound = true;
            }
        }

        if(walletMainAddressFound) {
            console.log('Wallet main address is valid');
            if(typeof(callback) === "function") callback();
        } else {
            console.log('Unable to find specified main address in wallet');
        }
    } else {
        console.log('Wallet is empty or addresses have not been retrieved yet');
    }
};

//Get balance of the main address in the wallet of the master node
var getMainBalance = function(callback) {
    mainBalance = 0;

    if(walletMainAddressFound) {
        console.log('Retrieving balance for main address of the wallet...');

        request.get({ url: 'http://' + masterNodeIP + '/addresses/balance/' + walletMainAddress, headers: { "Accept": "application/json" } }, function(err, response, body) {
            if (!err) {
                var responseData = JSON.parse(body);
                mainBalance = responseData.balance;
                console.log('Main balance: ' + mainBalance);
                if(typeof(callback) === "function") callback();
            } else {
                console.log('Failed to retrieve balance of main address: ' + err);
            }
        });
    } else {
        console.log('Unable to get balance of main address, wallet main address not available');
    }
}

//Verify if the main address has sufficient tokens to perform a split over multiple addresses
var verifySplitBalance = function(callback) {
    walletMainBalanceSufficient = false;

    if(walletMainAddressFound) {
        console.log('Verifying main address\' ability to perform a split over the requested split size...');

        feeCosts = ((walletSplitSize - 1) * transactionFee);
        requiredBalance = (minSplitAmount * walletSplitSize) + feeCosts;
        balancePerAddress = Math.floor((mainBalance - feeCosts) / walletSplitSize);

        console.log('No. of addresses       : ' + walletSplitSize);
        console.log('Min. amount per address: ' + minSplitAmount);
        console.log('Total fee cost         : ' + feeCosts);
        console.log('--------------------------------------------');
        console.log('Total required         : ' + requiredBalance);
        console.log('Balance available      : ' + mainBalance);

        if(mainBalance > requiredBalance) {
            walletMainBalanceSufficient = true;
            console.log('Balance on main address is sufficient');
            if(typeof(callback) === "function") callback();
        } else {
            console.log('Balance on main address is insufficient');
        }
    } else {
        console.log('Unable to verify split balance, main address not available');
    }
};

//Verify if the addresses in the wallet of the master node have a sufficient total balance to perform the requested amount of random transactions (based on the max fee & amount)
var verifySpamBalance = function(callback) {
    spamBalanceSufficient = false;

    if(Object.keys(walletBalances).length > 0) {
        console.log('Verifying wallets ability to perform random transactions for the requested spam amount...');

        feeCosts = maxSpamTransactions * maxSpamFee;
        requiredBalance = (maxSpamTransactions * maxSpamAmount) + feeCosts;

        console.log('Amount of random trans.: ' + maxSpamTransactions);
        console.log('Amount per transaction : ' + maxSpamAmount);
        console.log('Fee per transaction    : ' + maxSpamFee);
        console.log('--------------------------------------------');
        console.log('Total required (max.)  : ' + requiredBalance + ' (incl. fee of ' + feeCosts + ')');

        walletBalance = 0;
        for (var key in walletBalances) {
            if (!walletBalances.hasOwnProperty(key)) {
                continue;
            }
            walletBalance += walletBalances[key];
        }

        console.log('Amount of addresses    : ' + Object.keys(walletBalances).length);
        console.log('Total balance available: ' + walletBalance);

        if(walletBalance >= requiredBalance) {
            spamBalanceSufficient = true;
            console.log('Wallet balance is sufficient');
            if(typeof(callback) === "function") callback();
        } else {
            console.log('Balance in wallet is insufficient');
        }
    } else {
        console.log('Unable to verify wallet balance, no balances available');
    }
}

//Prepares the wallet on the master node to contain sufficient addresses for a balance split
var initializeWallet = function(callback) {
    console.log('Initializing wallet...');
    console.log('Addresses required : ' + walletSplitSize);
    console.log('Addresses available: ' + walletAddresses.length);

    if(walletAddresses.length < walletSplitSize) {
        console.log('Insufficient addresses available, generating new addresses...');

        failCount = 0;
        generateAddress(function generateNextAddress() {
            if(walletAddresses.length < walletSplitSize) {
                setTimeout(function() { generateAddress(generateNextAddress); }, minReqDelay);
            } else {
                console.log('Wallet successfully initialized');
                if(typeof(callback) === "function") callback();
            }
        });
    } else {
        console.log('Wallet size sufficient, no initialization necessary');
        if(typeof(callback) === "function") callback();
    }
};

//Generates a new address in the wallet on the master node
var generateAddress = function(callback) {
    console.log('Generating address ' + (walletAddresses.length + 1) + ' of ' + walletSplitSize + '...');
    request.post({ url: 'http://' + masterNodeIP + '/addresses', headers: { "Accept": "application/json", "Content-Type": "application/json", "api_key": masterNodeAPIKey } }, function(err, response, body) {
        if (!err) {
            var responseData = JSON.parse(body);
            walletAddresses.push(responseData.address);
            console.log('Generated address ' + walletAddresses.length);
        } else {
            console.log('Unable to generate addresses ' + (walletAddresses.length + 1) + ', failcount: ' + ++failCount + ' (' + err + ')');
        }

        if(failCount >= maxFailures) {
            console.log('Unable to generate new addresses, terminating due to too much failures');
        } else {
            if(typeof(callback) === "function") callback();
        }
    });
};

//Splits the balance in the main address of the master node wallet over multiple addresses in the master node wallet
var splitBalance = function(callback) {
    if(walletMainAddressFound && walletMainBalanceSufficient && walletAddresses.length >= walletSplitSize && walletAddresses.length >= 2) {
        console.log('Splitting a total of ' + mainBalance + ' tokens over ' + walletSplitSize + ' addresses (' + balancePerAddress + ' tokens per address, total fee: ' + feeCosts);

        failCount = 0;
        splitCount = 0;
        sendSplit(function sendNextSplit() {
            if(splitCount < walletSplitSize) {
                setTimeout(function() { sendSplit(sendNextSplit); }, minReqDelay);
            } else {
                console.log('Main address balance successfully split over ' + walletSplitSize + ' addresses');
                if(typeof(callback) === "function") callback();
            }
        });
    } else {
        console.log('Unable to split balance, invalid main address, insufficient funds or wallet not initialized');
    }
};

//Sends part of the balance in the main address of the master node wallet to a specific address of the master node wallet to split the balance
var sendSplit = function(callback) {
    if(walletMainAddressFound && walletMainBalanceSufficient && splitCount < walletAddresses.length && balancePerAddress > minSplitAmount) {
        var recipientAddress = walletAddresses[splitCount];
        console.log('Splitting balance to ' + recipientAddress + '(Address ' + (splitCount + 1) + ' of ' + walletSplitSize + ')');

        if(!walletAddresses[splitCount].localeCompare(walletMainAddress)) {
            console.log('Split ' + ++splitCount + ' skipped, this is the main address');
            if(typeof(callback) === "function") callback();
        } else {
            var payment = {
                "amount": balancePerAddress,
                "fee": transactionFee,
                "sender": walletMainAddress,
                "recipient": recipientAddress
            };

            request.post({ url: 'http://' + masterNodeIP + '/payment', json: payment, headers: { "Accept": "application/json", "Content-Type": "application/json", "api_key": masterNodeAPIKey } }, function(err, response, body) {
                if (!err) {
                    console.log('Split ' + ++splitCount + ' succeeded!');
                } else {
                    console.log('Unable to perform split ' + (splitCount + 1) + ', failcount: ' + ++failCount + ' (' + err + ')');
                }

                if(failCount >= maxFailures) {
                    console.log('Unable to split balance, terminating due to too much failures');
                } else {
                    if(typeof(callback) === "function") callback();
                }
            });
        }
    } else {
        console.log('Unable to send split amount, invalid main address, insufficient funds, addresses array index out of bounds or balance per address less than minimum amount for split');
    }
};

//Merges the balances of all addresses in the master node wallet to the main address of the master node wallet
var mergeBalances = function(callback) {
    if(walletMainAddressFound && walletAddresses.length > 1) {
        console.log('Merging all balances in wallet to the main address');

        failCount = 0;
        mergeCount = 0;
        sendMerge(function sendNextMerge() {
            if(mergeCount < walletAddresses.length) {
                setTimeout(function() { sendMerge(sendNextMerge); }, minReqDelay);
            } else {
                console.log('Wallet balances successfully merged');
                if(typeof(callback) === "function") callback();
            }
        });
    } else {
        console.log('Unable to merge balances, invalid main address or insufficient addresses available');
    }
}

//Sends the total balance of a specific address of an address on the master node wallet to the main address on the master node wallet
var sendMerge = function(callback) {
    if(walletMainAddressFound && walletAddresses.length > 1) {
        if(walletAddresses[mergeCount] in walletBalances) {
            var mergeAddress = walletAddresses[mergeCount];
            var mergeBalance = walletBalances[walletAddresses[mergeCount]];

            console.log('Merging balance of ' + mergeAddress + '(Address ' + (mergeCount + 1) + ' of ' + walletAddresses.length + ')');

            if(!mergeAddress.localeCompare(walletMainAddress)) {
                console.log('Merge ' + ++mergeCount + ' skipped, this is the main address');
                if(typeof(callback) === "function") callback();
            } else if(mergeBalance < (transactionFee + 1)) {
                console.log('Merge ' + ++mergeCount + ' skipped, balance too low to cover fee + amount');
                if(typeof(callback) === "function") callback();
            } else {
                var payment = {
                    "amount": mergeBalance - transactionFee,
                    "fee": transactionFee,
                    "sender": mergeAddress,
                    "recipient": walletMainAddress
                };

                request.post({ url: 'http://' + masterNodeIP + '/payment', json: payment, headers: { "Accept": "application/json", "Content-Type": "application/json", "api_key": masterNodeAPIKey } }, function(err, response, body) {
                    if (!err) {
                        console.log('Merge ' + ++mergeCount + ' succeeded!');
                    } else {
                        console.log('Unable to perform merge ' + (mergeCount + 1) + ', failcount: ' + ++failCount + ' (' + err + ')');
                    }

                    if(failCount >= maxFailures) {
                        console.log('Unable to merge address balance, terminating due to too much failures');
                    } else {
                        if(typeof(callback) === "function") callback();
                    }
                });
            }
        } else {
            console.log('Unable to merge balance of address ' + walletAddresses[mergeCount] + ', balance unknown - failcount: ' + ++failCount);
            if(typeof(callback) === "function") callback();
        }
    } else {
        console.log('Unable to merge wallet balances, invalid main address or insufficient addresses available');
    }
};

//Sends a random amount of tokens with a random fee from a random master node address to a random remote node address
var sendRandomTransactions = function() {
    if(walletAddresses.length > 0 && Object.keys(walletBalances).length > 0 && recipientAddresses.length > 0) {

        var randomSenderNo = randomIntFromInterval(0, (walletAddresses.length - 1));
        var randomRecipientNo = randomIntFromInterval(0, (recipientAddresses.length - 1));

        var randomSender = walletAddresses[randomSenderNo];
        var randomRecipient = recipientAddresses[randomRecipientNo];

        if(randomSender in walletBalances && walletBalances[randomSender] > (transactionFee + transactionAmount)) {
            var payment = {
                "amount": randomIntFromInterval(minSpamAmount, maxSpamAmount),
                "fee": randomIntFromInterval(minSpamFee, maxSpamFee),
                "sender": randomSender,
                "recipient": randomRecipient
            };

            request.post({ url: 'http://' + masterNodeIP + '/payment', json: payment, headers: { "Accept": "application/json", "Content-Type": "application/json", "api_key": masterNodeAPIKey } }, function(err, response, body) {
                if (!err) {
                    walletBalances[randomSender] -= (transactionFee + transactionAmount);
                    console.log(++spamCount + ' count succeeded! ' + JSON.stringify(body));
                } else {
                    console.log('Unable to send random transaction ' + (spamCount + 1) + ' - failcount: ' + ++failCount + ', err: ' + err);
                }

                if(failCount >= maxFailures) {
                    console.log('Unable to continue random transactions, terminating due to too much failures');
                } else if (spamCount < maxSpamTransactions) {
                    setTimeout(function() { sendRandomTransactions(); }, randomIntFromInterval(minSpamDelay, maxSpamDelay));
                }
            });
        } else {
            console.log('Unable to send random transaction from ' + randomSender + ', address balance not available or insufficient funds - failCount: ' + ++failCount);
            walletAddresses.splice(randomSenderNo, 1);
            setTimeout(function() { sendRandomTransactions(); }, minReqDelay);
        }
    } else {
        console.log('Unable to send random transaction, check wallet addresses, balances or recipient addresses');
    }
};

//Continuously request waves faucet for tokens to increase balance on main address in the master node wallet
var faucetRequest = function() {
    var recipientData = {
        "recipient": walletMainAddress
    };

    request.post({ url: 'http://' + faucetNodeIP + '/payment', json: recipientData, headers: { "Accept": "application/json", "Content-Type": "application/json" } }, function(err, response, body) {
        if (!err) {
            console.log('Faucet request ' + ++faucetCount + ' ==> ' + JSON.stringify(body));
        } else {
            console.log('Faucet request FAILED: ' + err);
        }
        setTimeout(function() { faucetRequest(); }, 1005000);
    });
};


//Generates a random integer between min & max (incl.)
var randomIntFromInterval = function(min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min);
}

//Display balances of all addresses on the master node
var displayWalletBalances = function() {
    stepNo++;

    switch(stepNo) {
        case 1: getWalletAddresses(displayWalletBalances); break;
        case 2: getWalletBalances(displayWalletBalances); break;
    }
}

//Splits the balance of the main address in the master node wallet to other addresses in the master node wallet
var performBalanceSplit = function() {
    stepNo++;

    switch(stepNo) {
        case 1: getWalletAddresses(performBalanceSplit); break;
        case 2: verifyWalletMainAddress(performBalanceSplit); break;
        case 3: getMainBalance(performBalanceSplit); break;
        case 4: verifySplitBalance(performBalanceSplit); break;
        case 5: initializeWallet(performBalanceSplit); break;
        case 6: splitBalance(performBalanceSplit); break;
    }
}

//Merges the balances of all master node addresses to the main address
var performBalanceMerge = function() {
    stepNo++;

    switch(stepNo) {
        case 1: getWalletAddresses(performBalanceMerge); break;
        case 2: getWalletBalances(performBalanceMerge); break;
        case 3: verifyWalletMainAddress(performBalanceMerge); break;
        case 4: mergeBalances(performBalanceMerge); break;
    }
}

//Executes random transactions to spam the network
var executeSpamTransactions = function() {
    stepNo++;

    switch(stepNo) {
        case 1: getWalletAddresses(executeSpamTransactions);       break;
        case 2: getWalletBalances(executeSpamTransactions);        break;
        case 3: verifySpamBalance(executeSpamTransactions);        break;
        case 4: getAllRecipientAddresses(executeSpamTransactions); break;
        case 5: minReqDelay = 0;
                maxFailures = Math.floor((maxSpamTransactions / 100) + 100);
                sendRandomTransactions();
                break;
    }
}

//Displays help message for the usage of this toolbox
var displayProgramUsage = function() {
    console.log('Available options (max 1):');
    console.log('    -balance: displays wallet balances');
    console.log('    -split  : splits address balance to multiple addresses');
    console.log('    -merge  : merges all balances in the wallet to one address');
    console.log('    -spam   : spams the network to perform load testing');
    console.log('    -faucet : continuously request tokens from waves faucet');
}

//Execute program based on selected option
if(process.argv.length == 3) {
    stepNo = 0;

    switch(process.argv[2]) {
        case "-balance": displayWalletBalances();
                         break;

        case "-split"  : walletSplitSize = 10;
                         minSplitAmount = 100000000;
                         transactionFee = 1;
                         performBalanceSplit();
                         break;

        case "-merge"  : transactionFee = 1;
                         performBalanceMerge();
                         break;

        case "-spam"   : maxSpamTransactions = 100;
                         minSpamAmount = 11;
                         maxSpamAmount = 20;
                         minSpamFee = 1;
                         maxSpamFee = 10;
                         minSpamDelay = 250;
                         maxSpamDelay = 1500;
                         executeSpamTransactions();
                         break;

        case "-faucet" : faucetRequest();
                         break;

        default        : displayProgramUsage();
                         break;
    }
} else {
    displayProgramUsage();
}
