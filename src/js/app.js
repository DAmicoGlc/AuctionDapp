App = {
    web3Provider: null,
    contracts: {},
    contractsABI: {},
    couldCreate: {},
    engAuctions: {},
    vicAuctions: {},
    subscribeCount: 0,
    actualBlock: 0,
    contractWeb3: {},
    network: null,
    managerAddress: '0x0',

    init: async function () {
        /** < Show the loading circle. > */
        $('.loaderEnglish').addClass('loader');
        $('.loaderEnglishRow').show();
        
        return await App.initWeb3();
    },

    initWeb3: async function () {
        if (typeof web3 != 'undefined') {
            /**< Check whether exists a provider, e.g Metamask > */
            App.web3Provider = window.ethereum;
            web3 = new Web3(App.web3Provider);
            try {
                ethereum.autoRefreshOnNetworkChange = false;
                /**< Reload the page when the account change > */
                window.ethereum.on('accountsChanged', function (accounts) {
                    location.reload();
                });
                /**< Enable popup > */
                ethereum.enable().then(async () => { console.log("DApp connected"); });
            }
            catch (error) { createAlertError("Internal error! "+error); }
        } else {
            /**< Otherwise, create a new local instance of Web3 > */
            App.web3Provider = new Web3.providers.HttpProvider(App.url);
            web3 = new Web3(App.web3Provider);
        }
        web3.eth.net.getNetworkType().then(function (network) {
            App.network = network;
            return App.initContract();
        });
    },

    /**< Initilize contract > */
    initContract: function () {
        /**< Load the Abstracts of the contracts > */
        $.getJSON("AuctionManager.json").then(function (interface) {
            App.contracts["AuctionManager"] = TruffleContract(interface);
            App.contracts["AuctionManager"].setProvider(App.web3Provider);
            App.contractsABI["AuctionManager"] = interface.abi;
        }).then(function () {
            $.getJSON("EnglishAuction.json").then(function (interface) {
                App.contracts["EnglishAuction"] = TruffleContract(interface);
                App.contracts["EnglishAuction"].setProvider(App.web3Provider);
                App.contractsABI["EnglishAuction"] = interface.abi;
            }).then(function () {
                $.getJSON("VicreyAuction.json").then(function (interface) {
                    App.contracts["VicreyAuction"] = TruffleContract(interface);
                    App.contracts["VicreyAuction"].setProvider(App.web3Provider);
                    App.contractsABI["VicreyAuction"] = interface.abi;
                    return App.initAccount();
                });
            });
        });
    },

    /**< Initilize account > */
    initAccount: function() {
        web3.eth.getCoinbase(function (err, account) {
            if (err === null) {
                try {
                    /** < Retrive and display account information > */
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

                    /** < Retrive information about contract auction manager > */
                    App.contracts["AuctionManager"].deployed().then(async function (manager) {
                        var manAdd =        await manager.managerOwner.call();
                        var couldCreate =   await manager.couldCreateAuction.call();
                        return [manager, manAdd, couldCreate];
                    }).then(function(managerInfo) {
                        App.managerAddress = managerInfo[1];
                        App.couldCreate = managerInfo[2];

                        /** < Check if the account used is the one of the manager > */
                        if (App.account == managerInfo[1]) {
                            $('#nav-managing-tab').remove();

                            $('#engOwn').find('h5').text("Suspended Auctions");
                            $('#engClo').find('h5').text("Pending Auctions");

                            $('#vicOwn').find('h5').text("Suspended Auctions");
                            $('#vicClo').find('h5').text("Pending Auctions");

                            $('#engOpe').hide();
                            $('#vicOpe').hide();

                            let creation =  "<ul class=\"list-group mb-5\"><li class=\"list-group-item "
                                + "\">Creation: <span class=\"badge ";

                            if (App.couldCreate == true) 
                                creation += 'badge-success badge-pill" id="creationBadge">ON</span>'
                                    + '<button type="button" class="btn btn-outline-danger btn-sm float-right"' 
                                    +' onclick="stopCreation(); return false;" id="creationBtn">Block Creation</button></li>';
                            else
                                creation += 'badge-danger badge-pill" id="creationBadge">OFF</span>'
                                    + '<button type="button" class="btn btn-outline-success btn-sm float-right"' 
                                    +' onclick="startCreation(); return false;" id="creationBtn">Start Creation</button></li>';

                            /** < Display information about the auctions > */
                            /** < and insert the button to manage the contract manager > */
                            $('#accountInfo').append(
                                creation + "<li class=\"list-group-item "
                                + "\">Active English Auctions: "
                                + "<span class=\"badge badge-info badge-pill\" id=\"englishCount\">"
                                + managerInfo[3]+"</span></li>"
                                + "<li class=\"list-group-item "
                                + "\">Active Vicrey Auctions: "
                                + "<span class=\"badge badge-info badge-pill\" id=\"vicreyCount\">...</span></li>"
                                + "<li class=\"list-group-item\">Destory the Auction Manager Contract, "
                                + "notice that to destroy it no auctions have to be active!"
                                + '<button type="button" class="btn btn-outline-danger btn-sm float-right"' 
                                + ' onclick="destroyManager(); return false;" id="destroyBtn">Destroy</button></li></ul>');

                            /**< Subscribe to new auction event > */
                            var subscription = web3.eth.subscribe('logs', {
                                address: App.contracts["AuctionManager"].address
                            }, function(error, result){
                                if (!error) {
                                    let msg;

                                    /**< Extract the event detail > */
                                    let eventDetail = web3.eth.abi.decodeLog(
                                        [{"name":"detail","type":"string"},
                                         {"name":"auction","type":"address"}],
                                        result.data, 
                                        result.topics.slice(1));

                                    /**< If the auction is english > */
                                    if (eventDetail[0] == "A new English Auction has been created!") {
                                        App.retriveEngManager();
                                    }
                                    /**< If the auction is vicrey > */
                                    else if (eventDetail[0] == "A new Vicrey Auction has been created!") {
                                        App.retriveVicUser();
                                    }

                                    createAlertWarning(eventDetail[0]); 
                                }
                            });

                            /** < Update the interface > */
                            return App.retriveEngManager();
                        }
                        else {
                            /** < Display information about the subscriptions > */
                            $('#accountInfo').append(
                                "<p>You can subscribe at most to 20 auctions simultaneously. " 
                                + "Notice that all subscription will be lost if you refresh "
                                + "the whole page!</p><p>Subscription: <span class=\"badge badge-info\""
                                + " id=\"eventListener\">0</span></p>");

                            let creation =  "<p>Creation: <span class=\"badge ";

                            /** < Display the creation status > */
                            if (App.couldCreate == true) 
                                creation += "badge-success badge-pill\" id=\"creationBadge\">ON</span></p>";
                            else {
                                creation += "badge-danger badge-pill\" id=\"creationBadge\">OFF</span></p>";
                                $('#createBtn').prop('disabled', true);
                            }

                            $('#createAuctionCol').append(creation);

                            /**< Subscribe to new auction event > */
                            var subscription = web3.eth.subscribe('logs', {
                                address: App.contracts["AuctionManager"].address
                            }, function(error, result){
                                if (!error) {
                                    let msg;

                                    /**< Extract the event detail > */
                                    let eventDetail = web3.eth.abi.decodeLog(
                                        [{"name":"detail","type":"string"},
                                         {"name":"auction","type":"address"}],
                                        result.data, 
                                        result.topics.slice(1));

                                    /**< If the auction is english > */
                                    if (eventDetail[0] == "A new English Auction has been created!") {
                                        App.updateEngUser(eventDetail[1]);
                                    }
                                    /**< If the auction is vicrey > */
                                    else if (eventDetail[0] == "A new Vicrey Auction has been created!") {
                                        App.updateVicUser(eventDetail[1]);
                                    }

                                    createAlertWarning(eventDetail[0]); 
                                }
                            });

                            /** < Update the interface > */
                            return App.retriveEngUser();
                        }
                    }).catch( function(error) {
                        /** < Update the interface > */
                        $('#colContent').empty();
                        $('#colContent').append(
                            "<p>The Auction Contract Manager provided does not exist!</p>");
                    });
                } catch (error) {
                    $('#userAddress').text("Uknown");
                    $('#userBalance').text("Uknown");
                    createAlertError("Please check the connection with MetaMask!");
                }
            }
            else {
                $('#userAddress').text("Uknown");
                $('#userBalance').text("Uknown");
                createAlertError("Please check the connection with MetaMask!");
            }
        });
    },

    /**< Call the right retrive english function discerning wrt the account > */
    retriveEngInfo: function() {
        if (App.account == App.managerAddress) 
            App.retriveEngManager();
        else
            App.retriveEngUser();
    },

    /**< Call the right retrive vicrey function discerning wrt the account > */
    retriveVicInfo: function() {
        if (App.account == App.managerAddress) 
            App.retriveVicManager();
        else
            App.retriveVicUser();
    },

    /**< Retrive English information for Manager > */
    retriveEngManager: function() {
        /** < Clear all previous auctions. > */
        $('.engRow').remove();
        $('#engOwn').hide();
        $('#engClo').hide();

        /** < Show the loading circle. > */
        $('.loaderEnglish').addClass('loader');
        $('.loaderEnglishRow').show();

        App.contracts["AuctionManager"].deployed().then(async function (manager) {
            App.couldCreate = await manager.couldCreateAuction.call();
            return manager.getEnglishAuctions();
        }).then(function (auctionList) {
            if (auctionList.length == 0) {
                $('#engNoAuction').show();

                /** < Hide the loading circle. > */
                $('.loaderEnglishRow').hide();
                $('.loaderEnglish').removeClass('loader');

                $('#englishCount').text(0);
            }
            else {
                $('#engNoAuction').hide();

                $('#englishCount').text(auctionList.length);

                /** < For each active auction. > */
                auctionList.forEach(function (address) {
                    /** < Create a promise. > */
                    let auctionPromise = new Promise(async function(resolve) {

                        if (!(address in App.engAuctions)) {
                            App.engAuctions[address] = {};
                        }

                        /** < Get the deployed contract at the specific address. > */
                        App.engAuctions[address]['instance'] =  await App.contracts["EnglishAuction"].at(address);

                        let auction = App.engAuctions[address]['instance'];

                        /** < Retrive all the needed information. > */
                        App.engAuctions[address]['phase'] =         await auction.phase.call();
                        App.engAuctions[address]['blockCount'] =    new BN(await auction.blockCount.call());
                        App.engAuctions[address]['seller'] =        await auction.seller.call();
                        App.engAuctions[address]['winner'] =        await auction.actualWinner.call();

                        /** < Iniitlize pending transaction information. > */
                        App.engAuctions[address]['pending']       = false;

                        /** < Retrive auction info from the mysql server. > */
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

                    /** < Execute the promise. > */
                    auctionPromise.then(function (address) {
                        /** < Get the bactual block number and show the auction on screen. > */
                        web3.eth.getBlockNumber(function (error, block) {
                            if (!error)
                                App.displayEngManager(App.engAuctions[address], address, new BN(block, 10));
                            else
                                App.displayEngManager(App.engAuctions[address], address, 0);
                        });
                    }).catch((error) => {
                        createAlertError("Internal Error!");
                    });
                });
            }
        }).catch((error) => {
            /** < Update the interface > */
            $('#colContent').empty();
            $('#colContent').append(
                "<p>The Auction Contract Manager provided does not exist!</p>");
        });
    },

    /**< Retrive English information for Manager > */
    retriveVicManager: function () {
        /** < Clear all previous auctions. > */
        $('.vicRow').remove();
        $('#vicOwn').hide();
        $('#vicClo').hide();

        /** < Show the loading circle. > */
        $('.loaderVicrey').addClass('loader');
        $('.loaderVicreyRow').show();

        App.contracts["AuctionManager"].deployed().then(async function (manager) {
            App.couldCreate = await manager.couldCreateAuction.call();
            return manager.getVicreyAuctions();
        }).then(function (auctionList) {
            if (auctionList.length == 0) {
                $('#vicNoAuction').show();

                /** < Show the loading circle. > */
                $('.loaderVicreyRow').hide();
                $('.loaderVicrey').removeClass('loader');

                $('#vicreyCount').text(0);
            }
            else {
                $('#vicNoAuction').hide();

                $('#vicreyCount').text(auctionList.length);

                /** < For each active auction. > */
                auctionList.forEach(function (address) {
                    /** < Create a promise. > */
                    let auctionPromise = new Promise(async function(resolve) {

                        if (!(address in App.vicAuctions)) {
                            App.vicAuctions[address] = {};
                        }

                        /** < Get the deployed contract at the specific address. > */
                        App.vicAuctions[address]['instance'] =  await App.contracts["VicreyAuction"].at(address);

                        let auction = App.vicAuctions[address]['instance'];

                        /** < Retrive all the needed information. > */
                        App.vicAuctions[address]['phase'] =         await auction.phase.call();
                        App.vicAuctions[address]['blockCount'] =    new BN(await auction.blockCount.call());
                        App.vicAuctions[address]['seller'] =        await auction.seller.call();
                        App.vicAuctions[address]['winner'] =        await auction.actualWinner.call();

                        /** < Iniitlize pending transaction information. > */
                        App.vicAuctions[address]['pending']       = false;

                        /** < Retrive auction info from the mysql server. > */
                        $.get("http://localhost:5000/vicrey/"+address, function (data, status) {
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

                    /** < Execute the promise. > */
                    auctionPromise.then(function (address) {
                        /** < Get the bactual block number and show the auction on screen. > */
                        web3.eth.getBlockNumber(function (error, block) {
                            if (!error)
                                App.displayVicManager(App.vicAuctions[address], address, new BN(block, 10));
                            else
                                App.displayVicManager(App.vicAuctions[address], address, 0);
                        });
                    }).catch((error) => {
                        createAlertError("Internal Error!");
                    });
                });
            }
        }).catch((error) => {
            /** < Update the interface > */
            $('#colContent').empty();
            $('#colContent').append(
                "<p>The Auction Contract Manager provided does not exist!</p>");
        });
    },

    /**< Display information of all English Auction > */
    displayEngManager: function (auction, address, actualBlock) {
        /** < Differen english phase. > */
        const engPhase = [
            'Glory Phase',
            'Submitting Phase',
            'Finilizing Phase',
            'Pending Phase'
        ]

        /** < Differentiate the auction with respect to the phase > */
        var container = false;
        var phase = auction['phase'];
        var cardTemplate = $('.auctionTemplate');

        /** < If the phase is blocked from 2 days > */
        var nextPhase = 0;
        if (actualBlock == 0) {
            nextPhase = -1;
        } else {
            if ((actualBlock.sub(auction['blockCount'])).cmp(new BN(576)) > 0) {
                nextPhase = 1;
            }
        }

        /** < Create a new card > */
        var auctionCard = cardTemplate.clone();
        auctionCard.attr('id', address);
        auctionCard.removeClass('auctionTemplate');
        auctionCard.addClass('cardTemplate');
        auctionCard.find('.card-body').find('h5')
            .text(auction['title']);
        $('<br /><p><strong>Description: </strong>' + auction['description'] + '</p>')
            .insertAfter(auctionCard.find('.card-body').find('h5'));

        /** < Create a related column > */
        var newCol = document.createElement('div');
        newCol.setAttribute('class', 'col-xs-12 col-sm-12 col-md-6 col-lg-6 mb-2');

        auctionCard.appendTo(newCol);

        /** < If it in pending phase always show it > */
        if (engPhase[phase] == "Pending Phase") {
            /** < Populate the card > */
            managerCardPending(auction, auctionCard,
                actualBlock.sub(auction['blockCount']), address, "eng");

            container = $('#engOwn');

        } else if (nextPhase == 1) {
            /** < If is suspended from 2 days show it > */
            /** < Populate the card > */
            managerCardSuspended(auction, auctionCard, engPhase[auction['phase']],
                actualBlock.sub(auction['blockCount']), address, "eng");

            container = $('#engClo');
        }

        /** < If the container was not updated, don't show the auction > */
        if (container != false) {

            let childrenRow = container.children('.row');
            let rowCount = childrenRow.size();

            if ((rowCount - 1) % 2 == 0) {
                /** < Create a new Row > */
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

    /**< Display information of all Vicrey Auction > */
    displayVicManager: function (auction, address, actualBlock) {
        /** < Differen vicrey phase. > */
        const vicPhase = [
            'Glory Phase',
            'Commitment Phase',
            'Withdrawal Phase',
            'Opening Phase',
            'Finilizing Phase',
            'Pending Phase'
        ]

        /** < Differentiate the auction with respect to the phase > */
        var container = false;
        var phase = auction['phase'];
        var cardTemplate = $('.auctionTemplate');

        /** < If the phase is blocked from 2 days > */
        var nextPhase = 0;
        if (actualBlock == 0) {
            nextPhase = -1;
        } else {
            if ((actualBlock.sub(auction['blockCount'])).cmp(new BN(576)) > 0) {
                nextPhase = 1;
            }
        }

        /** < Create a new card > */
        var auctionCard = cardTemplate.clone();
        auctionCard.attr('id', address);
        auctionCard.removeClass('auctionTemplate');
        auctionCard.addClass('cardTemplate');
        auctionCard.find('.card-body').find('h5')
            .text(auction['title']);
        $('<br /><p><strong>Description: </strong>' + auction['description'] + '</p>')
            .insertAfter(auctionCard.find('.card-body').find('h5'));

        /** < Create a related column > */
        var newCol = document.createElement('div');
        newCol.setAttribute('class', 'col-xs-12 col-sm-12 col-md-6 col-lg-6 mb-2');

        auctionCard.appendTo(newCol);

        /** < If in pending phase always show it > */
        if (vicPhase[phase] == "Pending Phase") {
            /** < Populate the card > */
            managerCardPending(auction, auctionCard,
                actualBlock.sub(auction['blockCount']), address, 'vic');

            container = $('#vicOwn');

        } else if (nextPhase == 1) {
            /** < If is suspended from 2 days show it > */

            /** < Populate the card > */
            managerCardSuspended(auction, auctionCard, vicPhase[auction['phase']],
                actualBlock.sub(auction['blockCount']), address, 'vic');

            container = $('#vicClo');
        }

        /** < If the container was not updated, don't show the auction > */
        if (container != false) {

            let childrenRow = container.children('.row');
            let rowCount = childrenRow.size();

            if ((rowCount - 1) % 2 == 0) {
                /** < Create a new Row > */
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

    /**< Retrive information of all English Auction > */
    retriveEngUser: function() {
        /** < Clear all previous auctions. > */
        $('.engRow').remove();
        $('#engOwn').hide();
        $('#engOpe').hide();
        $('#engClo').hide();

        /** < Show the loading circle. > */
        $('.loaderEnglish').addClass('loader');
        $('.loaderEnglishRow').show();
        
        App.contracts["AuctionManager"].deployed().then(async function (manager) {
            App.couldCreate = await manager.couldCreateAuction.call();
            return manager.getEnglishAuctions();
        }).then(function (auctionList) {
            if (auctionList.length == 0) {
                $('#engNoAuction').show();

                /** < Hide the loading circle. > */
                $('.loaderEnglishRow').hide();
                $('.loaderEnglish').removeClass('loader');
            }
            else {
                $('#engNoAuction').hide();
                /** < For each active auction. > */
                auctionList.forEach(function (address) {
                    /** < Create a promise. > */
                    let auctionPromise = new Promise(async function(resolve) {

                        if (!(address in App.engAuctions)) {
                            App.engAuctions[address] = {};
                        }

                        /** < Get the deployed contract at the specific address. > */
                        App.engAuctions[address]['instance'] =  await App.contracts["EnglishAuction"].at(address);

                        let auction = App.engAuctions[address]['instance'];

                        /** < Retrive all the needed information. > */
                        App.engAuctions[address]['seller'] =           await auction.seller.call();
                        App.engAuctions[address]['phase'] =            await auction.phase.call();
                        App.engAuctions[address]['actualWinner'] =     await auction.actualWinner.call();
                        App.engAuctions[address]['bidIncrement'] =     new BN(await auction.bidIncrement.call());
                        App.engAuctions[address]['actualPrice'] =      new BN(await auction.actualPrice.call());
                        App.engAuctions[address]['buyOutPrice'] =      new BN(await auction.buyOutPrice.call());
                        App.engAuctions[address]['reservePrice'] =     new BN(await auction.reservePrice.call());
                        App.engAuctions[address]['blockCount'] =       new BN(await auction.blockCount.call());

                        /** < Iniitlize pending transaction information. > */
                        App.engAuctions[address]['pending']       = false;

                        /** < Retrive auction info from the mysql server. > */
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

                    /** < Execute the promise. > */
                    auctionPromise.then(function (address) {
                        /** < Get the actual block number and show the auction on screen. > */
                        web3.eth.getBlockNumber(function (error, block) {
                            if (!error) 
                                App.displayEngUser(App.engAuctions[address], address, new BN(block, 10));
                            else
                                App.displayEngUser(App.engAuctions[address], address, 0);
                        });
                    }).catch( (error) => {
                        createAlertError("Internal Error, retry!");
                    });
                });
            }
        }).catch((error) => {
            /** < Update the interface > */
            $('#colContent').empty();
            $('#colContent').append(
                "<p>The Auction Contract Manager provided does not exist!</p>");
        });
    },
         
    /**< Retrive information of all Vicrey Auction > */
    retriveVicUser: function() {
        /** < Clear all previous auctions. > */
        $('.vicRow').remove();
        $('#vicOwn').hide();
        $('#vicOpe').hide();
        $('#vicClo').hide();

        /** < Show the loading circle. > */
        $('.loaderVicrey').addClass('loader');
        $('.loaderVicreyRow').show();

        App.contracts["AuctionManager"].deployed().then(async function (manager) {
            App.couldCreate = await manager.couldCreateAuction.call();
            return manager.getVicreyAuctions();
        }).then(function (auctionList) {
            if (auctionList.length == 0) {
                $('#vicNoAuction').show();

                /** < Show the loading circle. > */
                $('.loaderVicreyRow').hide();
                $('.loaderVicrey').removeClass('loader');
            }
            else {
                $('#vicNoAuction').hide();
                /** < For each active auction. > */
                auctionList.forEach(function (address) {
                    /** < Create a promise. > */
                    let auctionPromise = new Promise(async function (resolve, reject) {

                        if (!(address in App.vicAuctions)) {
                            App.vicAuctions[address] = {};
                        }

                        /** < Get the deployed contract at the specific address. > */
                        App.vicAuctions[address]['instance'] = await App.contracts["VicreyAuction"].at(address);

                        let auction = App.vicAuctions[address]['instance'];                    

                        /** < Retrive all the needed information. > */
                        App.vicAuctions[address]['seller'] =        await auction.seller.call();
                        App.vicAuctions[address]['phase'] =         await auction.phase.call();
                        App.vicAuctions[address]['actualWinner'] =  await auction.actualWinner.call();
                        App.vicAuctions[address]['highest'] =       new BN(await auction.highestBid.call());
                        App.vicAuctions[address]['actualPrice'] =   new BN(await auction.actualPrice.call());
                        App.vicAuctions[address]['deposit'] =       new BN(await auction.deposit.call());
                        App.vicAuctions[address]['reservePrice'] =  new BN(await auction.reservePrice.call());
                        App.vicAuctions[address]['isIn'] =          await auction.bidHash.call(App.account);
                        App.vicAuctions[address]['blockCount'] =    new BN(await auction.blockCount.call());

                        /** < Iniitlize pending transaction information. > */
                        App.vicAuctions[address]['pending']       = false;

                        if (web3.utils.toBN(App.vicAuctions[address]['isIn']) == 0) {
                            App.vicAuctions[address]['isIn'] = false;
                        }
                        else {
                            App.vicAuctions[address]['isIn'] = true;
                        }

                        /** < Retrive auction info from the mysql server. > */
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

                    /** < Execute the promise. > */
                    auctionPromise.then(function (address) {
                        /** < Get the bactual block number and show the auction on screen. > */
                        web3.eth.getBlockNumber(function (error, block) {
                            if (!error) {
                                App.displayVicUser(App.vicAuctions[address], address, new BN(block, 10));
                            }
                            else 
                                App.displayVicUser(App.vicAuctions[address], address, 0);
                        });
                    }).catch((error) => {
                        createAlertError("Internal Error, retry!");
                    });
                });
            }
        }).catch((error) => {
            /** < Update the interface > */
            $('#colContent').empty();
            $('#colContent').append(
                "<p>The Auction Contract Manager provided does not exist!</p>");
        });
    },

    /**< Display information of an English Auction > */
    displayEngUser: function (auction, address, actualBlock) {
        /** < Different english phase. > */
        const engPhase = [
            'Glory Phase',
            'Submitting Phase',
            'Finilizing Phase',
            'Pending Phase'
        ]

        /** < Differentiate the auction with respect to the phase > */
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

        /** < Create a new card > */
        var auctionCard = cardTemplate.clone();
        auctionCard.attr('id', address);
        auctionCard.removeClass('auctionTemplate');
        auctionCard.addClass('cardTemplate');
        auctionCard.find('.card-body').find('h5')
            .text(auction['title']);
        $('<br /><p><strong>Description: </strong>' + auction['description'] + '</p>')
            .insertAfter(auctionCard.find('.card-body').find('h5'));

        auctionCard.find('.card-body').find('h5')
            .append('<button class="btn btn-info btn-sm float-right" '
            + 'onclick="App.updateEngUser(\'' + address + '\'); return false;"'
            + ' id="update'+ address +'"><i class="fa fa-refresh"></i></button>');
        
        /** < Add subscribe and unsubscribe button > */
        if (auction['event'] == undefined) {
            auctionCard.find('.card-body').find('h5')
                .append('<button class="subBtn btn btn-warning btn-sm float-right" '
                + 'onclick="App.subscribeEvent(\'' + address + '\', \'eng\'); return false;"'
                + '><i class="fa fa-bell"></i></button>');

            
            auctionCard.find('.card-body').find('h5')
                .append('<button class="unsubBtn btn btn-warning btn-sm float-right" style="display: none;" '
                + 'onclick="App.unsubscribeEvent(\'' + address + '\', \'eng\'); return false;"'
                + '><i class="fa fa-bell-slash"></i></button>');
        }
        else {
            auctionCard.find('.card-body').find('h5')
                .append('<button class="subBtn btn btn-warning btn-sm float-right" style="display: none;" '
                + 'onclick="App.subscribeEvent(\'' + address + '\', \'eng\'); return false;"'
                + '><i class="fa fa-bell"></i></button>');

            
            auctionCard.find('.card-body').find('h5')
                .append('<button class="unsubBtn btn btn-warning btn-sm float-right"'
                + 'onclick="App.unsubscribeEvent(\'' + address + '\', \'eng\'); return false;"'
                + '><i class="fa fa-bell-slash"></i></button>');
        }

        /** < Create a related column > */
        var newCol = document.createElement('div');
        newCol.setAttribute('class', 'col-xs-12 col-sm-12 col-md-6 col-lg-6 mb-2');

        auctionCard.appendTo(newCol);

        if (auction['seller'] == App.account) {
            /** < Populate the card > */
            newCardOwnEng(auction, auctionCard, engPhase[auction['phase']], nextPhase, actualBlock);
            container = $('#engOwn');
        }
        else {
            switch (engPhase[phase]) {
                case 'Glory Phase':
                    /** < Populate the card > */
                    newCardGloryEng(auction, auctionCard, nextPhase, actualBlock);
                    container = $('#engOpe');
                    break;
                case 'Submitting Phase':
                    /** < Populate the card > */
                    if (nextPhase == 1) {
                        if (auction['actualWinner'] == App.account) {
                            newCardFinilize(auction, auctionCard, engPhase[auction['phase']], 'eng');
                            container = $('#engClo');
                        }
                    }
                    else {
                        newCardSubmitEng(auction, auctionCard, nextPhase, actualBlock);
                        container = $('#engOpe');
                    }
                    break;
                case 'Finilizing Phase':
                    if (auction['actualWinner'] == App.account) {
                        /** < Populate the card > */
                        newCardFinilize(auction, auctionCard, engPhase[auction['phase']], 'eng');
                        container = $('#engClo');
                    }
                    break;
                case  'Pending Phase':
                    if (auction['actualWinner'] == App.account) {
                        /** < Populate the card > */
                        newCardPending(auction, auctionCard, actualBlock, 'eng');
                        container = $('#engClo');
                    }
                    break;
                default:
                    createAlertError("undefined phase!")
                    return;
            }
        }

        /** < If the container was not updated, don't show the auction > */
        if (container != false) {

            let childrenRow = container.children('.row');
            let rowCount = childrenRow.size();

            if ((rowCount-1) % 2 == 0) {
                /** < Create a new Row > */
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

    /**< Display information of a Vicrey Auction > */
    displayVicUser: function (auction, address, actualBlock) {
        /** < Different vicrey phase. > */
        const vicPhase = [
            'Glory Phase',
            'Commitment Phase',
            'Withdrawal Phase',
            'Opening Phase',
            'Finilizing Phase',
            'Pending Phase'
        ]

        /** < Differentiate the auction with respect to the phase > */
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

        /** < Create a new card > */
        var auctionCard = cardTemplate.clone();
        auctionCard.attr('id', address);
        auctionCard.removeClass('auctionTemplate');
        auctionCard.addClass('cardTemplate');
        auctionCard.find('.card-body').find('h5')
            .text(auction['title']);
        $('<br /><p><strong>Description: </strong>' + auction['description'] + '</p>')
            .insertAfter(auctionCard.find('.card-body').find('h5'));
        auctionCard.find('.card-body').find('h5')
            .append('<button class="btn btn-info btn-sm float-right" '
            + 'onclick="App.updateVicUser(\'' + address + '\'); return false;"'
            + ' id="update'+ address +'"><i class="fa fa-refresh"></i></button>');

        /** < Add subscribe and unsubscribe button > */
        if (auction['event'] == undefined) {
            auctionCard.find('.card-body').find('h5')
                .append('<button class="subBtn btn btn-warning btn-sm float-right" '
                + 'onclick="App.subscribeEvent(\'' + address + '\', \'vic\'); return false;"'
                + '><i class="fa fa-bell"></i></button>');

            
            auctionCard.find('.card-body').find('h5')
                .append('<button class="unsubBtn btn btn-warning btn-sm float-right" style="display: none;" '
                + 'onclick="App.unsubscribeEvent(\'' + address + '\', \'vic\'); return false;"'
                + '><i class="fa fa-bell-slash"></i></button>');
        }
        else {
            auctionCard.find('.card-body').find('h5')
                .append('<button class="subBtn btn btn-warning btn-sm float-right" style="display: none;" '
                + 'onclick="App.subscribeEvent(\'' + address + '\', \'vic\'); return false;"'
                + '><i class="fa fa-bell"></i></button>');

            
            auctionCard.find('.card-body').find('h5')
                .append('<button class="unsubBtn btn btn-warning btn-sm float-right"'
                + 'onclick="App.unsubscribeEvent(\'' + address + '\', \'vic\'); return false;"'
                + '><i class="fa fa-bell-slash"></i></button>');
        }
        

        /** < Create a related column > */
        var newCol = document.createElement('div');
        newCol.setAttribute('class', 'col-xs-12 col-sm-12 col-md-6 col-lg-6 mb-2');

        auctionCard.appendTo(newCol);

        if (auction['seller'] == App.account) {
            /** < Populate the card > */
            newCardOwnVic(auction, auctionCard, vicPhase[auction['phase']], nextPhase, actualBlock);
            container = $('#vicOwn');
        }
        else {
            switch (vicPhase[phase]) {
                case 'Glory Phase':
                    /** < Populate the card > */
                    newCardGloryVic(auction, auctionCard, nextPhase, actualBlock);
                    container = $('#vicOpe');
                    break;
                case 'Commitment Phase':
                    /** < Populate the card > */
                    if (nextPhase == 1) {
                        if (auction['isIn']) {
                            newCardWithDrawVic(auction, auctionCard, vicPhase[auction['phase']], nextPhase, actualBlock);
                            container = $('#vicOpe');
                        }
                    }
                    else {
                        newCardCommitVic(auction, auctionCard, nextPhase, actualBlock);
                        container = $('#vicOpe');
                    }
                    break;
                case 'Withdrawal Phase':
                    /** < Populate the card > */
                    if (auction['isIn']) {
                        if (nextPhase == 1) {
                            newCardOpenVic(auction, auctionCard, vicPhase[auction['phase']], nextPhase, actualBlock);
                            container = $('#vicOpe');
                        }
                        else {
                            newCardWithDrawVic(auction, auctionCard, vicPhase[auction['phase']], nextPhase, actualBlock);
                            container = $('#vicOpe');
                        }
                    }
                    break;
                case 'Opening Phase':
                    /** < Populate the card > */
                    if (nextPhase == 1) {
                        if (auction['actualWinner'] == App.account) {
                            newCardFinilize(auction, auctionCard, vicPhase[auction['phase']], 'vic');
                            container = $('#vicClo');
                        }
                    }
                    else { 
                        if (auction['isIn'] || auction['actualWinner'] == App.account) {
                            newCardOpenVic(auction, auctionCard, vicPhase[auction['phase']], nextPhase, actualBlock);
                            container = $('#vicOpe');
                        }
                    }
                    break;
                case 'Finilizing Phase':
                    if (auction['actualWinner'] == App.account) {
                        /** < Populate the card > */
                        newCardFinilize(auction, auctionCard, vicPhase[auction['phase']], 'vic');
                        container = $('#vicClo');
                    }
                    break;
                case 'Pending Phase':
                    if (auction['actualWinner'] == App.account) {
                        /** < Populate the card > */
                        newCardPending(auction, auctionCard, actualBlock, 'vic');
                        container = $('#vicClo');
                    }
                    break;
                default:
                    createAlertError("undefined phase!")
                    return;
            }
        }

        /** < If the container was not updated, don't show the auction > */
        if (container != false) {
            let childrenRow = container.children('.row');
            let rowCount = childrenRow.size();

            if ((rowCount - 1) % 2 == 0) {
                /** < Create a new Row > */
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

    /**< Update the information of an English Auction > */
    updateEngUser: function (address) {

        /** < Remove auction information > */
        App.removeAuctionCard(address);

        /** < Create a promise. > */
        let auctionPromise = new Promise(async function (resolve) {

            App.engAuctions[address] = {};

            /** < Get the deployed contract at the specific address. > */
            App.engAuctions[address]['instance'] = await App.contracts["EnglishAuction"].at(address);

            let auction = App.engAuctions[address]['instance'];

            /** < Retrive all the needed information. > */
            App.engAuctions[address]['seller'] =        await auction.seller.call();
            App.engAuctions[address]['phase'] =         await auction.phase.call();
            App.engAuctions[address]['actualWinner'] =  await auction.actualWinner.call();
            App.engAuctions[address]['bidIncrement'] =  new BN(await auction.bidIncrement.call());
            App.engAuctions[address]['actualPrice'] =   new BN(await auction.actualPrice.call());
            App.engAuctions[address]['buyOutPrice'] =   new BN(await auction.buyOutPrice.call());
            App.engAuctions[address]['reservePrice'] =  new BN(await auction.reservePrice.call());
            App.engAuctions[address]['blockCount'] =    new BN(await auction.blockCount.call());

            /** < Iniitlize pending transaction information. > */
            App.engAuctions[address]['pending']       = false;

            /** < Retrive auction info from the mysql server. > */
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

        /** < Execute the promise. > */
        auctionPromise.then(function (address) {
            /** < Get the actual block number and show the auction on screen. > */
            web3.eth.getBlockNumber(function (error, block) {
                if (!error)
                    App.displayEngUser(App.engAuctions[address], address, new BN(block, 10));
                else
                    App.displayEngUser(App.engAuctions[address], address, 0);
            });
        }).catch((error) => {
            createAlertError("Internal Error, retry!");
        });
    },

    /**< Update the information of a Vicrey Auction > */
    updateVicUser: function (address) {
        
        /** < Remove auction information > */
        App.removeAuctionCard(address);

        /** < Create a promise. > */
        let auctionPromise = new Promise(async function (resolve, reject) {

            App.vicAuctions[address] = {};

            /** < Get the deployed contract at the specific address. > */
            App.vicAuctions[address]['instance'] = await App.contracts["VicreyAuction"].at(address);

            let auction = App.vicAuctions[address]['instance'];

            /** < Retrive all the needed information. > */
            App.vicAuctions[address]['seller'] = await auction.seller.call();
            App.vicAuctions[address]['phase'] = await auction.phase.call();
            App.vicAuctions[address]['actualWinner'] = await auction.actualWinner.call();
            App.vicAuctions[address]['highest'] = new BN(await auction.highestBid.call());
            App.vicAuctions[address]['actualPrice'] = new BN(await auction.actualPrice.call());
            App.vicAuctions[address]['deposit'] = new BN(await auction.deposit.call());
            App.vicAuctions[address]['reservePrice'] = new BN(await auction.reservePrice.call());
            App.vicAuctions[address]['isIn'] = await auction.bidHash.call(App.account);
            App.vicAuctions[address]['blockCount'] = new BN(await auction.blockCount.call());

            /** < Iniitlize pending transaction information. > */
            App.vicAuctions[address]['pending']       = false;

            if (web3.utils.toBN(App.vicAuctions[address]['isIn']) == 0) {
                App.vicAuctions[address]['isIn'] = false;
            }
            else {
                App.vicAuctions[address]['isIn'] = true;
            }

            /** < Retrive auction info from the mysql server. > */
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

        /** < Execute the promise. > */
        auctionPromise.then(function (address) {
            /** < Get the bactual block number and show the auction on screen. > */
            web3.eth.getBlockNumber(function (error, block) {
                if (!error) {
                    App.displayVicUser(App.vicAuctions[address], address, new BN(block, 10));
                }
                else
                    App.displayVicUser(App.vicAuctions[address], address, 0);
            });
        }).catch((error) => {
            createAlertError("Internal Error, retry!");
        });
    },

    /**< Activate event listener > */
    subscribeEvent: function (address, type) {
        var auction;
        if (type == 'eng') {
            auction = App.engAuctions[address];
        }
        else if (type == 'vic'){
            auction = App.vicAuctions[address];
        }

        if (App.subscribeCount >= 20) {
            createAlertDanger("You can subscribe at most to 20 auctions!");
        }
        else if(auction['event'] == undefined) {
            var contract = false;
            var badge = "";
            var nav = "";

            /**< Instanciate the contract > */
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
                /**< Subscribe to all events > */
                var subscription = web3.eth.subscribe('logs', {
                    address: address
                }, function(error, result){
                    if (!error) {
                        /**< Check if the nav is active or not > */
                        if (!$(nav).hasClass("active")) {
                            let count = $(badge).text();
                            if (count) {
                                $(badge).text("1");
                            }
                            else {
                                $(badge).text(parseInt(count)+1);
                            }
                        }

                        let msg;

                        /**< Extract the event detail > */
                        let eventDetail = web3.eth.abi.decodeLog(
                            [{"name":"detail","type":"string"}],
                            result.data, 
                            result.topics.slice(1))[0];

                        /**< If the auction is finilized > */
                        if (eventDetail == "Finilized. Pending Set" ||
                            eventDetail == "BuyOut. Pending Set") {
                            /**< Extract the winner > */
                            let winner = web3.eth.abi.decodeLog(
                                [{"name":"detail","type":"string"},{"name":"winner","type":"address"}],
                                result.data, 
                                result.topics.slice(1))[1];
                            if (winner == App.account) {
                                msg = 'The auction "' +  auction['title'] +
                                    '" has been finilized, you are the winner!';
                            }
                            else {
                                msg = 'The auction "' +  auction['title'] +
                                '" has been finilized!';
                                
                                /**< Unsubscribe > */
                                App.unsubscribeEvent(address);
                            }
                        }
                        /**< If the auction is finilized without any bidder > */
                        else if (eventDetail == "Finilized. No Bidder") {
                            if (auction['seller'] == App.account) {
                                msg = 'The auction "' +  auction['title'] +
                                '" has been finilized, no one makes a bid!';
                            }
                            else {
                                msg = 'The auction "' +  auction['title'] +
                                '" has been finilized!';

                                /**< Unsubscribe > */
                                App.unsubscribeEvent(address);
                            }
                        }
                        /**< If the pending payment has been extiguished > */
                        else if (eventDetail == "Pending extinguished") {
                            msg = 'The payment for the auction "' +  auction['title'] +
                                '" has been extiguished!';

                            /**< Unsubscribe > */
                            App.unsubscribeEvent(address);
                        }
                        else {
                            msg = eventDetail + ' in "' + auction['title'] + '" auction!';
                        }

                        createAlertWarning(msg);                       
                    }
                    else {
                        createAlertError("Internal error! "+error);
                    }
                });

                auction['event'] = subscription;

                /**< Update the subscription variable > */
                App.subscribeCount++;
                $('#eventListener').text(App.subscribeCount);

                /**< Change button > */
                $('#'+address).find('.subBtn').hide();
                $('#'+address).find('.unsubBtn').show();
            }
        }
    },

    /**< Unsubscribe from an event > */
    unsubscribeEvent: function (address, type) {

        var auction;
        if (type == 'eng') {
            auction = App.engAuctions[address];
        }
        else if (type == 'vic') {
            auction = App.vicAuctions[address];
        }
        /**< Unsubscribe >*/
        if (auction != undefined) {
            if (auction['event'] != undefined) {
                auction['event'].unsubscribe(function(error, success){
                    if(error)
                        createAlertError("Internal error! "+error);
                });

                /**< Update the subscription variable > */
                App.subscribeCount--;
                $('#eventListener').text(App.subscribeCount);

                /**< Change button > */
                $('#'+address).find('.unsubBtn').hide();
                $('#'+address).find('.subBtn').show();

                auction['event'] = undefined;
            }
        }
    },

    /** < Remove an auction card > */
    removeAuctionCard: function(address) {
        /** < Retrive the parent Row > */
        let parentRow = $('#' + address).parent().parent();
        /** < Remove the auction > */
        $('#' + address).parent().remove();

        /** < If the parent row has no children remove it. > */
        if (parentRow.children().length == 0) {
            /** < If the container has only the title children, hide it. > */
            if (parentRow.parent().children().length == 2) {
                parentRow.parent().hide();
            }

            parentRow.remove();
        }
    },

    /** < Remove an auction from the DB > */
    deleteRecord: function(address, type) {
        if (type == "eng") {
            /** < Delete the autions from the DB. > */
            $.ajax({
                type: "DELETE",
                url: "http://localhost:5000/english/"+address,
                success: (data) => {
                    createAlertSuccess(data.message);
                },
                error: (err) => {
                    createAlertDanger("DB error, contact the manager to delete the record from the DB!");
                }
            });
        }
        else {
            /** < Delete the autions from the DB. > */
            $.ajax({
                type: "DELETE",
                url: "http://localhost:5000/vicrey/"+address,
                success: (data) => {
                    createAlertSuccess(data.message);
                },
                error: (err) => {
                    createAlertDanger("DB error, contact the manager to delete the record from the DB!");
                }
            });
        }
    }
};

$(function () {
    $(window).load(function () {
        App.init();
    });
});