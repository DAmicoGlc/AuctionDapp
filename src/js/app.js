App = {
    web3Provider: null,
    contracts: {},
    contractsABI: {},
    couldCreate: {},
    engAuctions: {},
    vicAuctions: {},
    actualBlock:0,
    contractWeb3: {},
    network: null,
    eventsManager: {},

    init: async function () {
        /** < Show the loading circle. */
        $('.loaderEnglish').addClass('loader');
        $('.loaderEnglishRow').show();
        
        return await App.initWeb3();
    },

    initWeb3: async function () {
        if (typeof web3 != 'undefined') { // Check whether exists a provider, e.g Metamask
            App.web3Provider = window.ethereum;
            web3 = new Web3(App.web3Provider);
            try {
                // Permission popup
                ethereum.enable().then(async () => { console.log("DApp connected"); });
            }
            catch (error) { console.log(error); }
        } else { // Otherwise, create a new local instance of Web3
            App.web3Provider = new Web3.providers.HttpProvider(App.url);
            web3 = new Web3(App.web3Provider);
        }
        web3.eth.net.getNetworkType()
        .then(function (network) {
            App.network = network;
            return App.initContract();
        });
    },

    /**< Initilize contract */
    initContract: function () {
        /**< Load the Abstracts of the contracts */
        $.getJSON("AuctionManager.json").then(function (interface) {
            App.contracts["AuctionManager"] = TruffleContract(interface);
            App.contracts["AuctionManager"].setProvider(App.web3Provider);
        }).then(function () {
            $.getJSON("EnglishAuction.json").then(function (interface) {
                App.contracts["EnglishAuction"] = TruffleContract(interface);
                App.contracts["EnglishAuction"].setProvider(App.web3Provider);
            }).then(function () {
                $.getJSON("VicreyAuction.json").then(function (interface) {
                    App.contracts["VicreyAuction"] = TruffleContract(interface);
                    App.contracts["VicreyAuction"].setProvider(App.web3Provider);
                }).then(function () {
                    $.getJSON("Manager.json").then(function (interface) {
                        App.contractsABI["AuctionManager"] = interface;
                    }).then(function () {
                        $.getJSON("English.json").then(function (interface) {
                            App.contractsABI["EnglishAuction"] = interface;
                        }).then(function () {
                            $.getJSON("Vicrey.json").then(function (interface) {
                                App.contractsABI["VicreyAuction"] = interface;
                                return App.initAccount();
                            });
                        });
                    });
                });
            });
        });
    },

    /**< Initilize account */
    initAccount: function() {
        web3.eth.getCoinbase(function (err, account) {
            if (err === null) {
                try {
                    App.account = web3.utils.toChecksumAddress(account);
                    $('#userAddress').text(
                        account.slice(0, 6) + '...' +
                        account.slice(account.length - 4));

                    web3.eth.getBalance(App.account, function (err, balance) {
                        if (err === null) {
                            let balanceEth = web3.utils.fromWei(balance, 'ether');
                            $('#userBalance').text('ETH ' + balanceEth);
                        }
                    });
                    App.contracts["AuctionManager"].deployed().then(function (manager) {
                        return [manager.managerOwner(), manager];
                    }).then(function(managerAddress, manager) {
                        if (App.account == managerAddress) {
                            $('#nav-managing-tab').text("Settings");

                            $('#engOwn').find('h5').text("Suspended Auctions");
                            $('#engClo').find('h5').text("Pending Auctions");

                            $('#vicOwn').find('h5').text("Suspended Auctions");
                            $('#vicClo').find('h5').text("Pending Auctions");

                            $('#engOpe').hide();
                            $('#vicOpe').hide();

                            return App.retriveEngManager(manager);
                        }
                        else {
                            $('#nav-managing-tab').text("Create Auction");
                            return App.retriveEngInfo();
                        }
                    });
                } catch (error) {
                    $('#userAddress').text("Uknown");
                    $('#userBalance').text("Uknown");
                    createAlertError("please check the connection with MetaMask!", false);
                }
            }
            else {
                $('#userAddress').text("Uknown");
                $('#userBalance').text("Uknown");
                createAlertError("please check the connection with MetaMask!", false);
            }
        });
    },

    /**< Retrive English information for Manager */
    retriveEngManager: function(contract) {
        /** < Clear all previous auctions. */
        $('.engRow').remove();
        $('#engOwn').hide();
        $('#engClo').hide();

        /** < Show the loading circle. */
        $('.loaderEnglish').addClass('loader');
        $('.loaderEnglishRow').show();

        /**< Create a promise to retrive auctions info */
        var listPromise = new Promise(async function (resolve, reject) {
            var auctions = await contract.getAllAuctions();
            App.couldCreate = await contract.couldCreateAuction.call();

            resolve(auctions);
        });

        /** < Execute the promise. */
        listPromise.then(function (list) {
            /** < Retrive all auction info. */
            list[0].forEach(function (address, index) {
                /** < Create a promise. */
                let auctionPromise = new Promise(async function (resolve, reject) {
                    App.engAuctions[address] = {};

                    /** < Get the deployed contract at the specific address. */
                    App.engAuctions[address]['instance'] = await App.contracts["EnglishAuction"].at(address);

                    let auction = App.engAuctions[address]['instance'];

                    /** < Retrive all the needed information. */
                    App.engAuctions[address]['phase'] =         await auction.phase.call();
                    App.engAuctions[address]['blockCount'] =    new BN(await auction.blockCount.call());
                    App.engAuctions[address]['seller'] =        await auction.seller.call();
                    App.engAuctions[address]['winner'] =        await auction.actualWinner.call();

                    resolve(address);
                });

                /** < Execute the promise. */
                auctionPromise.then(function (address) {
                    /** < Get the bactual block number and show the auction on screen. */
                    web3.eth.getBlockNumber(function (error, block) {
                        if (!error)
                            App.displayEngManager(App.engAuctions[address], address, new BN(block, 10));
                        else
                            App.displayEngManager(App.engAuctions[address], address, 0);

                        return App.retriveVicManager(manager);
                    });
                }).catch((error) => {
                    createAlertError("Internal Error!", false);
                    console.error(error);
                });
            });
        }).catch((error) => {
            createAlertError("Internal Error!", false);
            console.error(error);
        });
    },

    /**< Retrive English information for Manager */
    retriveVicManager: function (contract) {
        /** < Clear all previous auctions. */
        $('.vicRow').remove();
        $('#vicOwn').hide();
        $('#vicClo').hide();

        /** < Show the loading circle. */
        $('.loaderVicrey').addClass('loader');
        $('.loaderVicreyRow').show();

        /**< Create a promise to retrive auctions info */
        var listPromise = new Promise(async function (resolve, reject) {
            var auctions = await contract.getAllAuctions();
            App.couldCreate = await contract.couldCreateAuction.call();

            resolve(auctions);
        });

        /** < Execute the promise. */
        listPromise.then(function (list) {
            /** < For each active auction. */
            list[1].forEach(function (address) {
                /** < Create a promise. */
                let auctionPromise = new Promise(async function (resolve, reject) {
                    App.vicAuctions[address] = {};

                    /** < Get the deployed contract at the specific address. */
                    App.vicAuctions[address]['instance'] = await App.contracts["VicreyAuction"].at(address);

                    let auction = App.vicAuctions[address]['instance'];

                    /** < Retrive all the needed information. */
                    App.vicAuctions[address]['phase'] =         await auction.phase.call();
                    App.vicAuctions[address]['blockCount'] =    new BN(await auction.blockCount.call());
                    App.engAuctions[address]['seller'] =        await auction.seller.call();
                    App.engAuctions[address]['winner'] =        await auction.actualWinner.call();

                    resolve(address);
                });

                /** < Execute the promise. */
                auctionPromise.then(function (address) {
                    /** < Get the bactual block number and show the auction on screen. */
                    web3.eth.getBlockNumber(function (error, block) {
                        if (!error)
                            App.displayVicManager(App.vicAuctions[address], address, new BN(block, 10));
                        else
                            App.displayVicManager(App.vicAuctions[address], address, 0);
                    });
                }).catch((error) => {
                    createAlertError("Internal Error!", false);
                    console.error(error);
                });
            });
        }).catch((error) => {
            createAlertError("Internal Error!", false);
            console.error(error);
        });
    },

    /**< Display information of all English Auction */
    displayEngManager: function (auction, address, actualBlock) {
        /** < Differen english phase. */
        const engPhase = [
            'Glory Phase',
            'Submitting Phase',
            'Finilizing Phase',
            'Pending Phase'
        ]

        /** < Differentiate the auction with respect to the phase */
        var container = false;
        var phase = auction['phase'];
        var cardTemplate = $('.auctionTemplate');

        /** < If the phase is blocked from 2 days */
        var nextPhase = 0;
        if (actualBlock == 0) {
            nextPhase = -1;
        } else {
            if ((actualBlock.sub(auction['blockCount'])).cmp(new BN(576)) > 0) {
                nextPhase = 1;
            }
        }

        /** < Create a new card */
        var auctionCard = cardTemplate.clone();
        auctionCard.attr('id', address);
        auctionCard.removeClass('auctionTemplate');
        auctionCard.addClass('cardTemplate');

        auctionCard.find('.card-body').find('h5')
            .append('<button class="btn btn-warning btn-sm float-right" '
            + 'onclick="App.updateEngInfo(\''+address+'\'); return false;"' 
            + '><i class="fa fa-refresh"></i></button>');

        /** < Create a related column */
        var newCol = document.createElement('div');
        newCol.setAttribute('class', 'col-xs-12 col-sm-12 col-md-6 col-lg-6 mb-2');

        auctionCard.appendTo(newCol);

        /** < If in pending phase always show it */
        if (engPhase[phase] == "Pending Phase") {
            /** < Populate the card */
            managerCardPending(auction, auctionCard,
                actualBlock.sub(auction['blockCount']), address);

            container = $('#engOwn');

        } else if (nextPhase == 1) {
            /** < If is suspended from 2 days show it */

            /** < Populate the card */
            managerCardSuspended(auction, auctionCard, engPhase[auction['phase']],
                actualBlock.sub(auction['blockCount']), address);

            container = $('#engClo');
        }

        /** < If the container was not updated, don't show the auction */
        if (container != false) {

            let childrenRow = container.children('.row');
            let rowCount = childrenRow.size();

            if ((rowCount - 1) % 2 == 0) {
                /** < Create a new Row */
                let row = document.createElement('div');
                row.setAttribute('class', 'row mt-2 engRow');
                container.append(row);

                row.append(newCol);
            }
            else
                childrenRow[(rowCount - 1)].append(newCol)

            if (rowCount == 1) {
                container.show();
            }

            if ($('.loaderEnglish').hasClass('loader')) {
                $('.loaderEnglishRow').hide();
                $('.loaderEnglish').removeClass('loader');
            }

            auctionCard.show();
        }
    },

    /**< Display information of all Vicrey Auction */
    displayVicManager: function (auction, address, actualBlock) {
        /** < Differen vicrey phase. */
        const vicPhase = [
            'Glory Phase',
            'Commitment Phase',
            'Withdrawal Phase',
            'Opening Phase',
            'Finilizing Phase',
            'Pending Phase'
        ]

        /** < Differentiate the auction with respect to the phase */
        var container = false;
        var phase = auction['phase'];
        var cardTemplate = $('.auctionTemplate');

        /** < If the phase is blocked from 2 days */
        var nextPhase = 0;
        if (actualBlock == 0) {
            nextPhase = -1;
        } else {
            if ((actualBlock.sub(auction['blockCount'])).cmp(new BN(576)) > 0) {
                nextPhase = 1;
            }
        }

        /** < Create a new card */
        var auctionCard = cardTemplate.clone();
        auctionCard.attr('id', address);
        auctionCard.removeClass('auctionTemplate');
        auctionCard.addClass('cardTemplate');

        auctionCard.find('.card-body').find('h5')
            .append('<button class="btn btn-warning btn-sm float-right" '
                + 'onclick="App.updateEngInfo(\'' + address + '\'); return false;"'
                + '><i class="fa fa-refresh"></i></button>');

        /** < Create a related column */
        var newCol = document.createElement('div');
        newCol.setAttribute('class', 'col-xs-12 col-sm-12 col-md-6 col-lg-6 mb-2');

        auctionCard.appendTo(newCol);

        /** < If in pending phase always show it */
        if (engPhase[phase] == "Pending Phase") {
            /** < Populate the card */
            managerCardPending(auction, auctionCard,
                actualBlock.sub(auction['blockCount']), address, 'vic');

            container = $('#vicOwn');

        } else if (nextPhase == 1) {
            /** < If is suspended from 2 days show it */

            /** < Populate the card */
            managerCardSuspended(auction, auctionCard, engPhase[auction['phase']],
                actualBlock.sub(auction['blockCount']), address, 'vic');

            container = $('#vicClo');
        }

        /** < If the container was not updated, don't show the auction */
        if (container != false) {

            let childrenRow = container.children('.row');
            let rowCount = childrenRow.size();

            if ((rowCount - 1) % 2 == 0) {
                /** < Create a new Row */
                let row = document.createElement('div');
                row.setAttribute('class', 'row mt-2 vicRow');
                container.append(row);

                row.append(newCol);
            }
            else
                childrenRow[(rowCount - 1)].append(newCol)

            if (rowCount == 1) {
                container.show();
            }

            if ($('.loaderVicrey').hasClass('loader')) {
                $('.loaderVicreyRow').hide();
                $('.loaderVicrey').removeClass('loader');
            }

            auctionCard.show();
        }
    },

    /**< Next phase from manager */
    nextPhaseManager: function(address, type) {
        /** < Check the auction type */
        var contractInstance;
        var errorVal = 0;

        if (type == "eng") {
            /** < Check if the address auction exists */
            if (App.engAuctions[address] === 'undefined')
                errorVal++;
        }
        else if (type == "vic") {
            /** < Check if the address auction exists */
            if (App.vicAuctions[address] === 'undefined')
                errorVal++;
        }
        else {
            errorVal++;
        }

        if (!errorVal) {
            /** < Temporally disable the next phase button */
            $('#' + address).find('button:last').prop('disabled', true);

            contractInstance.nextPhase(
                { from: App.account })
                .then(function (result) {
                    /** < Show success and dont enable the nextPhase button */
                    createAlertSuccess("You successfully change the Phase of the Auction!", address);
                }).catch(function (err) {
                    /** < Show error and enable the nextphase button */
                    createAlertError(err.message, address);
                    $('#' + address).find('button:last').prop('disabled', false);
                });
        }
        else {
            createAlertError("an internal error occurred!", address);
        }
    },

    /**< Finilize from manager */
    finilizeManager: function(address, type) {

    },

    /**< Extinguis from manager */
    extinguishManager: function(address, type) {

    },

    /**< Retrive information of all English Auction */
    retriveEngInfo: function() {
        /** < Clear all previous auctions. */
        $('.engRow').remove();
        $('#engOwn').hide();
        $('#engOpe').hide();
        $('#engClo').hide();

        /** < Show the loading circle. */
        $('.loaderEnglish').addClass('loader');
        $('.loaderEnglishRow').show();

        
        App.contracts["AuctionManager"].deployed().then(function (manager) {
            return manager.getAllAuctions();
        }).then(function (auctionList) {
            /** < For each active auction. */
            auctionList[0].forEach(function (address) {
                /** < Create a promise. */
                let auctionPromise = new Promise(async function(resolve) {
                    App.engAuctions[address] = {};

                    /** < Get the deployed contract at the specific address. */
                    App.engAuctions[address]['instance'] =  await App.contracts["EnglishAuction"].at(address);

                    let auction = App.engAuctions[address]['instance'];

                    /** < Retrive all the needed information. */
                    App.engAuctions[address]['seller'] =           await auction.seller.call();
                    App.engAuctions[address]['phase'] =            await auction.phase.call();
                    App.engAuctions[address]['actualWinner'] =     await auction.actualWinner.call();
                    App.engAuctions[address]['bidIncrement'] =     new BN(await auction.bidIncrement.call());
                    App.engAuctions[address]['actualPrice'] =      new BN(await auction.actualPrice.call());
                    App.engAuctions[address]['buyOutPrice'] =      new BN(await auction.buyOutPrice.call());
                    App.engAuctions[address]['reservePrice'] =     new BN(await auction.reservePrice.call());
                    App.engAuctions[address]['blockCount'] =       new BN(await auction.blockCount.call());

                    /** < Iniitlize subscriptions. */
                    App.engAuctions[address]['newPhaseEvent']       = false;
                    App.engAuctions[address]['buyOutEvent']         = false;
                    App.engAuctions[address]['newHighestEvent']     = false;
                    App.engAuctions[address]['newPendingEvent']     = false;
                    App.engAuctions[address]['noBidEvent']          = false;
                    App.engAuctions[address]['exePendingEvent']     = false;

                    /** < Retrive auction info from the mysql server. */
                    $.get("http://localhost:5000/english/"+address, function (data, status) {
                        if (data !== 'undefined' && data != 0) {
                            App.engAuctions[address]['title'] = data[0].title;
                            App.engAuctions[address]['description'] = data[0].description;
                        }
                        else {
                            App.engAuctions[address]['title'] = 'not defined';
                            App.engAuctions[address]['description'] = 'not defined';
                        }
                    });

                    resolve(address);
                });

                /** < Execute the promise. */
                auctionPromise.then(function (address) {
                    /** < Get the actual block number and show the auction on screen. */
                    web3.eth.getBlockNumber(function (error, block) {
                        if (!error) 
                            App.displayEngAuction(App.engAuctions[address], address, new BN(block, 10));
                        else
                            App.displayEngAuction(App.engAuctions[address], address, 0);
                    });
                }).catch( (error) => {
                    createAlertError("Internal Error!", false);
                    console.error(error);
                });
            });
        });
        return App.retriveVicInfo();
    },
         
    /**< Retrive information of all Vicrey Auction */
    retriveVicInfo: function() {
        /** < Clear all previous auctions. */
        $('.vicRow').remove();
        $('#vicOwn').hide();
        $('#vicOpe').hide();
        $('#vicClo').hide();

        /** < Show the loading circle. */
        $('.loaderVicrey').addClass('loader');
        $('.loaderVicreyRow').show();

        App.contracts["AuctionManager"].deployed().then(function (manager) {
            return manager.getAllAuctions();
        }).then(function (auctionList) {
            /** < For each active auction. */
            auctionList[1].forEach(function (address) {
                /** < Create a promise. */
                let auctionPromise = new Promise(async function (resolve, reject) {
                    App.vicAuctions[address] = {};

                    /** < Get the deployed contract at the specific address. */
                    App.vicAuctions[address]['instance'] = await App.contracts["VicreyAuction"].at(address);

                    let auction = App.vicAuctions[address]['instance'];                    

                    /** < Retrive all the needed information. */
                    App.vicAuctions[address]['seller'] =        await auction.seller.call();
                    App.vicAuctions[address]['phase'] =         await auction.phase.call();
                    App.vicAuctions[address]['actualWinner'] =  await auction.actualWinner.call();
                    App.vicAuctions[address]['highest'] =       new BN(await auction.highestBid.call());
                    App.vicAuctions[address]['actualPrice'] =   new BN(await auction.actualPrice.call());
                    App.vicAuctions[address]['deposit'] =       new BN(await auction.deposit.call());
                    App.vicAuctions[address]['reservePrice'] =  new BN(await auction.reservePrice.call());
                    App.vicAuctions[address]['isIn'] =          await auction.bidHash.call(App.account);
                    App.vicAuctions[address]['blockCount'] =    new BN(await auction.blockCount.call());

                    /** < Iniitlize subscriptions. */
                    App.vicAuctions[address]['newPhaseEvent']       = false;
                    App.vicAuctions[address]['newHighestEvent']     = false;
                    App.vicAuctions[address]['secondHighestEvent']  = false;
                    App.vicAuctions[address]['newPendingEvent']     = false;
                    App.vicAuctions[address]['noBidEvent']          = false;
                    App.vicAuctions[address]['exePendingEvent']     = false;

                    if (web3.utils.toBN(App.vicAuctions[address]['isIn']) == 0) {
                        App.vicAuctions[address]['isIn'] = false;
                    }
                    else {
                        App.vicAuctions[address]['isIn'] = true;
                    }

                    /** < Retrive auction info from the mysql server. */
                    $.get("http://localhost:5000/vicrey/" + address, function (data, status) {
                        if (data !== 'undefined' && data != 0) {
                            App.vicAuctions[address]['title'] = data[0].title;
                            App.vicAuctions[address]['description'] = data[0].description;
                        }
                        else {
                            App.vicAuctions[address]['title'] = 'not defined';
                            App.vicAuctions[address]['description'] = 'not defined';
                        }
                    });

                    resolve(address);
                });

                /** < Execute the promise. */
                auctionPromise.then(function (address) {
                    /** < Get the bactual block number and show the auction on screen. */
                    web3.eth.getBlockNumber(function (error, block) {
                        if (!error) {
                            App.displayVicAuction(App.vicAuctions[address], address, new BN(block, 10));
                        }
                        else 
                            App.displayVicAuction(App.vicAuctions[address], address, 0);
                    });
                }).catch((error) => {
                    createAlertError("Internal Error!", false);
                    console.error(error);
                });
            });
        });
    },

    /**< Activate BuyOut English event listener */
    listenBuyOutEng: function (auction, address) {
        /**< Instanciate the contract */
        var contract = new web3.eth.Contract(App.contractsABI["EnglishAuction"], address);

        /**< Subscribe to the event */
        contract.once('LogBuyOut', {
            fromBlock: 'latest'
        }, function (error, event) {
            if (event !== 'undefined') {

                /**< Check if it is the active Tab */
                if (!$('#nav-english-tab').hasClass('active')) {
                    if ($('#eventEngBadge').html() == "")
                        $('#eventEngBadge').text("1");
                    else
                        $('#eventEngBadge').text(parseInt($('#eventEngBadge').html(), 10) + 1);
                }
                else {
                    createAlertWarning("A new event<strong>"
                        + "LogBuyOut</strong> has been fired from "
                        + auction['title'] + ", the good has been sell for "
                        + web3.utils.fromWei(event.returnValues[1], 'ether') + " ETH!");
                }

                /**< Update the resulting auction */
                auction[address] = undefined;                
            }
        });
    },

    /**< Activate New Second Highest Vicrey event listener */
    listenSecondHisghestVic: function (auction, address) {
        /**< Instanciate the contract */
        var contract = new web3.eth.Contract(App.contractsABI["VicreyAuction"], address);

        /**< Subscribe to the event */
        contract.once('LogNewSecondHighest', {
            fromBlock: 'latest'
        }, function (error, event) {
            if (event !== 'undefined') {
                /**< Check if it is the active Tab */
                if (!$('#nav-vicrey-tab').hasClass('active')) {
                    if ($('#eventVicBadge').html() == "")
                        $('#eventVicBadge').text("1");
                    else
                        $('#eventVicBadge').text(parseInt($('#eventVicBadge').html(), 10) + 1);
                }
                else {
                    createAlertWarning("A new event<strong>"
                        + "LogNewSecondHighest</strong> has been fired from "
                        + auction['title'] + ", the actual second highest is "
                        + web3.utils.fromWei(event.returnValues[1], 'ether') + " ETH!");
                }

                /**< Update the resulting auction */
                auction[address] = undefined;
                App.updateVicInfo(address);
            }
        });
    },

    /**< Activate NewHighest event listener */
    listenHighest: function (auction, address, type) {
        var contract = false;
        var badge = "";
        var nav = "";

        /**< Instanciate the contract */
        if (type == 'eng') {
            contract = new web3.eth.Contract(App.contractsABI["EnglishAuction"], address);
            badge = '#eventEngBadge';
            nav = '#nav-english-tab';
        }
        else if (type == 'vic') {
            contract = new web3.eth.Contract(App.contractsABI["EnglishAuction"], address);
            badge = '#eventVicBadge';
            nav = '#nav-vicrey-tab';
        }
        if (contract != false) {
            /**< Subscribe to the event */
            contract.once('LogNewHighest', {
                fromBlock: 'latest'
            }, function (error, event) {
                if (event !== 'undefined') {
                    /**< Check if it is the active Tab */
                    if (!$(nav).hasClass('active')) {
                        if ($(badge).html() == "")
                            $(badge).text("1");
                        else
                            $(badge).text(parseInt($(badge).html(), 10) + 1);
                    }
                    else {
                        createAlertWarning("A new event<strong>"
                            + "LogNewHighest</strong> has been fired from "
                            + auction['title'] + ", the actual highest is "
                            + web3.utils.fromWei(event.returnValues[1], 'ether') + " ETH!");
                    }
                    /**< Update the resulting auction */
                    auction[address] = undefined;
                    if (type == 'eng')
                        App.updateEngInfo(address);
                    else
                        App.updateVicInfo(address);
                }
            });
        }
    },

    /**< Activate No Bidder event listener */
    listenNoBidder: function (auction, address, type) {
        var contract = false;
        var badge = "";
        var nav = "";

        /**< Instanciate the contract */
        if (type == 'eng') {
            contract = new web3.eth.Contract(App.contractsABI["EnglishAuction"], address);
            badge = '#eventEngBadge';
            nav = '#nav-english-tab';
        }
        else if (type == 'vic') {
            contract = new web3.eth.Contract(App.contractsABI["EnglishAuction"], address);
            badge = '#eventVicBadge';
            nav = '#nav-vicrey-tab';
        }

        if (contract != false) {
            /**< Subscribe to the event */
            contract.once('LogNoBidder', {
                fromBlock: 'latest'
            }, function (error, event) {
                if (event !== 'undefined') {
                    /**< Check if it is the active Tab */
                    if (!$(nav).hasClass('active')) {
                        if ($(badge).html() == "")
                            $(badge).text("1");
                        else
                            $(badge).text(parseInt($(badge).html(), 10) + 1);
                    }
                    else {
                        createAlertWarning("A new event<strong>"
                            + "LogNoBidder</strong> has been fired from "
                            + auction['title'] + "!");
                    }

                    /**< Update the resulting auction */
                    auction[address] = undefined;
                }
            });
        }
    },

    /**< Activate NewPhase event listener */
    listenNewPhase: function (auction, address, type) {
        var contract = false;
        var badge = "";
        var nav = "";

        /**< Instanciate the contract */
        if (type == 'eng') {
            contract = new web3.eth.Contract(App.contractsABI["EnglishAuction"], address);
            badge = '#eventEngBadge';
            nav = '#nav-english-tab';
        }
        else if (type == 'vic') {
            contract = new web3.eth.Contract(App.contractsABI["EnglishAuction"], address);
            badge = '#eventVicBadge';
            nav = '#nav-vicrey-tab';
        }

        if(contract != false) {
            /**< Subscribe to the event */
            contract.once('LogNewPhase', {
                fromBlock: 'latest'
            }, function (error, event) {
                if (event !== 'undefined') {
                    /**< Check if it is the active Tab */
                    if (!$(nav).hasClass('active')) {
                        if ($(badge).html() == "")
                            $(badge).text("1");
                        else
                            $(badge).text(parseInt($(badge).html(), 10) + 1);
                    }
                    else {
                        createAlertWarning("A new event<strong>"
                            + "LogNewPhase</strong> has been fired from "
                            + auction['title'] + "!");
                    }

                    /**< Update the resulting auction */
                    auction[address] = undefined;
                    if (type == 'eng')
                        App.updateEngInfo(address);
                    else 
                        App.updateVicInfo(address);
                }
                
            });
        }
    },

    /**< Activate New Pending event listener */
    listenNewPending: function (auction, address, type) {
        var contract = false;
        var badge = "";
        var nav = "";

        /**< Instanciate the contract */
        if (type == 'eng') {
            contract = new web3.eth.Contract(App.contractsABI["EnglishAuction"], address);
            badge = '#eventEngBadge';
            nav = '#nav-english-tab';
        }
        else if (type == 'vic') {
            contract = new web3.eth.Contract(App.contractsABI["EnglishAuction"], address);
            badge = '#eventVicBadge';
            nav = '#nav-vicrey-tab';
        }

        if (contract != false) {
            /**< Subscribe to the event */
            contract.once('LogAddPending', {
                fromBlock: 'latest'
            }, function (error, event) {
                if (event !== 'undefined') {
                    /**< Check if it is the active Tab */
                    if (!$(nav).hasClass('active')) {
                        if ($(badge).html() == "")
                            $(badge).text("1");
                        else
                            $(badge).text(parseInt($(badge).html(), 10) + 1);
                    }
                    else {
                        createAlertWarning("A new event<strong>" 
                            + "LogAddPending</strong> has been fired from " 
                            + auction['title'] +"!");
                    }

                    /**< Update the resulting auction */
                    auction[address] = undefined;
                    if (type == 'eng')
                        App.updateEngInfo(address);
                    else
                        App.updateVicInfo(address);
                    
                }
            });
        }
    },

    /**< Activate New Pending event listener */
    listenExePending: function (auction, address, type) {
        var contract = false;
        var badge = "";
        var nav = "";

        /**< Instanciate the contract */
        if (type == 'eng') {
            contract = new web3.eth.Contract(App.contractsABI["EnglishAuction"], address);
            badge = '#eventEngBadge';
            nav = '#nav-english-tab';
        }
        else if (type == 'vic') {
            contract = new web3.eth.Contract(App.contractsABI["EnglishAuction"], address);
            badge = '#eventVicBadge';
            nav = '#nav-vicrey-tab';
        }

        if (contract != false) {
            /**< Subscribe to the event */
            contract.once('LogExePending', {
                fromBlock: 'latest'
            }, function (error, event) {
                if (event !== 'undefined') {
                    /**< Check if it is the active Tab */
                    if (!$(nav).hasClass('active')) {
                        if ($(badge).html() == "")
                            $(badge).text("1");
                        else
                            $(badge).text(parseInt($(badge).html(), 10) + 1);
                    }
                    else {
                        createAlertWarning("A new event<strong>"
                            + "LogExePending</strong> has been fired from "
                            + auction['title'] + ", extinguished "
                            + web3.utils.fromWei(event.returnValues[1], 'ether') + " ETH!");
                    }

                    /**< Update the resulting auction */
                    auction[address] = undefined;
                }
                
            });
        }
    },

    /**< Activate New Creation From Manager event listener */
    listenNewCreation: function (address) {
        var contract = new web3.eth.Contract(App.contractsABI["AuctionManager"], address);

        /**< Subscribe to English creation event */
        contract.once('LogEngCreateAuction', {
            fromBlock: 'latest'
        }, function (error, event) {
            if (event !== 'undefined') {
                /**< Check if it is the active Tab */
                if (!$('#nav-english-tab').hasClass('active')) {
                    if ($('#eventEngBadge').html() == "")
                        $('#eventEngBadge').text("1");
                    else
                        $('#eventEngBadge').text(parseInt($('#eventEngBadge').html(), 10) + 1);
                }
                else {
                    createAlertWarning("A new event<strong>"
                        + "LogEngCreateAuction</strong>, the new auction is "
                        + auction['title'] + "!");
                }

                /**< Update the resulting auction */
                
            }
        });

        /**< Subscribe to Vicrey creation event */
        contract.once('LogVicCreateAuction', {
            fromBlock: 'latest'
        }, function (error, event) {
            if (event !== 'undefined') {
                /**< Check if it is the active Tab */
                if (!$('#nav-vicrey-tab').hasClass('active')) {
                    if ($('#eventVicBadge').html() == "")
                        $('#eventVicBadge').text("1");
                    else
                        $('#eventVicBadge').text(parseInt($('#eventVicBadge').html(), 10) + 1);
                }
                else {
                    createAlertWarning("A new event<strong>"
                        + "LogVicCreateAuction</strong>, the new auction is "
                        + auction['title'] + "!");
                }

                /**< Update the resulting auction */
                
            }
        });
    },

    /**< Activate StopCreation From Manager event listener */
    listenStopCreation: function (address) {
        var contract = new web3.eth.Contract(App.contractsABI["AuctionManager"], address);

        /**< Subscribe to English creation event */
        contract.once('LogStopAuctionCreation', {
            fromBlock: 'latest'
        }, function (error, event) {
            if (event !== 'undefined') {

                createAlertWarning("A new event<strong>"
                    + "LogStopAuctionCreation</strong>,"+
                    +" it is not possible to create new auctions!");

                /**< Update the resulting auction */
                
            }
        });
    },

    /**< Activate Start Creation From Manager event listener */
    listenStopCreation: function (address) {
        var contract = new web3.eth.Contract(App.contractsABI["AuctionManager"], address);

        /**< Subscribe to English creation event */
        contract.once('LogStartAuctionCreation', {
            fromBlock: 'latest'
        }, function (error, event) {
            if (event !== 'undefined') {
                createAlertWarning("A new event<strong>"
                    + "LogStartAuctionCreation</strong>," +
                    +" it is now possible to create new auctions!");

                /**< Update the resulting auction */
            }
        });
    },

    /**< Display information of an English Auction */
    displayEngAuction: function (auction, address, actualBlock) {
        /** < Differen english phase. */
        const engPhase = [
            'Glory Phase',
            'Submitting Phase',
            'Finilizing Phase',
            'Pending Phase'
        ]

        /** < Differentiate the auction with respect to the phase */
        var container = false;
        var phase = auction['phase'];
        var cardTemplate = $('.auctionTemplate');

        var nextPhase = 0;
        if (actualBlock == 0) {
            nextPhase = -1;
        } else {
            if ((actualBlock.sub(auction['blockCount'])).cmp(new BN(5)) > 0) {
                nextPhase = 1;
            }
        }

        /** < Create a new card */
        var auctionCard = cardTemplate.clone();
        auctionCard.attr('id', address);
        auctionCard.removeClass('auctionTemplate');
        auctionCard.addClass('cardTemplate');
        auctionCard.find('.card-body').find('h5')
            .text(auction['title']);
        $('<br /><p><strong>Description: </strong>' + auction['description'] + '</p>')
            .insertAfter(auctionCard.find('.card-body').find('h5'));

        auctionCard.find('.card-body').find('h5')
            .append('<button class="btn btn-warning btn-sm float-right" '
                + 'onclick="App.updateEngInfo(\'' + address + '\'); return false;"'
                + '><i class="fa fa-refresh"></i></button>');

        /** < Create a related column */
        var newCol = document.createElement('div');
        newCol.setAttribute('class', 'col-xs-12 col-sm-12 col-md-6 col-lg-6 mb-2');

        auctionCard.appendTo(newCol);

        if (auction['seller'] == App.account) {
            /** < Populate the card */
            newCardOwnEng(auction, auctionCard, engPhase[auction['phase']], nextPhase, actualBlock);

            /**< Subscribe to events */
            switch (engPhase[auction['phase']]) {
                case 'Glory Phase':
                    if (auction['newPhaseEvent'] == false) {
                        auction['newPhaseEvent'] = true;
                        App.listenNewPhase(auction, address, 'eng');
                    }
                    if (auction['buyOutEvent'] == false) {
                        auction['buyOutEvent'] = true;
                        App.listenBuyOutEng(auction, address);
                    }
                    break;
                case 'Submitting Phase':
                    if (auction['newPhaseEvent'] == false) {
                        auction['newPhaseEvent'] = true;
                        App.listenNewPhase(auction, address, 'eng');
                    }
                    if (auction['newHighestEvent'] == false) {
                        auction['newHighestEvent'] = true;
                        App.listenHighest(auction, address, 'eng');
                    }
                    break;
                case 'Finilizing Phase':
                    if (auction['newPendingEvent'] == false) {
                        auction['newPendingEvent'] = true;
                        App.listenNewPending(auction, address, 'eng');
                    }
                    if (auction['noBidEvent'] == false) {
                        auction['noBidEvent'] = true;
                        App.listenNoBidder(auction, address, 'eng');
                    }
                    break;
                case 'Pending Phase':
                    if (auction['exePendingEvent'] == false) {
                        auction['exePendingEvent'] = true;
                        App.listenExePending(auction, address, 'eng');
                    }
                    break;     
                default:
                    break;
            }
            container = $('#engOwn');
        }
        else {
            switch (engPhase[phase]) {
                case 'Glory Phase':
                    /** < Populate the card */
                    newCardGloryEng(auction, auctionCard, nextPhase, actualBlock);

                    /**< Subscribe to events */
                    if (auction['newPhaseEvent'] == false) {
                        auction['newPhaseEvent'] = true;
                        App.listenNewPhase(auction, address, 'eng');
                    }
                    if (auction['buyOutEvent'] == false) {
                        auction['buyOutEvent'] = true;
                        App.listenBuyOutEng(auction, address);
                    }

                    container = $('#engOpe');
                    break;
                case 'Submitting Phase':
                    /** < Populate the card */
                    if (nextPhase == 1) {
                        if (auction['actualWinner'] == App.account) {
                            newCardFinilize(auction, auctionCard, engPhase[auction['phase']], 'eng');

                            if (auction['newPendingEvent'] == false) {
                                auction['newPendingEvent'] = true;
                                App.listenNewPending(auction, address, 'eng');
                            }

                            container = $('#engClo');
                        }
                    }
                    else {
                        newCardSubmitEng(auction, auctionCard, nextPhase, actualBlock);

                        /**< Subscribe to events */
                        if (auction['newPhaseEvent'] == false) {
                            auction['newPhaseEvent'] = true;
                            App.listenNewPhase(auction, address, 'eng');
                        }
                        if (auction['newHighestEvent'] == false) {
                            auction['newHighestEvent'] = true;
                            App.listenHighest(auction, address, 'eng');
                        }

                        container = $('#engOpe');
                    }
                    break;
                case 'Finilizing Phase':
                    if (auction['actualWinner'] == App.account) {
                        /** < Populate the card */
                        newCardFinilize(auction, auctionCard, engPhase[auction['phase']], 'eng');

                        if (auction['newPendingEvent'] == false) {
                            auction['newPendingEvent'] = true;
                            App.listenNewPending(auction, address, 'eng');
                        }

                        container = $('#engClo');
                    }
                    break;
                case  'Pending Phase':
                    if (auction['actualWinner'] == App.account) {
                        /** < Populate the card */
                        newCardPending(auction, auctionCard, actualBlock, 'eng');

                        if (auction['exePendingEvent'] == false) {
                            auction['exePendingEvent'] = true;
                            App.listenExePending(auction, address, 'eng');
                        }

                        container = $('#engClo');
                    }
                    break;
                default:
                    createAlertError("undefined phase!", auction['address'])
                    return;
            }
        }

        /** < If the container was not updated, don't show the auction */
        if (container != false) {

            let childrenRow = container.children('.row');
            let rowCount = childrenRow.size();

            if ((rowCount-1) % 2 == 0) {
                /** < Create a new Row */
                let row = document.createElement('div');
                row.setAttribute('class', 'row mt-2 engRow');
                container.append(row);

                row.append(newCol);
            }
            else
                childrenRow[(rowCount - 1)].append(newCol)

            if (rowCount == 1) {
                container.show();
            }

            if ($('.loaderEnglish').hasClass('loader')) {
                $('.loaderEnglishRow').hide();
                $('.loaderEnglish').removeClass('loader');
            }

            auctionCard.show();
        }
    },

    /**< Display information of a Vicrey Auction */
    displayVicAuction: function (auction, address, actualBlock) {
        /** < Different vicrey phase. */
        const vicPhase = [
            'Glory Phase',
            'Commitment Phase',
            'Withdrawal Phase',
            'Opening Phase',
            'Finilizing Phase',
            'Pending Phase'
        ]

        /** < Differentiate the auction with respect to the phase */
        var container = false;
        var phase = auction['phase'];
        var cardTemplate = $('.auctionTemplate');

        var nextPhase = 0;
        if (actualBlock == 0) {
            nextPhase = -1;
        } else {
            if ((actualBlock.sub(auction['blockCount'])).cmp(new BN(5)) >= 0) {
                nextPhase = 1;
            }
        }

        /** < Create a new card */
        var auctionCard = cardTemplate.clone();
        auctionCard.attr('id', address);
        auctionCard.removeClass('auctionTemplate');
        auctionCard.addClass('cardTemplate');
        auctionCard.find('.card-body').find('h5')
            .text(auction['title']);
        $('<br /><p><strong>Description: </strong>' + auction['description'] + '</p>')
            .insertAfter(auctionCard.find('.card-body').find('h5'));
        auctionCard.find('.card-body').find('h5')
            .append('<button class="btn btn-warning btn-sm float-right" '
                + 'onclick="App.updateEngInfo(\'' + address + '\'); return false;"'
                + '><i class="fa fa-refresh"></i></button>');

        /** < Create a related column */
        var newCol = document.createElement('div');
        newCol.setAttribute('class', 'col-xs-12 col-sm-12 col-md-6 col-lg-6 mb-2');

        auctionCard.appendTo(newCol);

        if (auction['seller'] == App.account) {
            /** < Populate the card */
            newCardOwnVic(auction, auctionCard, vicPhase[auction['phase']], nextPhase, actualBlock);

            /**< Subscribe to events */
            switch (vicPhase[auction['phase']]) {
                case 'Glory Phase':
                    if (auction['newPhaseEvent'] == false) {
                        auction['newPhaseEvent'] = true;
                        App.listenNewPhase(auction, address, 'vic');
                    }
                    break;
                case 'Commitment Phase':
                    if (auction['newPhaseEvent'] == false) {
                        auction['newPhaseEvent'] = true;
                        App.listenNewPhase(auction, address, 'vic');
                    }
                    break;
                case 'Withdrawal Phase':
                    if (auction['newPhaseEvent'] == false) {
                        auction['newPhaseEvent'] = true;
                        App.listenNewPhase(auction, address, 'vic');
                    }
                    break;
                case 'Opening Phase':
                    if (auction['newPhaseEvent'] == false) {
                        auction['newPhaseEvent'] = true;
                        App.listenNewPhase(auction, address, 'vic');
                    }
                    if (auction['newHighestEvent'] == false) {
                        auction['newHighestEvent'] = true;
                        App.listenHighest(auction, address, 'vic');
                    }
                    if (auction['secondHighestEvent'] == false) {
                        auction['secondHighestEvent'] = true;
                        App.listenSecondHisghestVic(auction, address);
                    }
                    break;
                case 'Finilizing Phase':
                    if (auction['newPendingEvent'] == false) {
                        auction['newPendingEvent'] = true;
                        App.listenNewPending(auction, address, 'vic');
                    }
                    if (auction['noBidEvent'] == false) {
                        auction['noBidEvent'] = true;
                        App.listenNoBidder(auction, address, 'vic');
                    }
                    break;
                case 'Pending Phase':
                    if (auction['exePendingEvent'] == false) {
                        auction['exePendingEvent'] = true;
                        App.listenExePending(auction, address, 'vic');
                    }
                    break;
                default:
                    break;
            }

            container = $('#vicOwn');
        }
        else {
            switch (vicPhase[phase]) {
                case 'Glory Phase':
                    /** < Populate the card */
                    newCardGloryVic(auction, auctionCard, nextPhase, actualBlock);

                    /**< Subscribe to events */
                    if (auction['newPhaseEvent'] == false) {
                        auction['newPhaseEvent'] = true;
                        App.listenNewPhase(auction, address, 'vic');
                    }

                    container = $('#vicOpe');
                    break;
                case 'Commitment Phase':
                    /** < Populate the card */
                    if (nextPhase == 1) {
                        if (auction['isIn']) {
                            newCardWithDrawVic(auction, auctionCard, vicPhase[auction['phase']], nextPhase, 'vic');

                            /**< Subscribe to events */
                            if (auction['newPhaseEvent'] == false) {
                                auction['newPhaseEvent'] = true;
                                App.listenNewPhase(auction, address, 'vic');
                            }

                            container = $('#vicOpe');
                        }
                    }
                    else {
                        newCardCommitVic(auction, auctionCard, nextPhase, actualBlock);

                        /**< Subscribe to events */
                        if (auction['newPhaseEvent'] == false) {
                            auction['newPhaseEvent'] = true;
                            App.listenNewPhase(auction, address, 'vic');
                        }

                        container = $('#vicOpe');
                    }
                    break;
                case 'Withdrawal Phase':
                    /** < Populate the card */
                    if (auction['isIn']) {
                        if (nextPhase == 1) {
                            newCardOpenVic(auction, auctionCard, vicPhase[auction['phase']], nextPhase, 'vic');

                            /**< Subscribe to events */
                            if (auction['newPhaseEvent'] == false) {
                                auction['newPhaseEvent'] = true;
                                App.listenNewPhase(auction, address, 'vic');
                            }
                            if (auction['newHighestEvent'] == false) {
                                auction['newHighestEvent'] = true;
                                App.listenHighest(auction, address, 'vic');
                            }
                            if (auction['secondHighestEvent'] == false) {
                                auction['secondHighestEvent'] = true;
                                App.listenSecondHisghestVic(auction, address);
                            }

                            container = $('#vicOpe');
                        }
                        else {
                            newCardWithDrawVic(auction, auctionCard, vicPhase[auction['phase']], nextPhase, 'vic');

                            /**< Subscribe to events */
                            if (auction['newPhaseEvent'] == false) {
                                auction['newPhaseEvent'] = true;
                                App.listenNewPhase(auction, address, 'vic');
                            }

                            container = $('#vicOpe');
                        }
                    }
                    break;
                case 'Opening Phase':
                    /** < Populate the card */
                    if (nextPhase == 1) {
                        if (auction['actualWinner'] == App.account) {
                            newCardFinilize(auction, auctionCard, vicPhase[auction['phase']], 'vic');

                            if (auction['newPendingEvent'] == false) {
                                auction['newPendingEvent'] = true;
                                App.listenNewPending(auction, address, 'vic');
                            }
                            if (auction['noBidEvent'] == false) {
                                auction['noBidEvent'] = true;
                                App.listenNoBidder(auction, address, 'vic');
                            }

                            container = $('#vicClo');
                        }
                    }
                    else { 
                        if (auction['isIn'] || auction['actualWinner'] == App.account) {
                            newCardOpenVic(auction, auctionCard, vicPhase[auction['phase']], nextPhase, 'vic');

                            /**< Subscribe to events */
                            if (auction['newPhaseEvent'] == false) {
                                auction['newPhaseEvent'] = true;
                                App.listenNewPhase(auction, address, 'vic');
                            }
                            if (auction['newHighestEvent'] == false) {
                                auction['newHighestEvent'] = true;
                                App.listenHighest(auction, address, 'vic');
                            }
                            if (auction['secondHighestEvent'] == false) {
                                auction['secondHighestEvent'] = true;
                                App.listenSecondHisghestVic(auction, address);
                            }

                            container = $('#vicOpe');
                        }
                    }
                    break;
                case 'Finilizing Phase':
                    if (auction['actualWinner'] == App.account) {
                        /** < Populate the card */
                        newCardFinilize(auction, auctionCard, vicPhase[auction['phase']], 'vic');

                        if (auction['newPendingEvent'] == false) {
                            auction['newPendingEvent'] = true;
                            App.listenNewPending(auction, address, 'vic');
                        }
                        if (auction['noBidEvent'] == false) {
                            auction['noBidEvent'] = true;
                            App.listenNoBidder(auction, address, 'vic');
                        }

                        container = $('#vicClo');
                    }
                    break;
                case 'Pending Phase':
                    if (auction['actualWinner'] == App.account) {
                        /** < Populate the card */
                        newCardPending(auction, auctionCard, actualBlock, 'vic');

                        if (auction['exePendingEvent'] == false) {
                            auction['exePendingEvent'] = true;
                            App.listenExePending(auction, address, 'vic');
                        }

                        container = $('#vicClo');
                    }
                    break;
                default:
                    createAlertError("undefined phase!", auction['address'])
                    return;
            }
        }

        /** < If the container was not updated, don't show the auction */
        if (container != false) {
            let childrenRow = container.children('.row');
            let rowCount = childrenRow.size();

            if ((rowCount - 1) % 2 == 0) {
                /** < Create a new Row */
                let row = document.createElement('div');
                row.setAttribute('class', 'row mt-2 vicRow');
                container.append(row);

                row.append(newCol);
            }
            else
                childrenRow[(rowCount - 1)].append(newCol)

            if (rowCount == 1) {
                container.show();
            }

            if ($('.loaderVicrey').hasClass('loader')) {
                $('.loaderVicreyRow').hide();
                $('.loaderVicrey').removeClass('loader');
            }

            auctionCard.show();
        }
    },

    updateEngInfo: function (address) {
        $('#' + address).closest('#engRow').remove();

        /** < Create a promise. */
        let auctionPromise = new Promise(async function (resolve) {
            App.engAuctions[address] = {};

            /** < Get the deployed contract at the specific address. */
            App.engAuctions[address]['instance'] = await App.contracts["EnglishAuction"].at(address);

            let auction = App.engAuctions[address]['instance'];

            /** < Retrive all the needed information. */
            App.engAuctions[address]['seller'] =        await auction.seller.call();
            App.engAuctions[address]['phase'] =         await auction.phase.call();
            App.engAuctions[address]['actualWinner'] =  await auction.actualWinner.call();
            App.engAuctions[address]['bidIncrement'] =  new BN(await auction.bidIncrement.call());
            App.engAuctions[address]['actualPrice'] =   new BN(await auction.actualPrice.call());
            App.engAuctions[address]['buyOutPrice'] =   new BN(await auction.buyOutPrice.call());
            App.engAuctions[address]['reservePrice'] =  new BN(await auction.reservePrice.call());
            App.engAuctions[address]['blockCount'] =    new BN(await auction.blockCount.call());

            /** < Iniitlize subscriptions. */
            App.engAuctions[address]['newPhaseEvent'] =     false;
            App.engAuctions[address]['buyOutEvent'] =       false;
            App.engAuctions[address]['newHighestEvent'] =   false;
            App.engAuctions[address]['newPendingEvent'] =   false;
            App.engAuctions[address]['noBidEvent'] =        false;
            App.engAuctions[address]['exePendingEvent'] =   false;

            /** < Retrive auction info from the mysql server. */
            $.get("http://localhost:5000/english/" + address, function (data, status) {
                if (data !== 'undefined' && data != 0) {
                    App.engAuctions[address]['title'] = data[0].title;
                    App.engAuctions[address]['description'] = data[0].description;
                }
                else {
                    App.engAuctions[address]['title'] = 'not defined';
                    App.engAuctions[address]['description'] = 'not defined';
                }
            });

            resolve(address);
        });

        /** < Execute the promise. */
        auctionPromise.then(function (address) {
            /** < Get the actual block number and show the auction on screen. */
            web3.eth.getBlockNumber(function (error, block) {
                if (!error)
                    App.displayEngAuction(App.engAuctions[address], address, new BN(block, 10));
                else
                    App.displayEngAuction(App.engAuctions[address], address, 0);
            });
        }).catch((error) => {
            createAlertError("Internal Error!", false);
            console.error(error);
        });
    },

    updateVicInfo: function (address) {
        $('#'+address).closest('#vicRow').remove();

        /** < Create a promise. */
        let auctionPromise = new Promise(async function (resolve, reject) {
            App.vicAuctions[address] = {};

            /** < Get the deployed contract at the specific address. */
            App.vicAuctions[address]['instance'] = await App.contracts["VicreyAuction"].at(address);

            let auction = App.vicAuctions[address]['instance'];

            /** < Retrive all the needed information. */
            App.vicAuctions[address]['seller'] = await auction.seller.call();
            App.vicAuctions[address]['phase'] = await auction.phase.call();
            App.vicAuctions[address]['actualWinner'] = await auction.actualWinner.call();
            App.vicAuctions[address]['highest'] = new BN(await auction.highestBid.call());
            App.vicAuctions[address]['actualPrice'] = new BN(await auction.actualPrice.call());
            App.vicAuctions[address]['deposit'] = new BN(await auction.deposit.call());
            App.vicAuctions[address]['reservePrice'] = new BN(await auction.reservePrice.call());
            App.vicAuctions[address]['isIn'] = await auction.bidHash.call(App.account);
            App.vicAuctions[address]['blockCount'] = new BN(await auction.blockCount.call());

            if (web3.utils.toBN(App.vicAuctions[address]['isIn']) == 0) {
                App.vicAuctions[address]['isIn'] = false;
            }
            else {
                App.vicAuctions[address]['isIn'] = true;
            }

            /** < Retrive auction info from the mysql server. */
            $.get("http://localhost:5000/vicrey/" + address, function (data, status) {
                if (data !== 'undefined' && data != 0) {
                    App.vicAuctions[address]['title'] = data[0].title;
                    App.vicAuctions[address]['description'] = data[0].description;
                }
                else {
                    App.vicAuctions[address]['title'] = 'not defined';
                    App.vicAuctions[address]['description'] = 'not defined';
                }
            });

            resolve(address);
        });

        /** < Execute the promise. */
        auctionPromise.then(function (address) {
            /** < Get the bactual block number and show the auction on screen. */
            web3.eth.getBlockNumber(function (error, block) {
                if (!error) {
                    App.displayVicAuction(App.vicAuctions[address], address, new BN(block, 10));
                }
                else
                    App.displayVicAuction(App.vicAuctions[address], address, 0);
            });
        }).catch((error) => {
            createAlertError("Internal Error!", false);
            console.error(error);
        });
    },

    /** < Next Phase transaction */
    nextPhase: function(address, type) {
        /** < Check the auction type */
        var contractInstance;
        var errorVal = 0;

        if (type == "eng") {
            /** < Check if the address auction exists */
            if (App.engAuctions[address] === 'undefined')
                errorVal++;
            else
                contractInstance = App.engAuctions[address]['instance'];
        }
        else if (type == "vic") {
            /** < Check if the address auction exists */
            if (App.vicAuctions[address] === 'undefined')
                errorVal++;
            else {
                contractInstance = App.vicAuctions[address]['instance'];
            }
        }
        else {
            errorVal++;
        }

        if (!errorVal) {
            /** < Temporally disable the next phase button */
            $('#' + address).find('button:last').prop('disabled', true);

            contractInstance.nextPhase(
                { from: App.account })
                .then(function (result) {
                    /** < Show success and dont enable the nextPhase button */
                    createAlertSuccess("You successfully change the Phase of the Auction!", address);
                }).catch(function (err) {
                    /** < Show error and enable the nextphase button */
                    createAlertError(err.message, address);
                    $('#' + address).find('button:last').prop('disabled', false);
                });
        }
        else {
            createAlertError("an internal error occurred!", address);
        }
    },

    /** < MAke a bid transaction */
    makeBid: function (address) {
        /** < Check if the address auction exists */
        if (App.engAuctions[address] === 'undefined') {
            createAlertError("an internal error occurred!", address);
        }
        else {
            /** < Temporally disable the makeBid button */
            $('#' + address).find('button:last').prop('disabled', true);

            /** < Retrive amount information */
            var amount = $('#' + address).find('.card-body')
                .find('.input-group').find('input').val();
            var measure = $('#' + address).find('.card-body')
                .find('.input-group').find('.input-group-append')
                .find('select option:selected').val();

            if (amount == '' || amount == null) {
                $('#' + address).find('button:last').prop('disabled', false);
                createAlertError("the input bid is empty!", address);
                return false;
            }


            /** < Convert if needed and check if it is a number*/
            if (measure == 'eth') {
                try {
                    amount = web3.utils.toWei(amount, 'ether');
                } catch (error) {
                    $('#' + address).find('button:last').prop('disabled', false);
                    createAlertError("the input bid must be a number!", address);
                    return false;
                }
            }
            else {
                try {
                    amount = web3.utils.toWei(amount, 'wei');
                } catch (error) {
                    $('#' + address).find('button:last').prop('disabled', false);
                    createAlertError("the input bid must be a number!", address);
                    return false;
                }
            }


            amount = new BN(amount, 10);
            var bidIncr = App.engAuctions[address]['bidIncrement'];
            var highest = App.engAuctions[address]['actualPrice'];
            var reserve = App.engAuctions[address]['reservePrice'];

            /** < Check the validity of the transaction */
            if (amount.cmp(reserve) < 0) {
                createAlertError("your bid must equal to "
                + "or greater than to the reserve price!", address);
            }
            else if (amount.cmp(highest) < 0) {
                createAlertError("your bid must be greater than the highest one!", address);
            }
            else if (amount.cmp(highest.add(bidIncr)) < 0) {
                createAlertError("your bid must be equal to or"
                + " greater than (highest one + min increment)!", address);
            }
            else {
                /** < Proceed with the transaction */
                App.engAuctions[address]['instance'].makeBid(
                    amount, 
                    { from: App.account, value: amount })
                    .then(function (result) {
                        console.log(JSON.stringify(result.logs))
                    /** < Show success and dont enable the makeBid button */
                    createAlertSuccess("You successfully make your bid!", address);
                }).catch(function (err) {
                    /** < Show error and enable the makeBid button */
                    createAlertError(err.message, address);
                    $('#' + address).find('button').prop('disabled', false);
                });
            }
        }
    },

    /** < Buy out the good transaction */
    buyOut: function(address) {
        /** < Check if the address auction exists */
        if (App.engAuctions[address] === 'undefined') {
            createAlertError("an internal error occurred!", address);
            $('#' + address).find('button:last').prop('disabled', false);
        }
        else {
            /** < Temporally disable the buyOut button */
            $('#' + address).find('button:last').prop('disabled', true);

            var amount = App.engAuctions[address]['buyOutPrice'];

            /** < Proceed with the transaction */
            App.engAuctions[address]['instance'].buyNow(
                amount, 
                { from: App.account, value: amount })
                .then(function (result) {
                /** < Show success and dont enable the buyOut button */
                createAlertSuccess("You successfully buy the good! Now your payement is pending!", address);
            }).catch(function (err) {
                /** < Show error and enable the buyOut button */
                createAlertError(err.message, address);
                $('#' + address).find('button:last').prop('disabled', false);
            });
        }
    },

    /** < Commit a bid transaction */
    commitBid: function (address) {
        /** < Check if the address auction exists */
        if (App.vicAuctions[address] === 'undefined') {
            createAlertError("an internal error occurred!", address);
        }
        else {
            /** < Temporally disable the commit button */
            $('#' + address).find('button:last').prop('disabled', true);

            /** < Retrive hash */
            var hash = $('#' + address).find('.card-body')
                .find('.input-group').find('input').val();

            var deposit = App.vicAuctions[address]['deposit'];

            /** < Warning the user about nonce  */
            createAlertWarning('You must remember the "nonce" because will be needed'
                + ' in the Opening Phase. Moreover make sure that you bid is equal'
                + ' to or greater than the deposit, otherwise you will receive assertion'
                + ' error in the opening phase');

            /** < Proceed with the transaction */
            App.vicAuctions[address]['instance'].commit(
                hash, 
                { from: App.account, value: deposit})
                .then(function (result) {
                /** < Show success and dont enable the commit button */
                createAlertSuccess("You successfully commit your bid!", address);
            }).catch(function (err) {
                /** < Show error and enable the commit button */
                createAlertError(err.message);
                $('#' + address).find('button:last').prop('disabled', false);
            });
        }
    },
    
    /** < Withdraw a bid transaction */
    withdrawBid: function (address) {
        /** < Check if the address auction exists */
        if (App.vicAuctions[address] === 'undefined') {
            createAlertError("an internal error occurred!", address);
        }
        else {
            /** < Temporally disable the withdraw button */
            $('#' + address).find('button:last').prop('disabled', true);

            /** < Warning the user about nonce  */
            createAlertWarning('You will lose half of deposit!');

            App.vicAuctions[address]['instance'].withdraw(
                { from: App.account })
                .then(function (result) {
                    /** < Show success and dont enable the withdraw button */
                    createAlertSuccess("You successfully withdraw your bid!", address);
                }).catch(function (err) {
                    /** < Show error and enable the withdraw button */
                    createAlertError(err.message);
                    $('#' + address).find('button:last').prop('disabled', false);
                });
        }
    },
    
    /** < Open a bid transaction */
    openBid: function (address) {
        /** < Check if the address auction exists */
        if (App.vicAuctions[address] === 'undefined') {
            createAlertError("an internal error occurred!", address);
        }
        else {
            /** < Temporally disable the commit button */
            $('#' + address).find('button:last').prop('disabled', true);

            /** < Retrive information inserted by the user */
            var nonce = $('#' + address).find('.card-body')
                .find('#nonceOpen').find('input').val();

            var bid = $('#' + address).find('.card-body')
                .find('#bidOpen').find('input').val();

            var measure = $('#' + address).find('.card-body')
                .find('#bidOpen').find('select option:selected').val();

            if (nonce == '' || nonce == null) {
                $('#' + address).find('button:last').prop('disabled', false);
                createAlertError("the input nonce is empty!", address);
                return false;
            }


            /** < Convert if needed and check if it is a number*/
            if (measure == 'eth') {
                try {
                    bid = web3.utils.toWei(bid, 'ether');
                } catch (error) {
                    $('#' + address).find('button').prop('disabled', false);
                    createAlertError("the input bid must be a number!", address);
                    return false;
                }
            }
            else {
                try {
                    bid = web3.utils.toWei(bid, 'wei');
                } catch (error) {
                    $('#' + address).find('button').prop('disabled', false);
                    createAlertError("the input bid must be a number!", address);
                    return false;
                }
            }
            
            App.vicAuctions[address]['instance'].openBid(
                nonce, 
                { from: App.account, value: bid })
                .then(function (result) {
                    /** < Show success and dont enable the openBid button */
                    createAlertSuccess("You successfully open your bid!", address);
                }).catch(function (err) {
                    console.log(err)
                    var txHash = err.transactionHash;
                    web3.eth.getTransactionReceipt(txHash, function (error, result) {
                        if (error==null)
                            console.log(result)
                        else
                            console.log(error)
                    });
                    web3.eth.getTransactionReceipt('0xb029c2a0872cf3602a2cc96ce37b283a2eeb43fef0d68cf658509da66835bd72')
                        .then(console.log);
                    
                    /** < Show error and enable the openBid button */
                    createAlertError(err.message);
                    $('#' + address).find('button').prop('disabled', false);
                });
        }
    },

    /** < Finilize auction transaction */
    finilizeAuction: function (address, type) {
        /** < Check the auction type */
        var contractInstance;
        var errorVal = 0;

        if (type == "eng") {
            /** < Check if the address auction exists */
            if (App.engAuctions[address] == 'undefined')
                errorVal++;
            else
                contractInstance = App.engAuctions[address]['instance'];            
        }
        else if (type == "vic") {
            /** < Check if the address auction exists */
            if (App.vicAuctions[address] == 'undefined')
                errorVal++;
            else
                contractInstance = App.vicAuctions[address]['instance'];
        }
        else {
            errorVal++;
        }

        if (!errorVal) {
            /** < Temporally disable the finilize button */
            $('#' + address).find('button:last').prop('disabled', true);

            /** < Proceed with the transaction */
            contractInstance.finalize(
                { from: App.account })
                .then(function (result) {
                    /** < Show success and dont enable the nextPhase button */
                    createAlertSuccess("You successfully finilize the Auction!", address);
                }).catch(function (error) {
                    /** < Show error and enable the nextphase button */
                    createAlertError(error.message, address);
                    $('#' + address).find('button:last').prop('disabled', false);
                });
        }
        else {
            createAlertError("Not a valid acution type or address!", address);
        }
    },

    /** < Extinguish pending payment transaction */
    extinguishAuction: function (address, type) {
        /** < Check the auction type */
        var contractInstance;
        var errorVal = 0;

        if (type == "eng") {
            /** < Check if the address auction exists */
            if (App.engAuctions[address] == 'undefined')
                errorVal++;
            else
                contractInstance = App.engAuctions[address]['instance'];        
        }
        else if (type == "vic") {
            /** < Check if the address auction exists */
            if (App.vicAuctions[address] == 'undefined')
                errorVal++;
            else
                contractInstance = App.vicAuctions[address]['instance'];            
        }
        else {
            errorVal++;
        }

        if (!errorVal) {
            /** < Temporally disable the finilize button */
            $('#' + address).find('button').prop('disabled', true);

            contractInstance.transferPending(
                { from: App.account })
                .then(function (result) {
                    /** < Show success and dont enable the nextPhase button */
                    createAlertSuccess("You successfully transfer the pending payment!");
                }).catch(function (err) {
                    /** < Show error and enable the nextphase button */
                    createAlertError(err.message);
                    $('#' + address).find('button').prop('disabled', false);
                });
        }
        else {
            createAlertError("Not a valid acution type or address!");
        }
    },

    /** < CreateAuction */
    createAuction: function () {
        /** < Get inputs */
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

        /** < Check if empty */
        if (type == '' || type == 0) {
            $('#errorSpanType').text("The Type is required!");
            $('#errorSpanTitle').text("");
            $('#errorSpanDescription').text("");
            $('#errorSpanBuyDep').text("");
            $('#errorSpanReserve').text("");
            $('#errorSpanIncrement').text("");
            return false;
        }

        /** < Check if empty */
        if (title == '' || title == null) {
            $('#errorSpanType').text("");
            $('#errorSpanTitle').text("The Title is required!");
            $('#errorSpanDescription').text("");
            $('#errorSpanBuyDep').text("");
            $('#errorSpanReserve').text("");
            $('#errorSpanIncrement').text("");
            return false;
        }

        /** < Check if empty */
        if (descr == '' || descr == null) {
            $('#errorSpanType').text("");
            $('#errorSpanTitle').text("");
            $('#errorSpanDescription').text("The Description is required!");
            $('#errorSpanBuyDep').text("");
            $('#errorSpanReserve').text("");
            $('#errorSpanIncrement').text("");
            return false;
        }

        /** < Check if empty */
        if (buyDep == '' || buyDep == null) {
            $('#errorSpanType').text("");
            $('#errorSpanTitle').text("");
            $('#errorSpanDescription').text("");
            $('#errorSpanBuyDep').text("The " + buyDepString + " is required!");
            $('#errorSpanReserve').text("");
            $('#errorSpanIncrement').text("");
            return false;
        } 

        /** < Check if empty */
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
            /** < Check if empty */
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

        /** < Convert if needed and check if it is a number*/
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

        /** < Convert if needed and check if it is a number*/
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
            /** < Convert if needed and check if it is a number*/
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
            /** < Temporally disable the finilize button */
            $('#createBtn').prop('disabled', true);
            if (type == 'eng') {
                manager.createEnglishAuction(buyDep, reserve, incr,
                    { from: App.account })
                    .then(function (result) {
                        /** < Show success and dont enable the nextPhase button */
                        createAlertSuccess("You successfully create an Auction!");

                        /** < Retrive auction info from the mysql server. */
                        $.post("http://localhost:5000/english/", {
                            address: result.logs[0].args[1],
                            title: title,
                            description: descr
                        }, 
                        function () {
                            createAlertSuccess("The info have been successfully sent to DB!");
                        })
                        .fail(function() {
                            createAlertError("DB connection error!");
                        });
                    }).catch(function (err) {
                        /** < Show error and enable the nextphase button */
                        createAlertError(err.message);
                        $('#createBtn').prop('disabled', false);
                    });
            }
            else {
                manager.createVicreyAuction(buyDep, reserve,
                    { from: App.account })
                    .then(function (result) {
                        /** < Show success and dont enable the nextPhase button */
                        createAlertSuccess("You successfully create an Auction!");
                        $.post("http://localhost:5000/vicrey/", {
                            address: result.logs[0].args[1],
                            title: title,
                            description: descr
                        },
                        function () {
                            createAlertSuccess("The info have been successfully sent to DB!");
                        })
                        .fail(function () {
                            createAlertError("DB connection error!");
                        });
                    }).catch(function (err) {
                        /** < Show error and enable the nextphase button */
                        createAlertError(err.message);
                        $('#createBtn').prop('disabled', false);
                    });
            }
        });
    },

};

$(function () {
    $(window).load(function () {
        App.init();
    });
});