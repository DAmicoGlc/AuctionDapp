const EnglishAuction = artifacts.require("EnglishAuction");
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

async function completeAuction(auctionDeployed, finilizeIndex, addrSeller) {
    let initialBlock = await web3.eth.getBlockNumber();

    /**< Retrive the actual phase. >*/
    let actualPhase = await auctionDeployed.phase.call();
    let oldPhase = actualPhase;

    /**< Retrive the actual block number. >*/
    let block = await web3.eth.getBlockNumber();

    /**< Skip to the Fiilizing phase. >*/
    while (actualPhase != finilizeIndex) {

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
    
    /**< Finilize the auction from the seller address. >*/
    await auctionDeployed.finalize({ from: addrSeller });
}

/**
* Testing the auction manager:
* 1. Create an egnlish and a vicrey auction, retrive their addresses from the mangaer
*    contract and destroy it;
* 2. Stop and start the creation of auctions from the manager contract;
* 3. Create 3 english auction, complete the first one and check the order of the other 2 auctions,
*    the third will be the first in the array;
* 4. Create 3 vicrey auction, complete the first one and check the order of the other 2 auctions,
*    the third will be the first in the array;
* 5. Reverts condition.
* All the testing auctions must be destroyed!
*/
contract("AuctionManager", async => {
    let gasPrice;       /**< Gas price >*/
    let gasPriceBN;     /**< Gas price as BigNumber >*/

    /**< Vicrey auction variable >*/
    const reservePrice = 10;    /**< Reserve price of the good >*/
    const depositValue = 50;    /**< Vaule of deposit >*/

    /**< English auction variable >*/
    const buyOutPrice = 100;    /**< Buy out price of the good >*/
    const increment = 5;        /**< Minimum increment of each bid >*/

    var addrManager;            /**< Address of the auction manager >*/
    var contractManager;        /**< Instance of the contract auction manager >*/

    var addrSeller;             /**< Address of the auction seller >*/
    var accounts;               /**< Available test accounts >*/

    /**< Before each test, create an instance of the manager auction contract,
    * retrieve the gas price and transform it in a BigNumber. >*/
    beforeEach(async() => {
        accounts = await web3.eth.getAccounts();

        addrManager = accounts[0];
        contractManager = await AuctionManager.new({from: addrManager});

        addrSeller = accounts[1];

        gasPrice = await web3.eth.getGasPrice();
        gasPriceBN = new BN(gasPrice, 10);
    });

    it("Test _Create, retrive and destroy auctions", async function () { 

        /**< Seller deploy a Vicrey auction contract. >*/
        let vicreyAuction = await contractManager.createVicreyAuction(
            reservePrice, depositValue, {from: addrSeller});

        /**< Seller deploy an English auction contract. >*/
        let englishAuction = await contractManager.createEnglishAuction(
            reservePrice, buyOutPrice, increment, {from: addrSeller});

        /**< Retrive the vicrey auction address from the transaction emitted event. >*/
        let vicreyAddress = vicreyAuction.logs[0].args.auction;
        /**< Retrive the english auction address from the transaction emitted event. >*/
        let englishAddress = englishAuction.logs[0].args.auction;

        /**< Retrive the address of the active auction from the contract manager. >*/
        englishAddressList = await contractManager.getEnglishAuctions.call();
        vicreyAddressList = await contractManager.getVicreyAuctions.call();

        /**< Check if the addresses macth. >*/
        assert(vicreyAddress, vicreyAddressList[0], 
            "The vicrey contract address are not the same!");
        assert(englishAddress, englishAddressList[0], 
            "The english contract address are not the same!");

        /**< Retrive the instance of the active vicrey auction. >*/
        let vicreyDeployed = await VicreyAuction.at(vicreyAddressList[0]);
        /**< Retrive the instance of the active english auction. >*/
        let englishDeployed = await EnglishAuction.at(englishAddressList[0]);

        /**< Finilize the vicrey auction. >*/
        await completeAuction(vicreyDeployed, '4', addrSeller);
        /**< Finilize the english auction. >*/
        await completeAuction(englishDeployed, '2', addrSeller);

        /**< Check if the auction has been correctly desctructed! >*/
        let vicreyCode = await web3.eth.getCode(vicreyAddress);
        let englishCode = await web3.eth.getCode(englishAddress);

        assert(vicreyCode, '0x', 
            "The vicrey auction contract has not been desctructed!");
        assert(englishCode, '0x', 
            "The english contract has not been desctructed!");

        /**< Desctruct the manager >*/
        await contractManager.destroyManager({from: addrManager});

        /**< Check if the auction has been correctly desctructed! >*/
        let managerCode = await web3.eth.getCode(contractManager.address);

        assert(managerCode, '0x', 
            "The auction manager contract has not been desctructed!");
    });

    it("Test _Stop and enable creation from manager auction", async function () { 

        /**< Block creation of auctions >*/
        await contractManager.stopCreation({from: addrManager});

        /**< Catch the revert given by create an auction while the creation is blocked! >*/
        await truffleAssertions.fails(
            contractManager.createVicreyAuction(
                reservePrice, depositValue, {from: addrSeller})
        );
        await truffleAssertions.fails(
            contractManager.createEnglishAuction(
                reservePrice, buyOutPrice, increment, {from: addrSeller})
        );

        /**< Enable creation of auctions >*/
        await contractManager.startCreation({from: addrManager});

        /**< Seller deploy an English auction contract. >*/
        await contractManager.createEnglishAuction(
            reservePrice, buyOutPrice, increment, {from: addrSeller});

        /**< Retrive the address of the active auction from the contract manager. >*/
        englishAddressList = await contractManager.getEnglishAuctions.call();

        /**< Retrive the instance of the active english auction. >*/
        let englishDeployed = await EnglishAuction.at(englishAddressList[0]);

        /**< Finilize the english auction. >*/
        await completeAuction(englishDeployed, '2', addrSeller);

        /**< Check if the auction has been correctly desctructed! >*/
        let englishCode = await web3.eth.getCode(englishAddressList[0]);

        assert(englishCode, '0x', 
            "The english contract has not been desctructed!");

        /**< Desctruct the manager >*/
        await contractManager.destroyManager({from: addrManager});

        /**< Check if the auction has been correctly desctructed! >*/
        let managerCode = await web3.eth.getCode(contractManager.address);

        assert(managerCode, '0x', 
            "The auction manager contract has not been desctructed!");
    });
    
    it("Test _Create 3 english auctions, delete the first and check the order", async function () { 

        /**< Seller deploy first English auction contract. >*/
        let englishAuction_1 = await contractManager.createEnglishAuction(
            reservePrice, buyOutPrice, increment, {from: addrSeller});

        /**< Seller deploy Second English auction contract. >*/
        let englishAuction_2 = await contractManager.createEnglishAuction(
            reservePrice, buyOutPrice, increment, {from: addrSeller});
        
        /**< Seller deploy third English auction contract. >*/
        let englishAuction_3 = await contractManager.createEnglishAuction(
            reservePrice, buyOutPrice, increment, {from: addrSeller});

        /**< Retrive the first english auction address from the transaction emitted event. >*/
        let englishAddress_1 = englishAuction_1.logs[0].args.auction;
        /**< Retrive the second english auction address from the transaction emitted event. >*/
        let englishAddress_2 = englishAuction_2.logs[0].args.auction;
        /**< Retrive the third english auction address from the transaction emitted event. >*/
        let englishAddress_3 = englishAuction_3.logs[0].args.auction;

        /**< Retrive the address of the active auction from the contract manager. >*/
        englishAddressList = await contractManager.getEnglishAuctions.call();

        /**< Check if the addresses macth. >*/
        assert(englishAddress_1, englishAddressList[0], 
            "The english contract address are not the same!");
        assert(englishAddress_2, englishAddressList[1], 
            "The english contract address are not the same!");
        assert(englishAddress_3, englishAddressList[2], 
            "The english contract address are not the same!");

        /**< Retrive the instance of the first active english auction. >*/
        let englishDeployed = await EnglishAuction.at(englishAddress_1);
        
        /**< Finilize the first english auction. >*/
        await completeAuction(englishDeployed, '2', addrSeller);

        /**< Check if the auction has been correctly desctructed! >*/
        let englishCode = await web3.eth.getCode(englishAddress_1);

        assert(englishCode, '0x', 
            "The english contract has not been desctructed!");

        /**< Retrive the address of the active auction from the contract manager. >*/
        englishAddressList = await contractManager.getEnglishAuctions.call();

        /**< Check if the addresses are in the right order. >*/
        assert(englishAddress_3, englishAddressList[0], 
            "The english contract address are not the same!");
        assert(englishAddress_2, englishAddressList[1], 
            "The english contract address are not the same!");
    });

    it("Test _Create 3 vicrey auctions, delete the first and check the order", async function () { 

        /**< Seller deploy first Vicrey auction contract. >*/
        let vicreyAuction_1 = await contractManager.createVicreyAuction(
            reservePrice, depositValue, {from: addrSeller});

        /**< Seller deploy Second Vicrey auction contract. >*/
        let vicreyAuction_2 = await contractManager.createVicreyAuction(
            reservePrice, depositValue, {from: addrSeller});
        
        /**< Seller deploy third Vicrey auction contract. >*/
        let vicreyAuction_3 = await contractManager.createVicreyAuction(
            reservePrice, depositValue, {from: addrSeller});

        /**< Retrive the first vicrey auction address from the transaction emitted event. >*/
        let vicreyAddress_1 = vicreyAuction_1.logs[0].args.auction;
        /**< Retrive the second vicrey auction address from the transaction emitted event. >*/
        let vicreyAddress_2 = vicreyAuction_2.logs[0].args.auction;
        /**< Retrive the third vicrey auction address from the transaction emitted event. >*/
        let vicreyAddress_3 = vicreyAuction_3.logs[0].args.auction;

        /**< Retrive the address of the active auction from the contract manager. >*/
        vicreyAddressList = await contractManager.getVicreyAuctions.call();

        /**< Check if the addresses macth. >*/
        assert(vicreyAddress_1, vicreyAddressList[0], 
            "The vicrey contract address are not the same!");
        assert(vicreyAddress_2, vicreyAddressList[1], 
            "The vicrey contract address are not the same!");
        assert(vicreyAddress_3, vicreyAddressList[2], 
            "The vicrey contract address are not the same!");

        /**< Retrive the instance of the first active vicrey auction. >*/
        let vicreyDeployed = await EnglishAuction.at(vicreyAddress_1);
        
        /**< Finilize the first vicrey auction. >*/
        await completeAuction(vicreyDeployed, '4', addrSeller);

        /**< Check if the auction has been correctly desctructed! >*/
        let vicreyCode = await web3.eth.getCode(vicreyAddress_1);

        assert(vicreyCode, '0x', 
            "The vicrey contract has not been desctructed!");

        /**< Retrive the address of the active auction from the contract manager. >*/
        vicreyAddressList = await contractManager.getVicreyAuctions.call();

        /**< Check if the addresses are in the right order. >*/
        assert(vicreyAddress_3, vicreyAddressList[0], 
            "The vicrey contract address are not the same!");
        assert(vicreyAddress_2, vicreyAddressList[1], 
            "The vicrey contract address are not the same!");
    });

    it("Test _Call function from wrong addresses, destroy the manager contract with active auctions", async function () { 

        /**< Catch the revert given by manager that create an english auction! >*/
        await truffleAssertions.fails(
            contractManager.createEnglishAuction(
                reservePrice, buyOutPrice, increment, {from: addrManager})
        );

        /**< Catch the revert given by manager that create a vicrey auction! >*/
        await truffleAssertions.fails(
            contractManager.createVicreyAuction(
                reservePrice, depositValue, {from: addrManager})
        );

        /**< Catch the revert given by calling function not from owner account! >*/
        await truffleAssertions.fails(
            contractManager.stopCreation({from: accounts[2]})
        );
        await truffleAssertions.fails(
            contractManager.startCreation({from: accounts[2]})
        );
        await truffleAssertions.fails(
            contractManager.destroyManager({from: accounts[2]})
        );

        /**< Block the creation of auctions! >*/
        await contractManager.stopCreation({from: addrManager});

        /**< Catch the revert given by create an auction when the creation is blocked! >*/
        await truffleAssertions.fails(
            contractManager.createVicreyAuction(
                reservePrice, depositValue, {from: addrSeller})
        );

        /**< Enable the creation of auctions! >*/
        await contractManager.startCreation({from: addrManager});

        /**< Seller deploy first Vicrey auction contract. >*/
        let vicreyAuction_1 = await contractManager.createVicreyAuction(
            reservePrice, depositValue, {from: addrSeller});

        /**< Catch the revert given by create an auction when the creation is blocked! >*/
        await truffleAssertions.fails(
            contractManager.destroyManager({from: addrManager})
        );
    });

});