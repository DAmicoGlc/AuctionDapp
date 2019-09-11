/************************************************
 *  MANAGER auction transaction
 ***********************************************/

/**< Stop auction creation > */
function stopCreation() {
    App.contracts["AuctionManager"].deployed().then(async function (manager) {
        /** < Disable the button > */
        $('#creationBtn').prop('disabled', true);

        manager.stopCreation({
            from: App.account
        }).then(function (result) {
            /** < Show success > */
            createAlertSuccess("You successfully blocked the auction creation!");
            
            /** < Update the badge and button > */
            $('#creationBadge').removeClass('badge-success');
            $('#creationBadge').addClass('badge-danger');
            $('#creationBadge').text('OFF');

            $('#creationBtn').removeClass('btn-outline-danger');
            $('#creationBtn').addClass('btn-outline-success');
            $("#creationBtn").attr("onclick","App.startCreation(); return false;");
            $('#creationBtn').text("Start Creation");

            /** < Enable the button > */
            $('#creationBtn').prop('disabled', false);

            updateBalance();
        }).catch(function (err) {
            /** < Show error > */
            createAlertError("Internal Error, retry!");

            /** < Enable the button > */
            $('#creationBtn').prop('disabled', false);

            updateBalance();
        });
    });
}

/**< Start auction creation > */
function startCreation() {
    App.contracts["AuctionManager"].deployed().then(async function (manager) {
        /** < Disable the button > */
        $('#creationBtn').prop('disabled', true);

        manager.startCreation({
            from: App.account
        }).then(function (result) {
            /** < Show success > */
            createAlertSuccess("You successfully restarted the auction creation!");
            
            /** < Update the badge ad button > */
            $('#creationBadge').removeClass('badge-danger');
            $('#creationBadge').addClass('badge-success');
            $('#creationBadge').text('ON');

            $('#creationBtn').removeClass('btn-outline-success');
            $('#creationBtn').addClass('btn-outline-danger');
            $("#creationBtn").attr("onclick","App.stopCreation(); return false;");
            $('#creationBtn').text("Block Creation");

            /** < Enable the button > */
            $('#creationBtn').prop('disabled', false);

            updateBalance();
        }).catch(function (err) {
            /** < Show error > */
            createAlertError("Internal Error, retry!");

            /** < Enable the button > */
            $('#creationBtn').prop('disabled', false);

            updateBalance();
        });
    });
}

/**< Destroy auction Contract Manager > */
function destroyManager() {
    App.contracts["AuctionManager"].deployed().then(async function (manager) {
        var engLength = await manager.getEnglishNumber();
        var vicLength = await manager.getVicreyNumber();
        return [engLength, vicLength, manager];
    }).then(function(auctionInfo) {
        if (auctionInfo[0] > 0 || auctionInfo[1] > 0) {
            /** < Show error > */
            createAlertError("Some auction is still active, you need to wait before you can destroy the contract manager!");
        }
        else {
            /** < Disable the button > */
            $('#destroyBtn').prop('disabled', true);

            auctionInfo[2].destroyManager.estimateGas({
                from: App.account
            }).then(function(gasEstimate){
    
                let gas = new BN(gasEstimate, 10);
                /** < Set gas limit equal to 2 * gas estimate > */
                gas = gas.add(gas);
    
                /** < Proceed with the transaction > */
                auctionInfo[2].destroyManager({
                    from: App.account,
                    gas: gas
                }).then(function (result) {
                    /** < Show success > */
                    createAlertSuccess("You successfully destroyed the Auction Contract Manager!");
                    
                    /** < Update the interface > */
                    $('#accountInfo').find('.list-group').remove();
                    $('#colContent').empty();
                    $('#colContent').append(
                        "<p>The Auction Contract Manager provided does not exist!</p>");

                    updateBalance();
                }).catch(function (err) {
                    /** < Show error > */
                    createAlertError("Internal Error, retry! Maybe you run out of gas,"
                    + " try to increment the gasLimit value!");
                    /** < Enable the button > */
                    $('#destroyBtn').prop('disabled', false);

                    updateBalance();
                });
            }).catch(function (err) {
                /** < Show error > */
                createAlertError("Internal Error, retry!");
                /** < Enable the button > */
                $('#destroyBtn').prop('disabled', false);
            });
        }
    }).catch(function (err) {
        /** < Show error > */
        createAlertError("The Auction Contract Manager provided does not exist!");

        /** < Update the interface > */
        $('#accountInfo').find('.list-group').remove();
        $('#colContent').empty();
        $('#colContent').append(
            "<p>The Auction Contract Manager provided does not exist!</p>");
    });;
}

