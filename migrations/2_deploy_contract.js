var AuctionManager = artifacts.require("./AuctionManager.sol");
var EnglishAuction = artifacts.require("./EnglishAuction.sol");
var VicreyAuction = artifacts.require("./VicreyAuction.sol");

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


module.exports = async function (deployer, network, accounts) {
    if (network == "development") {

        /** < Retrive the first account */
        web3.eth.defaultAccount = web3.eth.accounts[0];

        /** < Deploy the contract manager */
        await deployer.deploy(AuctionManager);

        let active = await AuctionManager.deployed();

        await active.createEnglishAuction(new BN(1000000000000000, 10), new BN(1500000000000000, 10), new BN(50000000000000, 10), { from: accounts[3] });
        await active.createEnglishAuction(new BN(1500000000000000, 10), new BN(2000000000000000, 10), new BN(50000000000000, 10), { from: accounts[3] });
        await active.createEnglishAuction(new BN(2000000000000000, 10), new BN(3000000000000000, 10), new BN(50000000000000, 10), { from: accounts[3] });

        await active.createVicreyAuction(new BN(2000000000000000, 10), new BN(1500000000000000, 10), { from: accounts[1] });

        let englishList = await active.getEnglishAuctions({ from: accounts[3] });
        let vicreyList = await active.getVicreyAuctions({ from: accounts[1] });

        englishList.forEach(element => {
            sendEng(element);
        });
        vicreyList.forEach(element => {
            sendVic(element);
        });
    }
    else if (network == "ropsten") {
        await deployer.deploy(AuctionManager);
    }
};
