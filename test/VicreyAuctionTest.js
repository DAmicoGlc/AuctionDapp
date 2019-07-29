const VicreyAuction = artifacts.require("VicreyAuction")
const AuctionManager = artifacts.require("AuctionManager")
const BN = require("bn.js")
const truffleAssertions = require("truffle-assertions")

function timeout(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
}

contract("VicreyAuction", async => {
    let gasPrice
    let gasPriceBN

    const reservePrice = 10
    const deposit = 100

    var auctionManager;

    beforeEach(async () => {
        auctionManager = await AuctionManager.new()

        gasPrice = await web3.eth.getGasPrice()
        gasPriceBN = new BN(gasPrice, 10)
    })


    it("Test _deposit transaction", async function () {
        let accounts = await web3.eth.getAccounts()

        let nonce = "test"

        let firstBid = new BN(50, 10)
        let secondBid = new BN(50, 10)
        
        let firstHash = web3.utils.soliditySha3(nonce, firstBid)
        let secondHash = web3.utils.soliditySha3(nonce, secondBid)

        let tranCostBN_1 = new BN(0, 10)
        let tranCostBN_2 = new BN(0, 10)

        // Seller dactualPriceeploy the auction contract
        await auctionManager.createVicreyAuction(
            reservePrice, deposit, { from: accounts[7] })
        // deployAuction.logs.forEach(log => console.log("Deploy Event: " + log.args[0]))

        let auctionAddressList = await auctionManager.getAllAuctions.call();

        let auction = await VicreyAuction.at(auctionAddressList.vicrey[0])

        // Skip to commitment phase
        let initialBlock = await web3.eth.getBlockNumber()
        let actualPhase = await auction.phase.call()
        let oldPhase = actualPhase

        let block = await web3.eth.getBlockNumber()

        while (actualPhase != '1') {

            while (block < initialBlock + 5) {
                await timeout(2000)
                block = await web3.eth.getBlockNumber()
            }

            await auction.nextPhase({ from: accounts[7] })

            actualPhase = await auction.phase.call()

            if (actualPhase != oldPhase) {
                initialBlock = block
                oldPhase = actualPhase
            }
        }

        // Make two commintment from different accounts

        initialBlock = await web3.eth.getBlockNumber()

        // Get balance of the two different accounts before any transactions
        let bidderBlcPre_1 = await web3.eth.getBalance(accounts[1])
        let bidderBlcPre_2 = await web3.eth.getBalance(accounts[2])

        let bidBlcPreBN_1 = new BN(bidderBlcPre_1, 10)
        let selBlcPreBN_2 = new BN(bidderBlcPre_2, 10)

        // First commitment
        let transaction = await auction.commit(firstHash, { from: accounts[1], value: deposit})
        // transaction.logs.forEach(log => console.log("Commit 1 Event: " + log.args[0]))

        let gasSpent = transaction.receipt.gasUsed
        let gasSpentBN = new BN(gasSpent, 10)

        tranCostBN_1 = tranCostBN_1.add(gasSpentBN.mul(gasPriceBN))

        // Second commitment
        transaction = await auction.commit(secondHash, { from: accounts[2], value: deposit})
        // transaction.logs.forEach(log => console.log("Commit 2 Event: " + log.args[0]))

        gasSpent = transaction.receipt.gasUsed
        gasSpentBN = new BN(gasSpent, 10)

        tranCostBN_2 = tranCostBN_2.add(gasSpentBN.mul(gasPriceBN))

        // Skip to commitment phase
        initialBlock = await web3.eth.getBlockNumber()
        actualPhase = await auction.phase.call()
        oldPhase = actualPhase

        block = await web3.eth.getBlockNumber()

        while (actualPhase != '1') {

            while (block < initialBlock + 5) {
                await timeout(2000)
                block = await web3.eth.getBlockNumber()
            }

            await auction.nextPhase({ from: accounts[7] })

            actualPhase = await auction.phase.call()

            if (actualPhase != oldPhase) {
                initialBlock = block
                oldPhase = actualPhase
            }
        }

        initialBlock = block;

        // The second address withdraw its bid
        transaction = await auction.withdraw({ from: accounts[2]})
        // transaction.logs.forEach(log => console.log("Withdraw 2 Event: " + log.args[0]))

        gasSpent = transaction.receipt.gasUsed
        gasSpentBN = new BN(gasSpent, 10)

        tranCostBN_2 = tranCostBN_2.add(gasSpentBN.mul(gasPriceBN))

        // Skip to opening phase
        initialBlock = await web3.eth.getBlockNumber()
        actualPhase = await auction.phase.call()
        oldPhase = actualPhase

        block = await web3.eth.getBlockNumber()

        while (actualPhase != '3') {

            while (block < initialBlock + 5) {
                await timeout(2000)
                block = await web3.eth.getBlockNumber()
            }

            await auction.nextPhase({ from: accounts[7] })

            actualPhase = await auction.phase.call()

            if (actualPhase != oldPhase) {
                initialBlock = block
                oldPhase = actualPhase
            }
        }

        initialBlock = block;
        
        // The first address open its bid
        transaction = await auction.openBid(nonce, { from: accounts[1], value: firstBid.toNumber() })
        // transaction.logs.forEach(log => console.log("Open 1 Event: " + log.args[0]))

        gasSpent = transaction.receipt.gasUsed
        gasSpentBN = new BN(gasSpent, 10)

        tranCostBN_1 = tranCostBN_1.add(gasSpentBN.mul(gasPriceBN))

        // Skip to finalizing phase
        initialBlock = await web3.eth.getBlockNumber()
        actualPhase = await auction.phase.call()
        oldPhase = actualPhase

        block = await web3.eth.getBlockNumber()

        while (actualPhase != '4') {

            while (block < initialBlock + 5) {
                await timeout(2000)
                block = await web3.eth.getBlockNumber()
            }

            await auction.nextPhase({ from: accounts[7] })

            actualPhase = await auction.phase.call()

            if (actualPhase != oldPhase) {
                initialBlock = block
                oldPhase = actualPhase
            }
        }

        initialBlock = block;

        let actualPrice = await auction.actualPrice.call()

        // The seller finalize the auction
        transaction = await auction.finalize({ from: accounts[7] })
        // transaction.logs.forEach(log => console.log("Finalize Event: " + log.args[0]))

        transaction = await auction.transferPending({ from: accounts[1] })
        // transaction.logs.forEach(log => console.log("transferPending Event: " + log.args[0]))

        gasSpent = transaction.receipt.gasUsed
        gasSpentBN = new BN(gasSpent, 10)

        tranCostBN_1 = tranCostBN_1.add(gasSpentBN.mul(gasPriceBN))

        // Get balance of the two different accounts after all transactions
        let bidderBlcPost_1 = await web3.eth.getBalance(accounts[1])
        let bidderBlcPost_2 = await web3.eth.getBalance(accounts[2])

        let bidBlcPostBN_1 = new BN(bidderBlcPost_1, 10)
        let bidBlcPostBN_2 = new BN(bidderBlcPost_2, 10)

        let halfDeposit = deposit/2
        let halfDepositBN = new BN(halfDeposit, 10)

        let actualPriceBN = new BN(actualPrice, 10)

        // Verify the cost of all transaction of the two different accounts
        let diffBidder_1 = bidBlcPreBN_1.sub(tranCostBN_1).sub(actualPriceBN).sub(bidBlcPostBN_1)
        let diffBidder_2 = selBlcPreBN_2.sub(tranCostBN_2).sub(halfDepositBN).sub(bidBlcPostBN_2)

        assert.equal(diffBidder_1, '0',
            "The bidder 1 balance is not correct!")
        assert.equal(diffBidder_2, '0',
            "The bidder 2 balance is not correct!")
    })

    it("Test _Highest Bid and Second highest must change", async function () {
        let accounts = await web3.eth.getAccounts()
        
        let nonce = "test"

        let bid_1 = new BN(50, 10)
        let bid_2 = new BN(80, 10)
        let bid_3 = new BN(60, 10)
        let bid_4 = new BN(80, 10)

        let hash_1 = web3.utils.soliditySha3(nonce, bid_1)
        let hash_2 = web3.utils.soliditySha3(nonce, bid_2)
        let hash_3 = web3.utils.soliditySha3(nonce, bid_3)
        let hash_4 = web3.utils.soliditySha3(nonce, bid_4)

        let costBN_1 = new BN(0, 10)
        let costBN_2 = new BN(0, 10)
        let costBN_3 = new BN(0, 10)
        let costBN_4 = new BN(0, 10)

        // Seller deploy the auction contract
        await auctionManager.createVicreyAuction(
            reservePrice, deposit, { from: accounts[7] })
        // deployAuction.logs.forEach(log => console.log("Deploy Event: " + log.args[0]))

        let auctionAddressList = await auctionManager.getAllAuctions.call();

        let auction = await VicreyAuction.at(auctionAddressList.vicrey[0])

        let actualPhase = await auction.phase.call()
        let oldPhase = actualPhase

        // Skip to commitment phase
        let initialBlock = await web3.eth.getBlockNumber()
        let block = await web3.eth.getBlockNumber()

        while (actualPhase != '1') {

            while (block < initialBlock + 5) {
                await timeout(2000)
                block = await web3.eth.getBlockNumber()
            }

            await auction.nextPhase({ from: accounts[7] })

            actualPhase = await auction.phase.call()

            if (actualPhase != oldPhase) {
                initialBlock = block
                oldPhase = actualPhase
            }
        }

        // Make two commintment from different accounts

        // Get balance of the two different accounts before any transactions
        let preBalance_1 = await web3.eth.getBalance(accounts[1])
        let preBalance_2 = await web3.eth.getBalance(accounts[2])
        let preBalance_3 = await web3.eth.getBalance(accounts[3])
        let preBalance_4 = await web3.eth.getBalance(accounts[4])

        let preBalanceBN_1 = new BN(preBalance_1, 10)
        let preBalanceBN_2 = new BN(preBalance_2, 10)
        let preBalanceBN_3 = new BN(preBalance_3, 10)
        let preBalanceBN_4 = new BN(preBalance_4, 10)

        // First commitment
        let transaction = await auction.commit(hash_1, { from: accounts[1], value: deposit })
        // transaction.logs.forEach(log => console.log("Commit_1 Event: " + log.args[0]))

        let gasSpent = transaction.receipt.gasUsed
        let gasSpentBN = new BN(gasSpent, 10)

        costBN_1 = costBN_1.add(gasSpentBN.mul(gasPriceBN))

        // Second commitment
        transaction = await auction.commit(hash_2, { from: accounts[2], value: deposit })
        // transaction.logs.forEach(log => console.log("Commit_2 Event: " + log.args[0]))

        gasSpent = transaction.receipt.gasUsed
        gasSpentBN = new BN(gasSpent, 10)

        costBN_2 = costBN_2.add(gasSpentBN.mul(gasPriceBN))

        // Third commitment
        transaction = await auction.commit(hash_3, { from: accounts[3], value: deposit })
        // transaction.logs.forEach(log => console.log("Commit_3 Event: " + log.args[0]))

        gasSpent = transaction.receipt.gasUsed
        gasSpentBN = new BN(gasSpent, 10)

        costBN_3 = costBN_3.add(gasSpentBN.mul(gasPriceBN))

        // Forth commitment
        transaction = await auction.commit(hash_4, { from: accounts[4], value: deposit })
        // transaction.logs.forEach(log => console.log("Commit_4 Event: " + log.args[0]))

        gasSpent = transaction.receipt.gasUsed
        gasSpentBN = new BN(gasSpent, 10)

        costBN_4 = costBN_4.add(gasSpentBN.mul(gasPriceBN))

        actualPhase = await auction.phase.call()
        oldPhase = actualPhase

        block = await web3.eth.getBlockNumber()

        while (actualPhase != '3') {

            while (block < initialBlock + 5) {
                await timeout(2000)
                block = await web3.eth.getBlockNumber()
            }

            await auction.nextPhase({ from: accounts[7] })

            actualPhase = await auction.phase.call()

            if (actualPhase != oldPhase) {
                initialBlock = block
                oldPhase = actualPhase
            }
        }

        // The first address open its bid
        transaction = await auction.openBid(nonce, { from: accounts[1], value: bid_1.toNumber() })
        // transaction.logs.forEach(log => console.log("Open_1 Event: " + log.args[0]))

        gasSpent = transaction.receipt.gasUsed
        gasSpentBN = new BN(gasSpent, 10)

        costBN_1 = costBN_1.add(gasSpentBN.mul(gasPriceBN))

        // The second address open its bid
        transaction = await auction.openBid(nonce, { from: accounts[2], value: bid_2.toNumber() })
        // transaction.logs.forEach(log => console.log("Open_2 Event: " + log.args[0]))

        gasSpent = transaction.receipt.gasUsed
        gasSpentBN = new BN(gasSpent, 10)

        costBN_2 = costBN_2.add(gasSpentBN.mul(gasPriceBN))

        // The third address open its bid
        transaction = await auction.openBid(nonce, { from: accounts[3], value: bid_3.toNumber() })
        // transaction.logs.forEach(log => console.log("Open_3 Event: " + log.args[0]))

        gasSpent = transaction.receipt.gasUsed
        gasSpentBN = new BN(gasSpent, 10)

        costBN_3 = costBN_3.add(gasSpentBN.mul(gasPriceBN))

        // The forth address open its bid
        transaction = await auction.openBid(nonce, { from: accounts[4], value: bid_4.toNumber() })
        // transaction.logs.forEach(log => console.log("Open_4 Event: " + log.args[0]))

        gasSpent = transaction.receipt.gasUsed
        gasSpentBN = new BN(gasSpent, 10)

        costBN_4 = costBN_4.add(gasSpentBN.mul(gasPriceBN))

        // Skip to finalizing phase
        block = await web3.eth.getBlockNumber()
        while (block < initialBlock + 5) {
            await timeout(2000)
            block = await web3.eth.getBlockNumber()
        }

        initialBlock = block;

        let actualPrice = await auction.actualPrice.call()
        let actualPriceBN = new BN(actualPrice, 10)

        // The seller finalize the auction
        transaction = await auction.finalize({ from: accounts[7] })
        // transaction.logs.forEach(log => console.log("Finalize Event: " + log.args[0]))

        transaction = await auction.transferPending({ from: accounts[2] })
        // transaction.logs.forEach(log => console.log("transferPending Event: " + log.args[0]))

        gasSpent = transaction.receipt.gasUsed
        gasSpentBN = new BN(gasSpent, 10)

        costBN_2 = costBN_2.add(gasSpentBN.mul(gasPriceBN))

        // Get balance of the two different accounts after all transactions
        let postBalance_1 = await web3.eth.getBalance(accounts[1])
        let postBalance_2 = await web3.eth.getBalance(accounts[2])
        let postBalance_3 = await web3.eth.getBalance(accounts[3])
        let postBalance_4 = await web3.eth.getBalance(accounts[4])

        let postBalanceBN_1 = new BN(postBalance_1, 10)
        let postBalanceBN_2 = new BN(postBalance_2, 10)
        let postBalanceBN_3 = new BN(postBalance_3, 10)
        let postBalanceBN_4 = new BN(postBalance_4, 10)        

        // Verify the cost of all transaction of the two different accounts
        let diffBidder_1 = preBalanceBN_1.sub(costBN_1).sub(postBalanceBN_1)
        let diffBidder_2 = preBalanceBN_2.sub(costBN_2).sub(postBalanceBN_2).sub(actualPriceBN)
        let diffBidder_3 = preBalanceBN_3.sub(costBN_3).sub(postBalanceBN_3)
        let diffBidder_4 = preBalanceBN_4.sub(costBN_4).sub(postBalanceBN_4)

        assert.equal(diffBidder_1, '0',
            "The bidder 1 balance is not correct!")
        assert.equal(diffBidder_2, '0',
            "The bidder 2 balance is not correct!")
        assert.equal(diffBidder_3, '0',
            "The bidder 3 balance is not correct!")
        assert.equal(diffBidder_4, '0',
            "The bidder 4 balance is not correct!")
    })

    it("Test _No bids", async function () {
        let accounts = await web3.eth.getAccounts()

        // Seller deploy the auction contract
        let deployAuction = await auctionManager.createVicreyAuction(
            reservePrice, deposit, { from: accounts[7] })
        // deployAuction.logs.forEach(log => console.log("Deploy Event: " + log.args[0]))

        let gasSpent = deployAuction.receipt.gasUsed
        let gasSpentBN = new BN(gasSpent, 10)

        let deployCostBN = gasSpentBN.mul(gasPriceBN)

        let auctionAddressList = await auctionManager.getAllAuctions.call();

        let auction = await VicreyAuction.at(auctionAddressList.vicrey[0])
        
        let actualPhase = await auction.phase.call()
        let oldPhase = actualPhase

        // Skip to commitment phase
        let initialBlock = await web3.eth.getBlockNumber()
        let block = await web3.eth.getBlockNumber()

        while (actualPhase != '4') {

            while (block < initialBlock + 5) {
                await timeout(2000)
                block = await web3.eth.getBlockNumber()
            }

            await auction.nextPhase({ from: accounts[7] })

            actualPhase = await auction.phase.call()

            if (actualPhase != oldPhase) {
                initialBlock = block
                oldPhase = actualPhase
            }
        }

        let sellerBlcPre = await web3.eth.getBalance(accounts[7])
        let selBlcPerBN = new BN(sellerBlcPre, 10)

        let transaction = await auction.finalize({ from: accounts[7] })
        // transaction.logs.forEach(log => console.log("Finalize Event: " + log.args[0]))

        gasSpent = transaction.receipt.gasUsed
        gasSpentBN = new BN(gasSpent, 10)

        let transConstBN = gasSpentBN.mul(gasPriceBN)

        let sellerBlcPost = await web3.eth.getBalance(accounts[7])
        let selBlcPostBN = new BN(sellerBlcPost, 10)

        let diffSeller = selBlcPerBN.sub(transConstBN).sub(selBlcPostBN).sub(deployCostBN)

        assert(diffSeller, '0',
            "The seller must spent only the cost of the function")
    })
})