/************************************************
 *  VICREY auction transaction
 ***********************************************/

/** < Commit a bid transaction > */
function commitBid(address) {
    /** < Check if the address auction exists > */
    if (App.vicAuctions[address] === 'undefined') {
        createAlertError("Internal Error, retry!");
    }
    else {
        /** < Retrive hash > */
        var hash = $('#' + address).find('.card-body')
            .find('.input-group').find('input').val();

        var deposit = App.vicAuctions[address]['deposit'];

        if (hash == 0 || '') {
            createAlertError("You must provide an hash value!");
            return false;
        }

        /** < Warning the user about nonce  > */
        createAlertWarning('You must remember the "nonce" because will be needed'
            + ' in the Opening Phase. Moreover make sure that you bid is equal'
            + ' to or greater than the reserve price, otherwise you will receive assertion'
            + ' error in the opening phase');

        /** < Temporally disable the commit button > */
        $('#' + address).find('button:last').prop('disabled', true);
        /** < Temporally disable the update button > */
        $('#update' + address).prop('disabled', true);

        /** < Proceed with the transaction > */
        App.vicAuctions[address]['instance'].commit(hash, {
            from: App.account, 
            value: deposit
        }).then(function (result) {
            /** < Show success and dont enable the commit button > */
            createAlertSuccess("You successfully committed your bid!");

            /** < Update auction information > */
            App.updateVicUser(address);

            updateBalance();
        }).catch(function (err) {
            /** < Show error and enable buttons > */
            createAlertError("Internal Error, retry!");

            /** < Update auction information > */
            App.updateVicUser(address);

            updateBalance();
        });
    }
}

/** < Withdraw a bid transaction > */
function withdrawBid(address) {
    /** < Check if the address auction exists > */
    if (App.vicAuctions[address] === 'undefined') {
        createAlertError("Internal Error, retry!");
    }
    else {
        /** < Temporally disable the withdraw button > */
        $('#' + address).find('button:last').prop('disabled', true);
        /** < Temporally disable the update button > */
        $('#update' + address).prop('disabled', true);

        /** < Warning the user about nonce  > */
        createAlertWarning('You will lose half of deposit!');

        App.vicAuctions[address]['instance'].withdraw.estimateGas({
            from: App.account
        }).then(function(gasEstimate){

            let gas = new BN(gasEstimate, 10);
            /** < Set gas limit equal to 2 * gas estimate > */
            gas = gas.add(gas);

            App.vicAuctions[address]['instance'].withdraw({
                from: App.account,
                gas: gas
            }).then(function (result) {
                /** < Show success and dont enable the withdraw button > */
                createAlertSuccess("You successfully withdrawn your bid!");

                /** < Update auction information > */
                App.updateVicUser(address);

                updateBalance();
            }).catch(function (err) {

                /** < Show error and enable buttons > */
                createAlertError("Internal Error, retry! Maybe you run out of gas,"
                    + " try to increment the gasLimit value!");

                /** < Update auction information > */
                App.updateVicUser(address);

                updateBalance();
            });
        }).catch(function (err) {

            /** < Show error and enable buttons > */
            createAlertError("Internal Error, retry!");

            /** < Update auction information > */
            App.updateVicUser(address);
        });
    }
}

