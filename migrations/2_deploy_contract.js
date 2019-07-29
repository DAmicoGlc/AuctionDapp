var AuctionManager = artifacts.require("./AuctionManager.sol");
var VicreyAuction = artifacts.require("./VicreyAuction.sol");
var EnglishAuction = artifacts.require("./EnglishAuction.sol");

const BN = require("bn.js");
const request = require('request');

function sendEng(address) {
    let myjson= {
        address: address,
        title: "New Laptop",
        description: "Lorem ipsum dolor sit amet,"
                + " consectetur adipiscing elit, "
                + "sed do eiusmod tempor incididunt"
                + " ut labore et dolore magna aliqua."
    }
    request.post('http://localhost:5000/english', {
        body: myjson,    
        json: true 
    }, (error, res, body) => {
        if (error) {
            console.error(error)
            return
        }
        console.log(`statusCode: ${res.statusCode}`)
    });
}
function sendVic(address) {
    let myjson = {
        address: address,
        title: "New smartphone",
        description: "Lorem ipsum dolor sit amet,"
            + " consectetur adipiscing elit, "
            + "sed do eiusmod tempor incididunt"
            + " ut labore et dolore magna aliqua."
    }
    request.post('http://localhost:5000/vicrey', {
        body: myjson,
        json: true
    }, (error, res, body) => {
        if (error) {
            console.error(error)
            return
        }
        console.log(`statusCode: ${res.statusCode}`)
    });
}

function timeout(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
}

module.exports = async function (deployer, network, accounts) {
    if (network == "ropsten") {
        deployer.deploy(AuctionManager);
    }
    else if (network == "development") {

        web3.eth.defaultAccount = web3.eth.accounts[0];

        await deployer.deploy(AuctionManager, { gas: 500000000 , gasPrice: web3.utils.toWei("20", "gwei") });
    }

        let active = await AuctionManager.deployed();


        console.log(await active.managerOwner.call())
        console.log(accounts[3])

        await active.createEnglishAuction(10, 100, 5, { from: accounts[3] });
        await active.createEnglishAuction(30, 150, 5, { from: accounts[1] });
        await active.createVicreyAuction(new BN(2000000000000000, 10), new BN(1500000000000000, 10), { from: accounts[1] });
        await active.createVicreyAuction(new BN(1500000000000000, 10), new BN(1500000000000000, 10), { from: accounts[1] });
        await active.createVicreyAuction(new BN(1000000000000000, 10), new BN(1000000000000000, 10), { from: accounts[3] });

        let list = await active.getAllAuctions({ from: accounts[0] })

        list[0].forEach(element => {
            sendEng(element);
        });
        list[1].forEach(element => {
            sendVic(element);
        });

        let vicrey = await VicreyAuction.at(list[1][0])

        // Skip to commitment phase
        let initialBlock = await web3.eth.getBlockNumber()
        let actualPhase = await vicrey.phase.call()
        let oldPhase = actualPhase

        let block = await web3.eth.getBlockNumber()

        while (actualPhase != '1') {

            while (block < initialBlock + 5) {
                await timeout(2000)
                block = await web3.eth.getBlockNumber()
            }

            await vicrey.nextPhase({ from: accounts[0] })

            actualPhase = await vicrey.phase.call()

            if (actualPhase != oldPhase) {
                initialBlock = block
                oldPhase = actualPhase
            }
        }

        let nonce = "test"

        let firstBid = new BN(2000000000000000, 10)
        let firstHash = web3.utils.soliditySha3(nonce, firstBid.toString())
        
        await vicrey.commit(firstHash, { from: accounts[3], value: web3.utils.toWei("1500000000000000", "wei") })

        // Skip to opening phase
        initialBlock = await web3.eth.getBlockNumber()
        actualPhase = await vicrey.phase.call()
        oldPhase = actualPhase

        block = await web3.eth.getBlockNumber()

        while (actualPhase != '2') {

            while (block < initialBlock + 5) {
                await timeout(2000)
                block = await web3.eth.getBlockNumber()
            }

            await vicrey.nextPhase({ from: accounts[0] })

            actualPhase = await vicrey.phase.call()

            if (actualPhase != oldPhase) {
                initialBlock = block
                oldPhase = actualPhase
            }
        }

        let english = await EnglishAuction.at(list[0][0])

        // Skip to commitment phase
        initialBlock = await web3.eth.getBlockNumber()
        actualPhase = await vicrey.phase.call()
        oldPhase = actualPhase

        block = await web3.eth.getBlockNumber()

        while (actualPhase != '1') {

            while (block < initialBlock + 5) {
                await timeout(2000)
                block = await web3.eth.getBlockNumber()
            }

            await english.nextPhase({ from: accounts[0] })

            actualPhase = await english.phase.call()

            if (actualPhase != oldPhase) {
                initialBlock = block
                oldPhase = actualPhase
            }
        // }
    }
};