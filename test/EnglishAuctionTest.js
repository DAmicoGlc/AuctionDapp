const EnglishAuction = artifacts.require("EnglishAuction");
const AuctionManager = artifacts.require("AuctionManager");
const truffleAssertions = require("truffle-assertions");
const BN = require("bn.js");


function timeout(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
}

function calculateGasSpent(transaction) {
    let gasSpent = transaction.receipt.gasUsed;
    return new BN(gasSpent, 10);
}

/**
* Testing the English auction:
* 1. Buy Out the good;
* 2. 2 bids from the same address, and a bid lower than the highest one;
* 3. No Bids for the good;
* 4. Revert conditions.
* All the testing auctions must be finilized and the pending payment must be extinguished!
* At the end of each test, the balance of all address involved are controlled!
*/
contract("EnglishAuction", async => {
    let gasPrice;       /**< Gas price >*/
    let gasPriceBN;     /**< Gas price as BigNumber >*/

    const reservePrice = 10;    /**< Reserve price of the good >*/
    const buyOutPrice = 100;    /**< Buy out price of the good >*/
    const increment = 5;        /**< Minimum increment of each bid >*/

    var addrManager;            /**< Address of the auction manager >*/
    var contractManager;        /**< Instance of the contract auction manager >*/

    var addrSeller;             /**< Address of the auction seller >*/
    var auctionDeployed;        /**< Instance of the auction deployed >*/
    var accounts;               /**< Available test accounts >*/
    var auctionAddressList;     /**< Address of deployed english contract >*/

    /**< Before each test, create an instance of the manager auction contract,
    * an instance of the english auction, retrieve the gas price and transform it in a BigNumber. >*/
    beforeEach(async() => {
        accounts = await web3.eth.getAccounts();

        addrManager = accounts[0];
        contractManager = await AuctionManager.new({from: addrManager});

        addrSeller = accounts[1];

        /**< Seller deploy the auction contract. >*/
        await contractManager.createEnglishAuction(
            reservePrice, buyOutPrice, increment, {from: addrSeller});

        /**< Retrive the address of the active auction from the contract manager. >*/
        auctionAddressList = await contractManager.getEnglishAuctions.call();

        /**< Retrive the instance of the active auction. >*/
        auctionDeployed = await EnglishAuction.at(auctionAddressList[0]);

        gasPrice = await web3.eth.getGasPrice();
        gasPriceBN = new BN(gasPrice, 10);
    });

    it("Test _Buy Out the good", async function () {

        /**< Retrive the actual balance of the involved addresses. >*/
        let bidderBlcPre = await web3.eth.getBalance(accounts[2]);
        /**< Transform it in BigNumber. >*/
        let bidBlcPreBN = new BN(bidderBlcPre, 10);

        /**< Buy out the good. >*/
        let transaction = await auctionDeployed.buyNow(buyOutPrice, { from: accounts[2], value: buyOutPrice});

        /**< Calculate the gas spent for the transaction. >*/
        let transConstBN = calculateGasSpent(transaction).mul(gasPriceBN);

        /**< Extinguish the pending payment from the winner address. >*/
        transaction = await auctionDeployed.transferPending({ from: accounts[2] });

        /**< Calculate the gas spent for the transaction. >*/
        transConstBN = transConstBN.add(calculateGasSpent(transaction).mul(gasPriceBN));

        /**< Retrive the actual balance of the involved addresses. >*/
        let bidderBlcPost = await web3.eth.getBalance(accounts[2]);
        let bidBlcPostBN = new BN(bidderBlcPost, 10);

        /**< Transform the buy ut price in a BigNumber. >*/
        let buyOutBN = new BN(buyOutPrice, 10);
        
        /**< Calculate the excpected balance difference and check it. >*/
        let diffBidder = bidBlcPreBN.sub(transConstBN).sub(buyOutBN).sub(bidBlcPostBN);

        assert.equal(diffBidder, '0', 
            "The amount sent is not correct for the bidder!");

        /**< Check if the auction has been correctly desctructed! >*/
        let codeAuction = await web3.eth.getCode(auctionAddressList[0]);

        assert(codeAuction, '0x', 
            "The contract has not been desctructed!");
    });
    
    it("Test _Same address 2 bids _A lower bid", async function() {
        /**< Create the 3 different bid value in BigNumber. >*/
        let firstBid = new BN(50, 10);
        let sameBid = new BN(80, 10);
        let secondBid = new BN(40, 10);

        /**< Retrive the actual balance of the first involved address. >*/
        let firstBidderBlcPre = await web3.eth.getBalance(accounts[2]);
        let firstBidBlcPreBN = new BN(firstBidderBlcPre, 10);

        /**< Retrive the actual balance of the second involved address. >*/
        let secondBidderBlcPre = await web3.eth.getBalance(accounts[3]);
        let secondBidBlcPreBN = new BN(secondBidderBlcPre, 10);

        /**< Retrive the start block number. >*/
        let initialBlock = await web3.eth.getBlockNumber();

        /**< Retrive the actual phase. >*/
        let actualPhase = await auctionDeployed.phase.call();
        let oldPhase = actualPhase;

        /**< Retrive the actual block number. >*/
        let block = await web3.eth.getBlockNumber();

        /**< Skip to the Bidding phase. >*/
        while (actualPhase != '1') {

            /**< Loop until 5 block are mined, waiting 5 second for each loop. >*/
            while (block < initialBlock + 5) {
                await timeout(5000);
                block = await web3.eth.getBlockNumber();
            }

            /**< Go to the next phase. >*/
            await auctionDeployed.nextPhase({ from: addrSeller });

            /**< Retrive the actual phase. >*/
            actualPhase = await auctionDeployed.phase.call();

            /**< Check if the phase is changed. >*/
            if (actualPhase != oldPhase) {
                initialBlock = block;
                oldPhase = actualPhase;
            }
        }

        /**< The first free account make the first bid. >*/
        let transaction = await auctionDeployed.makeBid(firstBid.toNumber(), { from: accounts[2], value: firstBid })

        /**< Calculate the gas spent for the transaction. >*/
        let transConstBN = calculateGasSpent(transaction).mul(gasPriceBN);

        /**< Retrive the actual balance of the first involved address. >*/
        let preFail = await web3.eth.getBalance(accounts[2]);
        /**< Transform it in BigNumber. >*/
        let preFailBN = new BN(preFail, 10);

        /**< Catch the revert given by the second bid from the actual winner! >*/
        await truffleAssertions.fails(
            auctionDeployed.makeBid(sameBid.toNumber(), { from: accounts[2], value: sameBid })
        );

        /**< Retrive the actual balance of the first involved address. >*/
        let postFail = await web3.eth.getBalance(accounts[2]);
        /**< Transform it in BigNumber. >*/
        let postFailBN = new BN(postFail, 10);

        /**< Calculate the gas lost by the failed require. >*/
        let failRequire = preFailBN.sub(postFailBN);
        
        /**< Retrive the start block number. >*/
        initialBlock = await web3.eth.getBlockNumber();

        /**< Retrive the actual balance of the first involved address. >*/
        preFail = await web3.eth.getBalance(accounts[3]);
        /**< Transform it in BigNumber. >*/
        preFailBN = new BN(preFail, 10);

        /**< Catch the revert given by the low bid from the second free account! >*/
        await truffleAssertions.fails(
            auctionDeployed.makeBid(secondBid.toNumber(), { from: accounts[3], value: secondBid })
        );

        /**< Retrive the actual balance of the first involved address. >*/
        postFail = await web3.eth.getBalance(accounts[3]);
        /**< Transform it in BigNumber. >*/
        postFailBN = new BN(postFail, 10);

        /**< Calculate the gas lost by the failed require. >*/
        let failRequireLower = preFailBN.sub(postFailBN);

        /**< Retrive the actual phase. >*/
        actualPhase = await auctionDeployed.phase.call();
        oldPhase = actualPhase;

        /**< Retrive the actual block number. >*/
        block = await web3.eth.getBlockNumber();

        /**< Skip to the Finilizing phase. >*/
        while (actualPhase != '2') {

            /**< Loop until 5 block are mined, waiting 5 second for each loop. >*/
            while (block < initialBlock + 5) {
                await timeout(5000);
                block = await web3.eth.getBlockNumber();
            }

            /**< Go to the next phase. >*/
            await auctionDeployed.nextPhase({ from: addrSeller });

            /**< Retrive the actual phase. >*/
            actualPhase = await auctionDeployed.phase.call();

            /**< Check if the phase is changed. >*/
            if (actualPhase != oldPhase) {
                initialBlock = block;
                oldPhase = actualPhase;
            }
        }

        /**< Finilize the auction from the winner address. >*/
        transaction = await auctionDeployed.finalize({ from: accounts[2] });

        /**< Calculate the gas spent for the transaction. >*/
        transConstBN = transConstBN.add(calculateGasSpent(transaction).mul(gasPriceBN));

        /**< Extinguish the pending payment from the winner address. >*/
        transaction = await auctionDeployed.transferPending({ from: accounts[2] });

        /**< Calculate the gas spent for the transaction. >*/
        transConstBN = transConstBN.add(calculateGasSpent(transaction).mul(gasPriceBN));

        /**< Retrive the actual balance of the involved addresses. >*/
        let firstBidderBlcPost = await web3.eth.getBalance(accounts[2]);
        let firstBidBlcPostBN = new BN(firstBidderBlcPost, 10);

        let secondBidderBlcPost = await web3.eth.getBalance(accounts[3]);
        let secondBidBlcPostBN = new BN(secondBidderBlcPost, 10);

        /**< Calculate the excpected balance difference and check it. >*/
        let diffFirstBidder = firstBidBlcPreBN.sub(firstBidBlcPostBN.add(transConstBN).add(failRequire).add(firstBid));
        let diffSecondBidder = secondBidBlcPreBN.sub(secondBidBlcPostBN.add(failRequireLower));

        assert.equal(diffFirstBidder, '0', 
            "The balance of the first bidder is not correct!");

        assert.equal(diffSecondBidder, '0', 
            "The balance of the second bidder is not correct!");

        /**< Check if the auction has been correctly desctructed! >*/
        let codeAuction = await web3.eth.getCode(auctionAddressList[0]);

        assert(codeAuction, '0x', 
            "The contract has not been desctructed!");
    });

    it("Test _No bids", async function () {

        /**< Retrive the start block number. >*/
        let initialBlock = await web3.eth.getBlockNumber();

        /**< Retrive the actual phase. >*/
        let actualPhase = await auctionDeployed.phase.call();
        let oldPhase = actualPhase;

        /**< Retrive the actual block number. >*/
        let block = await web3.eth.getBlockNumber();

        /**< Skip to the Fiilizing phase. >*/
        while (actualPhase != '2') {

            /**< Loop until 5 block are mined, waiting 5 second for each loop. >*/
            while (block < initialBlock + 5) {
                await timeout(5000);
                block = await web3.eth.getBlockNumber();
            }

            /**< Go to the next phase. >*/
            await auctionDeployed.nextPhase({ from: addrSeller });

            /**< Retrive the actual phase. >*/
            actualPhase = await auctionDeployed.phase.call();

            /**< Check if the phase is changed. >*/
            if (actualPhase != oldPhase) {
                initialBlock = block;
                oldPhase = actualPhase;
            }
        }

        /**< Retrive the actual balance of the first involved address. >*/
        let sellerBlcPre = await web3.eth.getBalance(addrSeller);
        let selBlcPerBN = new BN(sellerBlcPre, 10);
        
        /**< Finilize the auction from the seller address. >*/
        let transaction = await auctionDeployed.finalize({ from: addrSeller });

        /**< Calculate the gas spent for the transaction. >*/
        let transConstBN = calculateGasSpent(transaction).mul(gasPriceBN);

        /**< Retrive the actual balance of the seller address. >*/
        let sellerBlcPost = await web3.eth.getBalance(addrSeller);
        let selBlcPostBN = new BN(sellerBlcPost, 10);

        let diffSeller = selBlcPerBN.sub(transConstBN).sub(selBlcPostBN);

        assert(diffSeller, '0', 
            "The seller must spend only the cost of the finilize transaction");

        /**< Check if the auction has been correctly desctructed! >*/
        let codeAuction = await web3.eth.getCode(auctionAddressList[0]);

        assert(codeAuction, '0x', 
            "The contract has not been desctructed!");
    });

    it("Test _Revert: out right phase, can interact, can finilize, can pending", async function() {
        /**< Create a bid value in BigNumber. >*/
        let bid = new BN(50, 10);

        /**< Catch the revert given by making a bid out of the right phase! >*/
        await truffleAssertions.fails(
            auctionDeployed.makeBid(bid.toNumber(), { from: accounts[2], value: bid})
        );

        /**< Retrive the start block number. >*/
        let initialBlock = await web3.eth.getBlockNumber();

        /**< Retrive the actual phase. >*/
        let actualPhase = await auctionDeployed.phase.call();
        let oldPhase = actualPhase;

        /**< Retrive the actual block number. >*/
        let block = await web3.eth.getBlockNumber();

        /**< Skip to the Bidding phase. >*/
        while (actualPhase != '1') {

            /**< Loop until 5 block are mined, waiting 5 second for each loop. >*/
            while (block < initialBlock + 5) {
                await timeout(5000);
                block = await web3.eth.getBlockNumber();
            }

            /**< Go to the next phase. >*/
            await auctionDeployed.nextPhase({ from: addrSeller });

            /**< Retrive the actual phase. >*/
            actualPhase = await auctionDeployed.phase.call();

            /**< Check if the phase is changed. >*/
            if (actualPhase != oldPhase) {
                initialBlock = block;
                oldPhase = actualPhase;
            }
        }

        /**< Catch the revert given by seller making a bid! >*/
        await truffleAssertions.fails(
            auctionDeployed.makeBid(bid.toNumber(), { from: addrSeller, value: bid})
        );

        /**< Catch the revert given by manager making a bid! >*/
        await truffleAssertions.fails(
            auctionDeployed.makeBid(bid.toNumber(), { from: addrManager, value: bid })
        );

        /**< Make a bid! >*/
        auctionDeployed.makeBid(bid.toNumber(), { from: accounts[2], value: bid});

        /**< Skip to the Finlizing phase. >*/
        while (actualPhase != '2') {

            /**< Loop until 5 block are mined, waiting 5 second for each loop. >*/
            while (block < initialBlock + 5) {
                await timeout(5000);
                block = await web3.eth.getBlockNumber();
            }

            /**< Go to the next phase. >*/
            await auctionDeployed.nextPhase({ from: addrSeller });

            /**< Retrive the actual phase. >*/
            actualPhase = await auctionDeployed.phase.call();

            /**< Check if the phase is changed. >*/
            if (actualPhase != oldPhase) {
                initialBlock = block;
                oldPhase = actualPhase;
            }
        }

        /**< Catch the revert given by not winner or seller or manager finilize the auction! >*/
        await truffleAssertions.fails(
            auctionDeployed.finalize({ from: accounts[4]})
        );
        
        /**< Finilize the auction! >*/
        auctionDeployed.finalize({ from: accounts[2]});

        /**< Catch the revert given by not winner extinguish the pending payment! >*/
        await truffleAssertions.fails(
            auctionDeployed.transferPending({ from: accounts[4]})
        );
        
        /**< Extiguish the pending payment! >*/
        auctionDeployed.transferPending({ from: accounts[2]});

        /**< Check if the auction has been correctly desctructed! >*/
        let codeAuction = await web3.eth.getCode(auctionAddressList[0]);

        assert(codeAuction, '0x', 
            "The contract has not been desctructed!");
    });
});