/** < Open a bid transaction > */
function openBid(address) {
    /** < Check if the address auction exists > */
    if (App.vicAuctions[address] === 'undefined') {
        createAlertError("Internal Error, retry!");
    }
    else {
        /** < Retrive information inserted by the user > */
        var nonce = $('#' + address).find('.card-body')
            .find('#nonceOpen').find('input').val();

        var bid = $('#' + address).find('.card-body')
            .find('#bidOpen').find('input').val();

        var measure = $('#' + address).find('.card-body')
            .find('#bidOpen').find('select option:selected').val();

        if (nonce == '' || nonce == null) {
            createAlertError("the input nonce is empty!");
            return false;
        }

        /** < Convert if needed and check if it is a number> */
        if (measure == 'eth') {
            try {
                bid = web3.utils.toWei(bid, 'ether');
            } catch (error) {
                createAlertError("the input bid must be a number!");
                return false;
            }
        }
        else {
            try {
                bid = web3.utils.toWei(bid, 'wei');
            } catch (error) {
                createAlertError("the input bid must be a number!");
                return false;
            }
        }

        /** < Temporally disable the commit button > */
        $('#' + address).find('button:last').prop('disabled', true);
        /** < Temporally disable the update button > */
        $('#update' + address).prop('disabled', true);

        App.vicAuctions[address]['instance'].openBid.estimateGas(nonce, {
            from: App.account, 
            value: bid
        }).then(function(gasEstimate){

            let gas = new BN(gasEstimate, 10);
            /** < Set gas limit equal to 2 * gas estimate > */
            gas = gas.add(gas);

            App.vicAuctions[address]['instance'].openBid(nonce, {
                from: App.account,
                gas: gas,
                value: bid
            }).then(function (result) {
                /** < Show success and dont enable the openBid button > */
                createAlertSuccess("You successfully opened your bid!");

                /** < Update auction information > */
                App.updateVicUser(address);

                updateBalance();
            }).catch(function (err) {
                /** < Show error and enable buttons > */
                createAlertError("Internal Error, retry! Maybe you run out of gas,"
                + " try to increment the gasLimit value!");

                /** < Update auction information > */
                App.updateVicUser(address);

                updateBalance();
            });
        }).catch(function (err) {
            /** < Show error and enable buttons > */
            createAlertError("Internal Error, retry!");

            /** < Update auction information > */
            App.updateVicUser(address);
        });;
    }
}

/************************************************
 *  ENGLISH auction transaction
 ***********************************************/

/** < Buy out the good transaction > */
function buyOut(address) {
    /** < Check if the address auction exists > */
    if (App.engAuctions[address] === 'undefined') {
        createAlertError("Internal Error, retry!");
    }
    else {
        /** < Temporally disable the buyOut button > */
        $('#' + address).find('button:last').prop('disabled', true);
        /** < Temporally disable the update button > */
        $('#update' + address).prop('disabled', true);

        var amount = App.engAuctions[address]['buyOutPrice'];

        /** < Proceed with the transaction > */
        App.engAuctions[address]['instance'].buyNow( amount, {
            from: App.account, 
            value: amount 
        }).then(function (result) {
            /** < Show success and dont enable the buyOut button > */
            createAlertSuccess("You successfully bought the good! Now your payement is pending!");
                
            /** < Update auction information > */
            App.updateEngUser(address);

            updateBalance();
        }).catch(function (err) {
            /** < Show error and enable buttons > */
            createAlertError("Internal Error, retry!");
            
            /** < Update auction information > */
            App.updateEngUser(address);

            updateBalance();
        });
    }
}

/** < Make a bid transaction > */
function makeBid(address) {
    /** < Check if the address auction exists > */
    if (App.engAuctions[address] === 'undefined') {
        createAlertError("Internal Error, retry!");
    }
    else {
        /** < Retrive amount information > */
        var amount = $('#' + address).find('.card-body')
            .find('.input-group').find('input').val();
        var measure = $('#' + address).find('.card-body')
            .find('.input-group').find('.input-group-append')
            .find('select option:selected').val();

        if (amount == '' || amount == null) {
            createAlertError("the input bid is empty!",);
            return false;
        }


        /** < Convert if needed and check if it is a number> */
        if (measure == 'eth') {
            try {
                amount = web3.utils.toWei(amount, 'ether');
            } catch (error) {
                createAlertError("the input bid must be a number!");
                return false;
            }
        }
        else {
            try {
                amount = web3.utils.toWei(amount, 'wei');
            } catch (error) {
                createAlertError("the input bid must be a number!");
                return false;
            }
        }


        amount = new BN(amount, 10);
        var bidIncr = App.engAuctions[address]['bidIncrement'];
        var highest = App.engAuctions[address]['actualPrice'];
        var reserve = App.engAuctions[address]['reservePrice'];

        let noBidder = /^0x0+$/.test( App.engAuctions[address]['actualWinner']);

        /** < Check the validity of the transaction > */
        if (amount.cmp(reserve) < 0) {
            createAlertError("your bid must equal to "
                + "or greater than to the reserve price!");
            return false;
        }
        else if ((amount.cmp(highest.add(bidIncr)) < 0 && !noBidder) 
                || (amount.cmp(highest) < 0 && noBidder)) {
            createAlertError("your bid must be equal to or"
                + " greater than (highest one + min increment)!"
                + " Or your bid must equal to or greater than to the reserve price!");
            return false;
        }
        else {
            /** < Temporally disable the makeBid button > */
            $('#' + address).find('button:last').prop('disabled', true);
            /** < Temporally disable the update button > */
            $('#update' + address).prop('disabled', true);

            /** < Proceed with the transaction > */
            App.engAuctions[address]['instance'].makeBid( amount, {
                from: App.account, 
                value: amount
            }).then(function (result) {
                    
                /** < Show success and dont enable the makeBid button > */
                createAlertSuccess("You successfully made your bid!");

                /** < Update auction information > */
                App.updateEngUser(address);

                updateBalance();
            }).catch(function (err) {
                /** < Show error and enable the makeBid button > */
                createAlertError("Internal Error, retry!");

                /** < Update auction information > */
                App.updateEngUser(address);

                updateBalance();
            });
        }
    }
}

