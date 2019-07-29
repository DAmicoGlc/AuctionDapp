var manager = artifacts.require("./AuctionManager.sol");
var solc = require('solc')

module.exports = function(callback) {

    manager.web3.eth.getGasPrice(function(error, result){ 
        var gasPrice = Number(result);
        console.log("Gas Price is " + gasPrice + " wei"); // "10000000000000"

        var managerContract = web3.eth.contract(manager._json.abi);
        var contractData = managerContract.new.getData({data: manager._json.bytecode});
        var gas = Number(web3.eth.estimateGas({data: contractData}))


        console.log("gas estimation = " + gas + " units");
        console.log("gas cost estimation = " + (gas * gasPrice) + " wei");
        console.log("gas cost estimation = " + manager.web3.fromWei((gas * gasPrice), 'ether') + " ether");

    });


};
