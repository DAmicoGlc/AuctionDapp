const VicreyAuction = artifacts.require("VicreyAuction");
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
* Testing the Vicrey auction:
* 1. 2 commitment from the same address, test the withdraw;
* 2. Test a commitment lower than the reserve price and No other bids;
* 3. 3 commitment, the third opening value grather than the second one;
* 4. Revert conditions.
* All the testing auctions must be finilized and the pending payment must be extinguished!
* At the end of each test, the balance of all address involved are controlled!
*/
contract("VicreyAuction", async => {
    let gasPrice;       /**< Gas price >*/
    let gasPriceBN;     /**< Gas price as BigNumber >*/

    const reservePrice = 10;    /**< Reserve price of the good >*/
    const depositValue = 50;    /**< Vaule of deposit >*/

    var addrManager;            /**< Address of the auction manager >*/
    var contractManager;        /**< Instance of the contract auction manager >*/

    var addrSeller;             /**< Address of the auction seller >*/
    var auctionDeployed;        /**< Instance of the auction deployed >*/
    var accounts;               /**< Available test accounts >*/
    var auctionAddressList;     /**< Address of deployed vicrey contract >*/

    /**< Before each test, create an instance of the manager auction contract,
    * an instance of the vicrey auction, retrieve the gas price and transform it in a BigNumber. >*/
    beforeEach(async() => {
        accounts = await web3.eth.getAccounts();

        addrManager = accounts[0];
        contractManager = await AuctionManager.new({from: addrManager});

        addrSeller = accounts[1];

        /**< Seller deploy the auction contract. >*/
        await contractManager.createVicreyAuction(
            reservePrice, depositValue, {from: addrSeller});

        /**< Retrive the address of the active auction from the contract manager. >*/
        auctionAddressList = await contractManager.getVicreyAuctions.call();

        /**< Retrive the instance of the active auction. >*/
        auctionDeployed = await VicreyAuction.at(auctionAddressList[0]);

        gasPrice = await web3.eth.getGasPrice();
        gasPriceBN = new BN(gasPrice, 10);
    });

    it("Test _Same bid, withdraw", async function () {
       
        /**< Create the nonce used to calculate the hash. >*/
        let nonce = "test";

        /**< Create the 2 different bid value in BigNumber. >*/
        let firstBid = new BN(50, 10);
        let failBid = new BN(60, 10);
        let secondBid = new BN(70, 10);
        
        /**< Calculate the hash value. >*/
        let firstHash = web3.utils.soliditySha3(nonce, firstBid);
        let failHash = web3.utils.soliditySha3(nonce, failBid);
        let secondHash = web3.utils.soliditySha3(nonce, secondBid);

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

        /**< Skip to the Commitment phase. >*/
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

        /**< The first free account make the first commitment. >*/
        let transaction = await auctionDeployed.commit(firstHash, { from: accounts[2], value: depositValue});

        /**< Calculate the gas spent for the transaction. >*/
        let transConstBN_1 = calculateGasSpent(transaction).mul(gasPriceBN);

        /**< The second free account make the first commitment. >*/
        transaction = await auctionDeployed.commit(secondHash, { from: accounts[3], value: depositValue});

        /**< Retrive the start block number. >*/
        initialBlock = await web3.eth.getBlockNumber();

        /**< Calculate the gas spent for the transaction. >*/
        let transConstBN_2 = calculateGasSpent(transaction).mul(gasPriceBN);
        
        /**< Retrive the actual balance of the first involved address. >*/
        let preFail = await web3.eth.getBalance(accounts[2]);
        /**< Transform it in BigNumber. >*/
        let preFailBN = new BN(preFail, 10);

        /**< Catch the revert given by the second bid from the actual winner! >*/
        await truffleAssertions.fails(
            auctionDeployed.commit(failHash, { from: accounts[2], value: depositValue})
        );

        /**< Retrive the actual balance of the first involved address. >*/
        let postFail = await web3.eth.getBalance(accounts[2]);
        /**< Transform it in BigNumber. >*/
        let postFailBN = new BN(postFail, 10);

        /**< Calculate the gas lost by the failed require. >*/
        let failRequire = preFailBN.sub(postFailBN);
        
        /**< Retrive the actual phase. >*/
        actualPhase = await auctionDeployed.phase.call();
        oldPhase = actualPhase;

        /**< Retrive the actual block number. >*/
        block = await web3.eth.getBlockNumber();

        /**< Skip to the Withdrawal phase. >*/
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

        /**< The second free account withdraw its commitment. >*/
        transaction = await auctionDeployed.withdraw({ from: accounts[3]})

        /**< Calculate the gas spent for the transaction. >*/
        transConstBN_2 = transConstBN_2.add(calculateGasSpent(transaction).mul(gasPriceBN));

        /**< Retrive the actual phase. >*/
        actualPhase = await auctionDeployed.phase.call();
        oldPhase = actualPhase;

        /**< Retrive the actual block number. >*/
        block = await web3.eth.getBlockNumber();

        /**< Skip to the Opening phase. >*/
        while (actualPhase != '3') {

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
        
        /**< The first free account open its commitment. >*/
        transaction = await auctionDeployed.openBid(nonce, { from: accounts[2], value: firstBid })
    
        /**< Calculate the gas spent for the transaction. >*/
        transConstBN_1 = transConstBN_1.add(calculateGasSpent(transaction).mul(gasPriceBN));

        /**< Retrive the actual phase. >*/
        actualPhase = await auctionDeployed.phase.call();
        oldPhase = actualPhase;

        /**< Retrive the actual block number. >*/
        block = await web3.eth.getBlockNumber();

        /**< Skip to the Finilizing phase. >*/
        while (actualPhase != '4') {

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

        /**< Retrieve the actual price of the good. >*/
        let actualPrice = await auctionDeployed.actualPrice.call();

        /**< Finilize the auction from the winner address. >*/
        transaction = await auctionDeployed.finalize({ from: accounts[2] });

        /**< Calculate the gas spent for the transaction. >*/
        transConstBN_1 = transConstBN_1.add(calculateGasSpent(transaction).mul(gasPriceBN));

        /**< Extinguish the pending payment from the winner address. >*/
        transaction = await auctionDeployed.transferPending({ from: accounts[2] });

        /**< Calculate the gas spent for the transaction. >*/
        transConstBN_1 = transConstBN_1.add(calculateGasSpent(transaction).mul(gasPriceBN));

        /**< Retrive the actual balance of the involved addresses. >*/
        let firstBidderBlcPost = await web3.eth.getBalance(accounts[2]);
        let firstBidBlcPostBN = new BN(firstBidderBlcPost, 10);

        let secondBidderBlcPost = await web3.eth.getBalance(accounts[3]);
        let secondBidBlcPostBN = new BN(secondBidderBlcPost, 10);

        let halfDeposit = depositValue/2;
        let halfDepositBN = new BN(halfDeposit, 10);

        let actualPriceBN = new BN(actualPrice, 10);
        let resPriceBn = new BN(reservePrice, 10);

        /**< Calculate the excpected balance difference and check it. >*/
        let diffFirstBidder = firstBidBlcPreBN.sub(firstBidBlcPostBN.add(transConstBN_1).add(failRequire).add(actualPriceBN));
        let diffSecondBidder = secondBidBlcPreBN.sub(secondBidBlcPostBN.add(transConstBN_2).add(halfDepositBN));

        assert.equal(actualPriceBN.sub(resPriceBn), '0',
            "The price must be equal to the reserve price!");
        assert.equal(diffFirstBidder, '0',
            "The balance of the first bidder is not correct!");
        assert.equal(diffSecondBidder, '0',
            "The balance of the second bidder is not correct!");

        /**< Check if the auction has been correctly desctructed! >*/
        let codeAuction = await web3.eth.getCode(auctionAddressList[0]);

        assert(codeAuction, '0x', 
            "The contract has not been desctructed!");
    });


    it("Test _Low commitment, No bids", async function () {

        /**< Create the nonce used to calculate the hash. >*/
        let nonce = "test";

        /**< Create the 2 different bid value in BigNumber. >*/
        let firstBid = new BN(5, 10);
        
        /**< Calculate the hash value. >*/
        let firstHash = web3.utils.soliditySha3(nonce, firstBid);

        /**< Retrive the start block number. >*/
        let initialBlock = await web3.eth.getBlockNumber();

        /**< Retrive the actual phase. >*/
        let actualPhase = await auctionDeployed.phase.call();
        let oldPhase = actualPhase;

        /**< Retrive the actual block number. >*/
        let block = await web3.eth.getBlockNumber();

        /**< Skip to the Fiilizing phase. >*/
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

        /**< The first free account make the commitment. >*/
        let transaction = await auctionDeployed.commit(firstHash, { from: accounts[2], value: depositValue});

        /**< Retrive the actual phase. >*/
        actualPhase = await auctionDeployed.phase.call();
        oldPhase = actualPhase;

        /**< Retrive the actual block number. >*/
        block = await web3.eth.getBlockNumber();

        /**< Skip to the Opening phase. >*/
        while (actualPhase != '3') {

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
        
        /**< Catch the revert given by a bid value lower than the reserve price! >*/
        await truffleAssertions.fails(
            auctionDeployed.openBid(nonce, { from: accounts[2], value: firstBid})
        );

        /**< Retrive the actual phase. >*/
        actualPhase = await auctionDeployed.phase.call();
        oldPhase = actualPhase;

        /**< Retrive the actual block number. >*/
        block = await web3.eth.getBlockNumber();

        /**< Skip to the Finilizing phase. >*/
        while (actualPhase != '4') {

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
        transaction = await auctionDeployed.finalize({ from: addrSeller });

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

    it("Test _3 different bid, the second lower than the third!", async function () {

        /**< Create the nonce used to calculate the hash. >*/
        let nonce = "test";

        /**< Create the 3different bid value in BigNumber. >*/
        let firstBid = new BN(50, 10);
        let secondBid = new BN(80, 10);
        let thirdBid = new BN(70, 10);
        
        /**< Calculate the hash value. >*/
        let firstHash = web3.utils.soliditySha3(nonce, firstBid);
        let secondHash = web3.utils.soliditySha3(nonce, secondBid);
        let thirdHash = web3.utils.soliditySha3(nonce, thirdBid);

        /**< Retrive the actual balance of the first involved address. >*/
        let firstBidderBlcPre = await web3.eth.getBalance(accounts[2]);
        let firstBidBlcPreBN = new BN(firstBidderBlcPre, 10);

        /**< Retrive the actual balance of the second involved address. >*/
        let secondBidderBlcPre = await web3.eth.getBalance(accounts[3]);
        let secondBidBlcPreBN = new BN(secondBidderBlcPre, 10);

        /**< Retrive the actual balance of the third involved address. >*/
        let thirdBidderBlcPre = await web3.eth.getBalance(accounts[4]);
        let thirdBidBlcPreBN = new BN(thirdBidderBlcPre, 10);

        /**< Retrive the start block number. >*/
        let initialBlock = await web3.eth.getBlockNumber();

        /**< Retrive the actual phase. >*/
        let actualPhase = await auctionDeployed.phase.call();
        let oldPhase = actualPhase;

        /**< Retrive the actual block number. >*/
        let block = await web3.eth.getBlockNumber();

        /**< Skip to the Commitment phase. >*/
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

        /**< The first free account make the first commitment. >*/
        let transaction = await auctionDeployed.commit(firstHash, { from: accounts[2], value: depositValue});

        /**< Calculate the gas spent for the transaction. >*/
        let transConstBN_1 = calculateGasSpent(transaction).mul(gasPriceBN);

        /**< The second free account make the second commitment. >*/
        transaction = await auctionDeployed.commit(secondHash, { from: accounts[3], value: depositValue});

        /**< Calculate the gas spent for the transaction. >*/
        let transConstBN_2 = calculateGasSpent(transaction).mul(gasPriceBN);

        /**< The third free account make the third commitment. >*/
        transaction = await auctionDeployed.commit(thirdHash, { from: accounts[4], value: depositValue});

        /**< Calculate the gas spent for the transaction. >*/
        let transConstBN_3 = calculateGasSpent(transaction).mul(gasPriceBN);

        /**< Retrive the actual phase. >*/
        actualPhase = await auctionDeployed.phase.call();
        oldPhase = actualPhase;

        /**< Retrive the actual block number. >*/
        block = await web3.eth.getBlockNumber();

        /**< Skip to the Opening phase. >*/
        while (actualPhase != '3') {

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

        /**< The first free account open its commitment. >*/
        transaction = await auctionDeployed.openBid(nonce, { from: accounts[2], value: firstBid })
    
        /**< Calculate the gas spent for the transaction. >*/
        transConstBN_1 = transConstBN_1.add(calculateGasSpent(transaction).mul(gasPriceBN));

        /**< The second free account open its commitment. >*/
        transaction = await auctionDeployed.openBid(nonce, { from: accounts[3], value: secondBid })
    
        /**< Calculate the gas spent for the transaction. >*/
        transConstBN_2 = transConstBN_2.add(calculateGasSpent(transaction).mul(gasPriceBN));

        /**< The third free account open its commitment. >*/
        transaction = await auctionDeployed.openBid(nonce, { from: accounts[4], value: thirdBid })
    
        /**< Calculate the gas spent for the transaction. >*/
        transConstBN_3 = transConstBN_3.add(calculateGasSpent(transaction).mul(gasPriceBN));

        /**< Retrive the actual phase. >*/
        actualPhase = await auctionDeployed.phase.call();
        oldPhase = actualPhase;

        /**< Retrive the actual block number. >*/
        block = await web3.eth.getBlockNumber();

        /**< Skip to the Finilizing phase. >*/
        while (actualPhase != '4') {

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

        /**< Retrieve the actual price of the good. >*/
        let actualPrice = await auctionDeployed.actualPrice.call();

        /**< Finilize the auction from the winner address. >*/
        transaction = await auctionDeployed.finalize({ from: accounts[3] });

        /**< Calculate the gas spent for the transaction. >*/
        transConstBN_2 = transConstBN_2.add(calculateGasSpent(transaction).mul(gasPriceBN));

        /**< Extinguish the pending payment from the winner address. >*/
        transaction = await auctionDeployed.transferPending({ from: accounts[3] });

        /**< Calculate the gas spent for the transaction. >*/
        transConstBN_2 = transConstBN_2.add(calculateGasSpent(transaction).mul(gasPriceBN));

        /**< Retrive the actual balance of the involved addresses. >*/
        let firstBidderBlcPost = await web3.eth.getBalance(accounts[2]);
        let firstBidBlcPostBN = new BN(firstBidderBlcPost, 10);

        let secondBidderBlcPost = await web3.eth.getBalance(accounts[3]);
        let secondBidBlcPostBN = new BN(secondBidderBlcPost, 10);

        let thirdBidderBlcPost = await web3.eth.getBalance(accounts[4]);
        let thirdBidBlcPostBN = new BN(thirdBidderBlcPost, 10);

        let actualPriceBN = new BN(actualPrice, 10);

        /**< Calculate the excpected balance difference and check it. >*/
        let diffFirstBidder = firstBidBlcPreBN.sub(firstBidBlcPostBN.add(transConstBN_1));
        let diffSecondBidder = secondBidBlcPreBN.sub(secondBidBlcPostBN.add(transConstBN_2).add(actualPriceBN));
        let diffThirdBidder = thirdBidBlcPreBN.sub(thirdBidBlcPostBN.add(transConstBN_3));

        assert.equal(actualPriceBN.sub(thirdBid), '0',
            "The price must be equal to the second highest bid!");
        assert.equal(diffFirstBidder, '0',
            "The balance of the first bidder is not correct!");
        assert.equal(diffSecondBidder, '0',
            "The balance of the second bidder is not correct!");
        assert.equal(diffThirdBidder, '0',
            "The balance of the third bidder is not correct!");

        /**< Check if the auction has been correctly desctructed! >*/
        let codeAuction = await web3.eth.getCode(auctionAddressList[0]);

        assert(codeAuction, '0x', 
            "The contract has not been desctructed!");
    });


    it("Test _Revert: out right phase, no deposit, can interact, can finilize, can pending, no in auction open and withdraw", async function() {
        /**< Create the nonce used to calculate the hash. >*/
        let nonce = "test";

        /**< Create the 3different bid value in BigNumber. >*/
        let bid = new BN(50, 10);

        /**< Calculate the hash value. >*/
        let hash = web3.utils.soliditySha3(nonce, bid);

        /**< Catch the revert given by making a bid out of the right phase! >*/
        await truffleAssertions.fails(
            auctionDeployed.commit(hash, { from: accounts[2], value: depositValue})
        );

        /**< Retrive the start block number. >*/
        let initialBlock = await web3.eth.getBlockNumber();

        /**< Retrive the actual phase. >*/
        let actualPhase = await auctionDeployed.phase.call();
        let oldPhase = actualPhase;

        /**< Retrive the actual block number. >*/
        let block = await web3.eth.getBlockNumber();

        /**< Skip to the Commitment phase. >*/
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
            auctionDeployed.commit(hash, { from: addrSeller, value: depositValue})
        );

        /**< Catch the revert given by manager making a bid! >*/
        await truffleAssertions.fails(
            auctionDeployed.commit(hash, { from: addrManager, value: depositValue })
        );

        /**< Catch the revert given by making a bid without sending the deposit! >*/
        await truffleAssertions.fails(
            auctionDeployed.commit(hash, { from: accounts[2]})
        );

        /**< Commit a bid! >*/
        auctionDeployed.commit(hash, { from: accounts[2], value: depositValue });

        /**< Retrive the actual phase. >*/
        actualPhase = await auctionDeployed.phase.call();
        oldPhase = actualPhase;

        /**< Retrive the actual block number. >*/
        block = await web3.eth.getBlockNumber();

        /**< Skip to the Withdraw phase. >*/
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

        /**< Catch the revert given by withdrawing a bid without committing one! >*/
        await truffleAssertions.fails(
           auctionDeployed.withdraw({ from: accounts[3]})
        );

        /**< Retrive the actual phase. >*/
        actualPhase = await auctionDeployed.phase.call();
        oldPhase = actualPhase;

        /**< Retrive the actual block number. >*/
        block = await web3.eth.getBlockNumber();

        /**< Skip to the Opening phase. >*/
        while (actualPhase != '3') {

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

        /**< Catch the revert given by opening a bid without committing one! >*/
         await truffleAssertions.fails(
            auctionDeployed.openBid(nonce, { from: accounts[3], value: bid})
        );

        /**< Catch the revert given by opening a bid witha different nonce! >*/
        await truffleAssertions.fails(
            auctionDeployed.openBid("wrongNonce", { from: accounts[2], value: bid})
        );

        /**< Open the bid. >*/
        auctionDeployed.openBid(nonce, { from: accounts[2], value: bid}),

        /**< Retrive the actual phase. >*/
        actualPhase = await auctionDeployed.phase.call();
        oldPhase = actualPhase;

        /**< Retrive the actual block number. >*/
        block = await web3.eth.getBlockNumber();

        /**< Skip to the Finilizing phase. >*/
        while (actualPhase != '4') {

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
})