/************************************************
 *  COMMON auction transaction
 ***********************************************/

/** < CreateAuction > */
function createAuction() {
    /** < Get inputs > */
    var type = $('#createType').find('option:selected').val();
    var title = $('#createTitle').val();
    var descr = $('#createDescription').val();
    var buyDep = $('#createBuyDep').val();
    var reserve = $('#createReserve').val();
    var incr = $('#createIncrement').val();

    var buyDepString;
    if (type=='eng')
        buyDepString = "Buy Out Price";
    else
        buyDepString = "Deposit";

    /** < Check if empty > */
    if (type == '' || type == 0) {
        $('#errorSpanType').text("The Type is required!");
        $('#errorSpanTitle').text("");
        $('#errorSpanDescription').text("");
        $('#errorSpanBuyDep').text("");
        $('#errorSpanReserve').text("");
        $('#errorSpanIncrement').text("");
        return false;
    }

    /** < Check if empty > */
    if (title == '' || title == null) {
        $('#errorSpanType').text("");
        $('#errorSpanTitle').text("The Title is required!");
        $('#errorSpanDescription').text("");
        $('#errorSpanBuyDep').text("");
        $('#errorSpanReserve').text("");
        $('#errorSpanIncrement').text("");
        return false;
    }

    /** < Check if empty > */
    if (descr == '' || descr == null) {
        $('#errorSpanType').text("");
        $('#errorSpanTitle').text("");
        $('#errorSpanDescription').text("The Description is required!");
        $('#errorSpanBuyDep').text("");
        $('#errorSpanReserve').text("");
        $('#errorSpanIncrement').text("");
        return false;
    }

    /** < Check if empty > */
    if (buyDep == '' || buyDep == null) {
        $('#errorSpanType').text("");
        $('#errorSpanTitle').text("");
        $('#errorSpanDescription').text("");
        $('#errorSpanBuyDep').text("The " + buyDepString + " is required!");
        $('#errorSpanReserve').text("");
        $('#errorSpanIncrement').text("");
        return false;
    } 

    /** < Check if empty > */
    if (reserve == '' || reserve == null) {
        $('#errorSpanType').text("");
        $('#errorSpanTitle').text("");
        $('#errorSpanDescription').text("");
        $('#errorSpanBuyDep').text("");
        $('#errorSpanReserve').text("The Reserve Price is required!");
        $('#errorSpanIncrement').text("");
        return false;
    }

    if (type == 'eng') {
        /** < Check if empty > */
        if (incr == '' || incr == null) {
            $('#errorSpanType').text("");
            $('#errorSpanTitle').text("");
            $('#errorSpanDescription').text("");
            $('#errorSpanBuyDep').text("");
            $('#errorSpanReserve').text("");
            $('#errorSpanIncrement').text("The Bid Increment is required!");
            return false;
        }
    }

    var buyDepMeasure = $('#measureBuyDep').find('option:selected').val();
    var resMeasure = $('#measureReserve').find('option:selected').val();
    var incrMeasure = $('#measureIncrement').find('option:selected').val();

    /** < Convert if needed and check if it is a number> */
    if (buyDepMeasure == 'eth') {
        try {
            buyDep = web3.utils.toWei(buyDep, 'ether');
        } catch (error) {
            $('#errorSpanAmount').text("");
            $('#errorSpanType').text("");
            $('#errorSpanTitle').text("");
            $('#errorSpanDescription').text("");
            $('#errorSpanBuyDep').text("The " + buyDepString + " must be a number!");
            $('#errorSpanReserve').text("");
            $('#errorSpanIncrement').text("");
            return false;
        }
    }
    else {
        try {
            buyDep = web3.utils.toWei(buyDep, 'wei');
        } catch (error) {
            $('#errorSpanAmount').text("");
            $('#errorSpanType').text("");
            $('#errorSpanTitle').text("");
            $('#errorSpanDescription').text("");
            $('#errorSpanBuyDep').text("The " + buyDepString + " must be a number!");
            $('#errorSpanReserve').text("");
            $('#errorSpanIncrement').text("");
            return false;
        }
    }

    /** < Convert if needed and check if it is a number> */
    if (resMeasure == 'eth') {
        try {
            reserve = web3.utils.toWei(reserve, 'ether');
        } catch (error) {
            $('#errorSpanAmount').text("");
            $('#errorSpanType').text("");
            $('#errorSpanTitle').text("");
            $('#errorSpanDescription').text("");
            $('#errorSpanBuyDep').text("");
            $('#errorSpanReserve').text("The Reserve Price must be a number!");
            $('#errorSpanIncrement').text("");
            return false;
        }
    }
    else {
        try {
            reserve = web3.utils.toWei(reserve, 'wei');
        } catch (error) {
            $('#errorSpanAmount').text("");
            $('#errorSpanType').text("");
            $('#errorSpanTitle').text("");
            $('#errorSpanDescription').text("");
            $('#errorSpanBuyDep').text("");
            $('#errorSpanReserve').text("");
            $('#errorSpanIncrement').text("");
            return false;
        }
    }

    if (type == 'eng') {
        /** < Convert if needed and check if it is a number> */
        if (incrMeasure == 'eth') {
            try {
                incr = web3.utils.toWei(incr, 'ether');
            } catch (error) {
                $('#errorSpanAmount').text("");
                $('#errorSpanType').text("");
                $('#errorSpanTitle').text("");
                $('#errorSpanDescription').text("");
                $('#errorSpanBuyDep').text("");
                $('#errorSpanReserve').text("");
                $('#errorSpanIncrement').text("The Bid Increment must be a number!");
                return false;
            }
        }
        else {
            try {
                incr = web3.utils.toWei(incr, 'wei');
            } catch (error) {
                $('#errorSpanAmount').text("");
                $('#errorSpanType').text("");
                $('#errorSpanTitle').text("");
                $('#errorSpanDescription').text("");
                $('#errorSpanBuyDep').text("The " + buyDepString + " must be a number!");
                $('#errorSpanReserve').text("");
                $('#errorSpanIncrement').text("The Bid Increment must be a number!");
                return false;
            }
        }
    }

    App.contracts["AuctionManager"].deployed().then(function (manager) {
        /** < Temporally disable the finilize button > */
        $('#createBtn').prop('disabled', true);
        if (type == 'eng') {
            manager.createEnglishAuction(buyDep, reserve, incr,{
                from: App.account
            }).then(function (result) {
                /** < Show success and dont enable the nextPhase button > */
                createAlertSuccess("You successfully created an Auction!");

                /** < Retrive auction info from the mysql server. > */
                $.post("http://localhost:5000/english/", {
                    address: result.logs[0].args[1],
                    title: title,
                    description: descr
                }, function () {
                    createAlertSuccess("The new auction has been successfully inserted in the DB!");
                }).fail(function() {
                    createAlertError("DB connection error!");
                });

                updateBalance();
            }).catch(function (err) {
                /** < Show error and enable the nextphase button > */
                createAlertError("Internal Error, retry!");
                $('#createBtn').prop('disabled', false);

                updateBalance();
            });
        }
        else {
            manager.createVicreyAuction(buyDep, reserve, {
                from: App.account
            }).then(function (result) {
                /** < Show success and dont enable the nextPhase button > */
                createAlertSuccess("You successfully created an Auction!");
                $.post("http://localhost:5000/vicrey/", {
                    address: result.logs[0].args[1],
                    title: title,
                    description: descr
                },
                function () {
                    createAlertSuccess("The new auction has been successfully inserted in the DB!");
                })
                .fail(function () {
                    createAlertError("DB connection error!");
                });

                updateBalance();
            }).catch(function (err) {
                /** < Show error and enable the nextphase button > */
                createAlertError("Internal Error, retry!");
                $('#createBtn').prop('disabled', false);

                updateBalance();
            });
        }
    });
}
 
