const EnglishAuction = artifacts.require("EnglishAuction");
const AuctionManager = artifacts.require("AuctionManager");
const BN = require("bn.js")
const truffleAssertions = require("truffle-assertions")

function timeout(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
}

contract("EnglishAuction", async => {
    let gasPrice
    let gasPriceBN

    const reservePrice = 10
    const buyOutPrice = 100
    const increment = 5

    var auctionManager

    beforeEach(async() => {
        auctionManager = await AuctionManager.new()
        gasPrice = await web3.eth.getGasPrice()
        gasPriceBN = new BN(gasPrice, 10)
    })

    it("Test _Buy Out the good", async function () {
        let accounts = await web3.eth.getAccounts()
        
        let sellerBlcPre = await web3.eth.getBalance(accounts[7])
        let bidderBlcPre = await web3.eth.getBalance(accounts[1])
        
        let selBlcPreBN = new BN(sellerBlcPre, 10)
        let bidBlcPreBN = new BN(bidderBlcPre, 10)

        // Seller deploy the auction contract
        let deployAuction = await auctionManager.createEnglishAuction(
                            reservePrice, buyOutPrice, increment, { from: accounts[7]})
        // deployAuction.logs.forEach(log => console.log("Deploy Event: " + log.args[0]))

        let gasSpent = deployAuction.receipt.gasUsed
        let gasSpentBN = new BN(gasSpent, 10)

        let deployCostBN = gasSpentBN.mul(gasPriceBN)

        let auctionAddressList = await auctionManager.getAllAuctions.call();

        let auction = await EnglishAuction.at(auctionAddressList.english[0])

        let transaction = await auction.buyNow(buyOutPrice, { from: accounts[1], value: buyOutPrice})
        // transaction.logs.forEach(log => console.log("BuyOut Event: " + log.args[0]))

        gasSpent = transaction.receipt.gasUsed
        gasSpentBN = new BN(gasSpent, 10)

        let transConstBN = gasSpentBN.mul(gasPriceBN)
        console.log("Dove sbaglio??????")
        transaction = await auction.transferPending({ from: accounts[1] })
        transaction.logs.forEach(log => console.log("transferPending Event: " + log.args[0]))
console.log("Dove sbaglio??????")
        gasSpent = transaction.receipt.gasUsed
        gasSpentBN = new BN(gasSpent, 10)

        transConstBN = transConstBN.add(gasSpentBN.mul(gasPriceBN))

        let sellerBlcPost = await web3.eth.getBalance(accounts[7])
        let bidderBlcPost = await web3.eth.getBalance(accounts[1])

        let selBlcPostBN = new BN(sellerBlcPost, 10)
        let bidBlcPostBN = new BN(bidderBlcPost, 10)

        let buyOutBN = new BN(buyOutPrice, 10)
        console.log(bidBlcPreBN.sub(transConstBN).sub(buyOutBN).sub(bidBlcPostBN))
        let diffBidder = bidBlcPreBN.sub(transConstBN).sub(buyOutBN).sub(bidBlcPostBN)
        let diffSeller = selBlcPreBN.sub(deployCostBN).add(buyOutBN).sub(selBlcPostBN)

        assert.equal(diffBidder, '0', 
            "The amount sent is not correct for the bidder!")
        assert.equal(diffSeller, '0',  
            "The amount sent is not correct for the seller!")
    })

    // it("Test _Making a bid", async function() {
    //     let accounts = await web3.eth.getAccounts()

    //     let sellerBlcPre = await web3.eth.getBalance(accounts[7])
    //     let bidderBlcPre = await web3.eth.getBalance(accounts[1])

    //     let selBlcPreBN = new BN(sellerBlcPre, 10)
    //     let bidBlcPreBN = new BN(bidderBlcPre, 10)

    //     // Seller deploy the auction contract
    //     let deployAuction = await auctionManager.createEnglishAuction(
    //         reservePrice, buyOutPrice, increment, { from: accounts[7] })
    //     // deployAuction.logs.forEach(log => console.log("Deploy Event: " + log.args[0]))

    //     let initialBlock = await web3.eth.getBlockNumber()

    //     let gasSpent = deployAuction.receipt.gasUsed
    //     let gasSpentBN = new BN(gasSpent, 10)

    //     let deployCostBN = gasSpentBN.mul(gasPriceBN)

    //     let auctionAddressList = await auctionManager.getAllAuctions.call();

    //     let auction = await EnglishAuction.at(auctionAddressList.english[0])
        
    //     let bid = new BN(50, 10)

    //     // Skip to opening phase
    //     let actualPhase = await auction.phase.call()
    //     let oldPhase = actualPhase

    //     let block = await web3.eth.getBlockNumber()

    //     while (actualPhase != '1') {

    //         while (block < initialBlock + 5) {
    //             await timeout(2000)
    //             block = await web3.eth.getBlockNumber()
    //         }

    //         await auction.nextPhase({ from: accounts[7] })

    //         actualPhase = await auction.phase.call()

    //         if (actualPhase != oldPhase) {
    //             initialBlock = block
    //             oldPhase = actualPhase
    //         }
    //     }

    //     let transMakeBid = await auction.makeBid(bid.toNumber(), { from: accounts[1], value: bid.toNumber()})
    //     // transMakeBid.logs.forEach(log => console.log("MakeBid Event: " + log.args[0]))

    //     initialBlock = await web3.eth.getBlockNumber()

    //     gasSpent = transMakeBid.receipt.gasUsed
    //     gasSpentBN = new BN(gasSpent, 10)

    //     let bidderTransConstBN = gasSpentBN.mul(gasPriceBN)

    //     block = await web3.eth.getBlockNumber()

    //     while (actualPhase != '2') {

    //         while (block < initialBlock + 5) {
    //             await timeout(2000)
    //             block = await web3.eth.getBlockNumber()
    //         }

    //         await auction.nextPhase({ from: accounts[7] })

    //         actualPhase = await auction.phase.call()

    //         if (actualPhase != oldPhase) {
    //             initialBlock = block
    //             oldPhase = actualPhase
    //         }
    //     }

    //     let transFinalize = await auction.finalize({from: accounts[1]})
    //     // transFinalize.logs.forEach(log => console.log("Finlize Event: " + log.args[0]))

    //     gasSpent = transFinalize.receipt.gasUsed
    //     gasSpentBN = new BN(gasSpent, 10)

    //     let sellerTransConstBN = gasSpentBN.mul(gasPriceBN)

    //     transaction = await auction.transferPending({ from: accounts[1] })
    //     // transaction.logs.forEach(log => console.log("transferPending Event: " + log.args[0]))

    //     gasSpent = transaction.receipt.gasUsed
    //     gasSpentBN = new BN(gasSpent, 10)

    //     bidderTransConstBN = bidderTransConstBN.add(gasSpentBN.mul(gasPriceBN))   

    //     let sellerBlcPost = await web3.eth.getBalance(accounts[7])
    //     let bidderBlcPost = await web3.eth.getBalance(accounts[1])

    //     let selBlcPostBN = new BN(sellerBlcPost, 10)
    //     let bidBlcPostBN = new BN(bidderBlcPost, 10)

    //     let diffBidder = bidBlcPreBN.sub(bidderTransConstBN).sub(bid).sub(bidBlcPostBN)
    //     let diffSeller = selBlcPreBN.sub(deployCostBN).sub(sellerTransConstBN).add(bid).sub(selBlcPostBN)

    //     assert.equal(diffBidder, '0',
    //         "The bidder balance is not correct!")
    //     assert.equal(diffSeller, '0',
    //         "The seller balance is not correct!")
    // })
    
    // it("Test _Same address 2 bids _A lower bid", async function() {
    //     let accounts = await web3.eth.getAccounts()

    //     // Seller deploy the auction contract
    //     await auctionManager.createEnglishAuction(
    //         reservePrice, buyOutPrice, increment, { from: accounts[7] })
    //     // deployAuction.logs.forEach(log => console.log("Deploy Event: " + log.args[0]))

    //     let initialBlock = await web3.eth.getBlockNumber()

    //     let auctionAddressList = await auctionManager.getAllAuctions.call();

    //     let auction = await EnglishAuction.at(auctionAddressList.english[0])

    //     let firstBid = new BN(50, 10)
    //     let sameBid = new BN(80, 10)
    //     let secondBid = new BN(40, 10)

    //     // Skip to opening phase
    //     let actualPhase = await auction.phase.call()
    //     let oldPhase = actualPhase

    //     let block = await web3.eth.getBlockNumber()

    //     while (actualPhase != '1') {

    //         while (block < initialBlock + 5) {
    //             await timeout(2000)
    //             block = await web3.eth.getBlockNumber()
    //         }

    //         await auction.nextPhase({ from: accounts[7] })

    //         actualPhase = await auction.phase.call()

    //         if (actualPhase != oldPhase) {
    //             initialBlock = block
    //             oldPhase = actualPhase
    //         }
    //     }

    //     await auction.makeBid(firstBid.toNumber(), { from: accounts[1], value: firstBid.toNumber() })

    //     await truffleAssertions.reverts(
    //         auction.makeBid(sameBid.toNumber(), { from: accounts[1], value: sameBid.toNumber() }),
    //         "You are the actual winner of the auction!"
    //     )

    //     initialBlock = await web3.eth.getBlockNumber()

    //     let secBlcPre = await web3.eth.getBalance(accounts[2])
    //     let secBlcPreBN = new BN(secBlcPre, 10)

    //     let transSecondBid = await auction.makeBid(secondBid.toNumber(), { from: accounts[2], value: secondBid.toNumber() })
    //     // transSecondBid.logs.forEach(log => console.log("MakeBid 2 Event: " + log.args[0]))

    //     gasSpent = transSecondBid.receipt.gasUsed
    //     gasSpentBN = new BN(gasSpent, 10)

    //     let secTransConstBN = gasSpentBN.mul(gasPriceBN)

    //     let secBlcPost = await web3.eth.getBalance(accounts[2])
    //     let secBlcPostBN = new BN(secBlcPost, 10)

    //     // Skip to opening phase
    //     actualPhase = await auction.phase.call()
    //     oldPhase = actualPhase

    //     block = await web3.eth.getBlockNumber()

    //     while (actualPhase != '2') {

    //         while (block < initialBlock + 5) {
    //             await timeout(2000)
    //             block = await web3.eth.getBlockNumber()
    //         }

    //         await auction.nextPhase({ from: accounts[7] })

    //         actualPhase = await auction.phase.call()

    //         if (actualPhase != oldPhase) {
    //             initialBlock = block
    //             oldPhase = actualPhase
    //         }
    //     }

    //     await auction.finalize({ from: accounts[1] })

    //     await auction.transferPending({ from: accounts[1] })
        
    //     let diffBidder = secBlcPreBN.sub(secTransConstBN).sub(secBlcPostBN)

    //     assert.equal(diffBidder, '0',
    //         "The second account must spend only the transaction cost!")
    // })

    // it("Test _No bids", async function () {
    //     let accounts = await web3.eth.getAccounts()
        
    //     // Seller deploy the auction contract
    //     let deployAuction = await auctionManager.createEnglishAuction(
    //         reservePrice, buyOutPrice, increment, { from: accounts[7] })
    //     // deployAuction.logs.forEach(log => console.log("Deploy Event: " + log.args[0]))

    //     let auctionAddressList = await auctionManager.getAllAuctions.call();

    //     let auction = await EnglishAuction.at(auctionAddressList.english[0])
    //     // Skip to bidding phase
    //     let initialBlock = await web3.eth.getBlockNumber()
    //     let actualPhase = await auction.phase.call()
    //     let oldPhase = actualPhase

    //     let block = await web3.eth.getBlockNumber()

    //     while (actualPhase != '2') {

    //         while (block < initialBlock + 5) {
    //             await timeout(2000)
    //             block = await web3.eth.getBlockNumber()
    //         }

    //         await auction.nextPhase({ from: accounts[7] })

    //         actualPhase = await auction.phase.call()

    //         if (actualPhase != oldPhase) {
    //             oldPhase = actualPhase
    //             initialBlock = block
    //         }
    //     }

    //     let sellerBlcPre = await web3.eth.getBalance(accounts[7])
    //     let selBlcPerBN = new BN(sellerBlcPre, 10)
        
    //     let transaction = await auction.finalize({ from: accounts[7] })
    //     // transaction.logs.forEach(log => console.log("Finalize Event: " + log.args[0]))

    //     let gasSpent = transaction.receipt.gasUsed
    //     let gasSpentBN = new BN(gasSpent, 10)

    //     let transConstBN = gasSpentBN.mul(gasPriceBN)

    //     let sellerBlcPost = await web3.eth.getBalance(accounts[7])
    //     let selBlcPostBN = new BN(sellerBlcPost, 10)

    //     let diffSeller = selBlcPerBN.sub(transConstBN).sub(selBlcPostBN).toString()

    //     assert(diffSeller, '0', 
    //         "The seller must spent only the cost of the function")
    // })
});