/** < Next Phase transaction > */
function nextPhase(address, type, from) {
    /** < Check the auction type > */
    var contractInstance;
    var errorVal = 0;

    if (type == "eng") {
        /** < Check if the address auction exists > */
        if (App.engAuctions[address] === 'undefined')
            errorVal++;
        else
            contractInstance = App.engAuctions[address]['instance'];
    }
    else if (type == "vic") {
        /** < Check if the address auction exists > */
        if (App.vicAuctions[address] === 'undefined')
            errorVal++;
        else {
            contractInstance = App.vicAuctions[address]['instance'];
        }
    }
    else {
        errorVal++;
    }

    if (from != 'man' && from != 'user')
        errorVal++;

    if (!errorVal) {
        /** < Temporally disable the next phase button > */
        $('#' + address).find('button:last').prop('disabled', true);

        if (from == 'user'){
            /** < Temporally disable the update button > */
            $('#update' + address).prop('disabled', true);
        }

        contractInstance.nextPhase({ 
            from: App.account
        }).then(function (result) {
            /** < Show success and dont enable the nextPhase button > */
            createAlertSuccess("You successfully changed the Phase of the Auction!");
            
            /** < Update auction information > */
            if (from == 'man') {
                if (type == 'eng')
                    App.retriveEngManager();
                else
                    App.retriveVicManager();
            }
            else {
                if (type == 'eng')
                    App.updateEngUser(address);
                else if (type == 'vic')
                    App.updateVicUser(address);
            }

            updateBalance();
        }).catch(function (err) {
            /** < Show error and enable the nextphase button > */
            createAlertError("Internal Error, retry!");

            /** < Update auction information > */
            if (from == 'man') {
                if (type == 'eng')
                    App.retriveEngManager(address);
                else
                    App.retriveVicManager(address);
            }
            else {
                if (type == 'eng')
                    App.updateEngUser(address);
                else
                    App.updateVicUser(address);
            }

            updateBalance();
        });
    }
    else {
        createAlertError("Internal Error, retry!");
    }
}

/** < Finilize auction transaction > */
function finilize(address, type, from) {
    /** < Check the auction type > */
    var contractInstance;
    var errorVal = 0;

    if (type == "eng") {
        /** < Check if the address auction exists > */
        if (App.engAuctions[address] == 'undefined')
            errorVal++;
        else
            contractInstance = App.engAuctions[address]['instance'];            
    }
    else if (type == "vic") {
        /** < Check if the address auction exists > */
        if (App.vicAuctions[address] == 'undefined')
            errorVal++;
        else
            contractInstance = App.vicAuctions[address]['instance'];
    }
    else {
        errorVal++;
    }

    if (from != 'man' && from != 'user')
        errorVal++;

    if (!errorVal) {
        /** < Temporally disable the finilize button > */
        $('#' + address).find('button:last').prop('disabled', true);

        if (from == 'user'){
            /** < Temporally disable the update button > */
            $('#update' + address).prop('disabled', true);
        }

        contractInstance.finalize.estimateGas({
            from: App.account
        }).then(function(gasEstimate){

            let gas = new BN(gasEstimate, 10);
            /** < Set gas limit equal to 2 * gas estimate > */
            gas = gas.add(gas);

            /** < Proceed with the transaction > */
            contractInstance.finalize({
                from: App.account,
                gas: gas
            }).then(function (result) {
                /** < Show success and dont enable the nextPhase button > */
                createAlertSuccess("You successfully finilized the Auction!");

                let finilizeLog = result.logs[0].args[0];

                /** < If the auction is ended, remove it > */                    
                if (finilizeLog == "Finilized. No Bidder") {
                    App.removeAuctionCard(address);

                    /** < Delete the autions from the DB. > */
                    App.deleteRecord(address, type);
                }
                else {
                    /** < Otherwise update auction information > */
                    if (from == 'man') {
                        if (type == 'eng')
                            App.retriveEngManager(address);
                        else
                            App.retriveVicManager(address);
                    }
                    else {
                        if (type == 'eng')
                            App.updateEngUser(address);
                        else
                            App.updateVicUser(address);
                    }
                }

                updateBalance();
            }).catch(function (error) {
                /** < Show error and enable the nextphase button > */
                createAlertError("Internal Error, retry! Maybe you run out of gas,"
                    + " try to increment the gasLimit value!");

                /** < Update auction information > */
                if (from == 'man') {
                    if (type == 'eng')
                        App.retriveEngManager(address);
                    else
                        App.retriveVicManager(address);
                }
                else {
                    if (type == 'eng')
                        App.updateEngUser(address);
                    else
                        App.updateVicUser(address);
                }

                updateBalance();
            });
        }).catch(function (error) {
            /** < Show error and enable the nextphase button > */
            createAlertError("Internal Error, retry! Maybe you run out of gas,"
                + " try to increment the gasLimit value!");

            /** < Update auction information > */
            if (from == 'man') {
                if (type == 'eng')
                    App.retriveEngManager(address);
                else
                    App.retriveVicManager(address);
            }
            else {
                if (type == 'eng')
                    App.updateEngUser(address);
                else
                    App.updateVicUser(address);
            }

            updateBalance();
        });
    }
    else {
        createAlertError("Not a valid acution type or address!");
    }
}

/** < Extinguish pending payment transaction > */
function exePending(address, type) {

    /** < Check the auction type > */
    var contractInstance;
    var errorVal = 0;

    if (type == "eng") {
        /** < Check if the address auction exists > */
        if (App.engAuctions[address] == 'undefined')
            errorVal++;
        else
            contractInstance = App.engAuctions[address]['instance'];        
    }
    else if (type == "vic") {
        /** < Check if the address auction exists > */
        if (App.vicAuctions[address] == 'undefined')
            errorVal++;
        else
            contractInstance = App.vicAuctions[address]['instance'];            
    }
    else {
        errorVal++;
    }

    if (!errorVal) {
        /** < Temporally disable the finilize button > */
        $('#' + address).find('button').prop('disabled', true);

        if (from == 'user'){
            /** < Temporally disable the update button > */
            $('#update' + address).prop('disabled', true);
        }

        contractInstance.transferPending.estimateGas({
            from: App.account
        }).then(function(gasEstimate){

            let gas = new BN(gasEstimate, 10);
            /** < Set gas limit equal to 2 * gas estimate > */
            gas = gas.add(gas);

            contractInstance.transferPending({ 
                from: App.account,
                gas: gas
            }).then(function (result) {
                /** < Show success and dont enable the nextPhase button > */
                createAlertSuccess("You successfully transfered the pending payment!");

                /** < Remove the auction > */
                App.removeAuctionCard(address);

                /** < Delete the autions from the DB. > */
                App.deleteRecord(address, type);

                updateBalance();

            }).catch(function (err) {
                /** < Show error and enable the nextphase button > */
                createAlertError("Internal Error, retry! Maybe you run out of gas,"
                    + " try to increment the gasLimit value!");

                /** < Update auction information > */
                if (from == 'man') {
                    if (type == 'eng')
                        App.retriveEngManager(address);
                    else
                        App.retriveVicManager(address);
                }
                else {
                    if (type == 'eng')
                        App.updateEngUser(address);
                    else
                        App.updateVicUser(address);
                }

                updateBalance();
            });
        }).catch(function (err) {
            /** < Show error and enable the nextphase button > */
            createAlertError("Internal Error, retry!");

           /** < Update auction information > */
            if (from == 'man') {
                if (type == 'eng')
                    App.retriveEngManager(address);
                else
                    App.retriveVicManager(address);
            }
            else {
                if (type == 'eng')
                    App.updateEngUser(address);
                else
                    App.updateVicUser(address);
            }

            updateBalance();
        });
    }
    else {
        createAlertError("Not a valid acution type or address!");
    }
}

/** < Update displayed user balance > */
function updateBalance() {
    web3.eth.getBalance(App.account, function (err, balance) {
        if (err === null) {
            let balanceEth = web3.utils.fromWei(balance, 'ether');
            $('#userBalance').text('ETH ' + balanceEth);
        }
    });
}