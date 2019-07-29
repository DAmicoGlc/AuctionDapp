/************************************************
 *  MANAGER auction Card and Button creation
 ***********************************************/

/** < Create a new card for the suspended auctions */
function managerCardSuspended(auction, card, phase, diff, address, type) {
    /** < Show the phase */
    card.find('.card-body').find('h6')
        .append(phase);

    /** < Show the actual winner address */
    card.find('.card-body').find('.list-group')
        .append('<li class="list-group-item">Actual Winner: <span class="badge badge-info float-right mt-1" '
            + 'id="badgeActualWinner" >' + auction['actualWinner'].slice(0, 6) + '...' 
            + auction['actualWinner'].slice(account.length - 6) 
            + ' </span></li><button class="btn btn-warning btn-sm float-right" '
            + 'onclick="var dummyContent = "'+ auction['actualWinner']+'"; \
            var dummy = $("<input>").val(dummyContent).appendTo("body").select(); \
            document.execCommand("copy");"><i class="fa fa-copy"></i></button>');

    /** < Show the actual winner address */
    card.find('.card-body').find('.list-group')
        .append('<li class="list-group-item">Seller: <span class="badge badge-info float-right mt-1" '
            + 'id="badgeActualWinner" >' + auction['seller'].slice(0, 6) + '...'
            + auction['seller'].slice(account.length - 6)
            + ' </span></li><button class="btn btn-warning btn-sm float-right" '
            + 'onclick="var dummyContent = "' + auction['seller'] + '"; \
            var dummy = $("<input>").val(dummyContent).appendTo("body").select(); \
            document.execCommand("copy");"><i class="fa fa-copy"></i></button>');

    if (auction['phase'] == 'Finilizing Phase')
        /** < Show the finilizig button */
        card.find('.card-body')
            .append('<button type="button" class="btn btn-outline-success mt-2 "'
            + ' onclick="App.finilizeManager(\'' + address + '\',\'' + type + '\')">Finilize</button>');
    else
        /** < Show the nextPhase button */
        card.find('.card-body')
            .append('<button type="button" class="btn btn-outline-primary mt-2"'
            + ' onclick="App.nextPhaseManager(\'' + address + '\',\'' + type + '\')"">Next Phase</button>');
    
    /** < Show suspending time */
    card.find('.card-footer').find('small')
        .text('Last phase change '+ diff.toString() + ' blocks ago!!');
}

/** < Create a new card for the specific Auction in the pending phase */
function managerCardPending(auction, card, diff, address, type) {
    /** < Show the phase */
    card.find('.card-body').find('h6')
        .append('Pending Phase');

    /** < Show the actual winner address */
    card.find('.card-body').find('.list-group')
        .append('<li class="list-group-item">Actual Winner: <span class="badge badge-info float-right mt-1" '
            + 'id="badgeActualWinner" >' + auction['actualWinner'].slice(0, 6) + '...'
            + auction['actualWinner'].slice(account.length - 6)
            + ' </span></li><button class="btn btn-warning btn-sm float-right" '
            + 'onclick="var dummyContent = "' + auction['actualWinner'] + '"; \
            var dummy = $("<input>").val(dummyContent).appendTo("body").select(); \
            document.execCommand("copy");"><i class="fa fa-copy"></i></button>');

    /** < Show the actual winner address */
    card.find('.card-body').find('.list-group')
        .append('<li class="list-group-item">Seller: <span class="badge badge-info float-right mt-1" '
            + 'id="badgeActualWinner" >' + auction['seller'].slice(0, 6) + '...'
            + auction['seller'].slice(account.length - 6)
            + ' </span></li><button class="btn btn-warning btn-sm float-right" '
            + 'onclick="var dummyContent = "' + auction['seller'] + '"; \
            var dummy = $("<input>").val(dummyContent).appendTo("body").select(); \
            document.execCommand("copy");"><i class="fa fa-copy"></i></button>');

    /** < Show the pending button */
    if (diff.cmp(new BN(1440)) > 0)
        card.find('.card-body')
            .append('<button type="button" class="btn btn-outline-warning mt-2"'
            + ' onclick="App.extinguishManager(\'' + address + '\',\'' + type + '\')">Extinguish</button>');
    else
        card.find('.card-body')
            .append('<button type="button" class="btn btn-outline-warning mt-2"'
            + ' onclick="App.extinguishManager(\'' + address + '\', \'' + type + '\'))" disabled>Extinguish</button>');


    card.find('.card-footer').find('small')
        .text('The auction was finilized '
            + diff.toString()
            + ' blocks ago! If it is grater than 1440 you could extiguish it!');
}

/************************************************
 *  VICREY auction Card creation
 ***********************************************/

/** < Create a new card for the specific Vicrey Auction owned by the user account */
function newCardOwnVic(auction, card, phase, nextPhase, actualBlock) {
    /** < Show the phase */
    card.find('.card-body').find('h6')
        .append(phase);

    /** < Show the actual price */
    if (auction['actualWinner'] != 0) {
        /** < Show the actual price */
        card.find('.card-body').find('.list-group')
            .append('<li class="list-group-item">Price: <span class="badge badge-info float-right mt-1">'
                + web3.utils.fromWei(auction['actualPrice'], 'ether') + ' ETH</span></li>');

        /** < Show the highest bid */
        card.find('.card-body').find('.list-group')
            .append('<li class="list-group-item">Highest: <span class="badge badge-info float-right mt-1">'
                + web3.utils.fromWei(auction['highestBid'], 'ether') + ' ETH</span></li>');
    }
    else {
        /** < Advertise if noone make a bid */
        card.find('.card-body').find('.list-group')
            .append('<li class="list-group-item">Price: <span class="badge badge-info float-right mt-1">No bid yet</span></li>');
    }
    
    /** < If the phase is opening or withdrawal or commitment or glory phase */
    if (auction['phase'] <= 3) {
        /** < Show next phase button and enable it if 5 block have been mined */
        if (nextPhase > 0) {
            nextPhaseButton(card, false, 'vic');
            card.find('.card-footer').find('small')
                .text('Last Phase change > 5 blocks ago! You CAN change it!');
        }
        else if (nextPhase == 0) {
            nextPhaseButton(card, true, 'vic');
            
            card.find('.card-footer').find('small')
                .text('Last Phase change ' + (actualBlock.sub(auction['blockCount'])).toString()
                    + ' blocks ago! You CANNOT change it!');
        }
        else {
            nextPhaseButton(card, false, 'vic');
            card.find('.card-footer').find('small')
                .text('Last Phase change is undefined! Pushing '
                    + 'the button could change the phase OR throw a transaction error!');
        }
    }
    /** < If the phase is finilizing */
    else if (auction['phase'] == 4) {
        /** < Show the Finilize buttton */
        finilizeButton(card, 'vic');

        if (auction['actualWinner'] == 0) {
            card.find('.card-footer').find('small')
                .text('You can finilize the auction! No one make a bid, the auction will be destroyed!');
        }
        else {
            card.find('.card-footer').find('small')
                .text('You can finilize the auction!');
        }
    }
    else if (nextPhase >= 0) {
        card.find('.card-footer').find('small')
            .text('You have to wait, the auction was finilized '
            + (actualBlock.sub(auction['blockCount'])).toString() 
            + ' blocks ago! If it is grater than 1440 alert the manager!');
    }
    else {
        card.find('.card-footer').find('small')
            .text('You have to wait, the auction has been finilized!'
            + ' The winner has to extinguish the pyament!');
    }
}

/** < Create a new card for the specific Vicrey Auction in the glory phase */
function newCardGloryVic(auction, card, nextPhase, actualBlock) {
    /** < Show the phase */
    card.find('.card-body').find('h6')
        .append('Glory Phase');

    /** < Show the reserve price */
    card.find('.card-body').find('.list-group')
        .append('<li class="list-group-item">Reserve: <span class="badge badge-info float-right mt-1">'
        + web3.utils.fromWei(auction['reservePrice'], 'ether') + ' ETH</span></li>');

    /** < Show the depost amount */
    card.find('.card-body').find('.list-group')
        .append('<li class="list-group-item">Deposit: <span class="badge badge-info float-right mt-1">'
        + web3.utils.fromWei(auction['deposit'], 'ether') + ' ETH</span></li>');

    /** < Show commit button if 5 block have been mined */
    if (nextPhase == 1) {
        /** < Advertise the user */
        card.find('.card-body').find('.list-group')
            .append('<li class="list-group-item">'
                + 'Committing a bid you will agree to send the deposit to the auction contract!</li>');
        commitButton(card);
        card.find('.card-footer').find('small')
            .text('Auction creation > 5 blocks ago! Committing a bid will change the phase!');
    }
    else if (nextPhase == 0) {
        card.find('.card-footer').find('small')
            .text('Auction creation '
            + (actualBlock.sub(auction['blockCount'])).toString()
            + ' blocks ago!');

    }
    else {
        card.find('.card-footer').find('small')
            .text('Last Phase change is undefined!');
    }
}

/** < Create a new card for the specific Vicrey Auction in the commit phase */
function newCardCommitVic(auction, card, nextPhase, actualBlock) {
    /** < Show the phase */
    card.find('.card-body').find('h6')
        .append('Commitment Phase');

    /** < Show the reserve price */
    card.find('.card-body').find('.list-group')
        .append('<li class="list-group-item">Reserve: <span class="badge badge-info float-right mt-1">'
            + web3.utils.fromWei(auction['reservePrice'], 'ether') + ' ETH</span></li>');

    /** < Show the depost amount */
    card.find('.card-body').find('.list-group')
        .append('<li class="list-group-item">Deposit: <span class="badge badge-info float-right mt-1">'
            + web3.utils.fromWei(auction['deposit'], 'ether') + ' ETH</span></li>');

    /** < If the user has already committed a bid */
    if (auction['isIn']) {
        /** < Advertise the user */
        card.find('.card-body').find('.list-group')
            .append('<li class="list-group-item">You already commit a bid!</li>');
    }
    else {
        /** < Advertise the user */
        card.find('.card-body').find('.list-group')
            .append('<li class="list-group-item">' 
            + 'To commit a bid you must send the deposit amount to the contract!</li>');
        /** < Show the commit button */
        commitButton(card);
    }
    if (nextPhase == 0) {
        card.find('.card-footer').find('small')
            .text('Last Phase change ' 
            + (actualBlock.sub(auction['blockCount'])).toString()
            + ' blocks ago!');
    }
    else {
        card.find('.card-footer').find('small')
            .text('Last Phase change is undefined!'
            + ' Committing a bid could commit your bid OR throw a transaction error!');
    }
}

/** < Create a new card for the specific Vicrey Auction in the withdraw phase */
function newCardWithDrawVic(auction, card, phase, nextPhase, actualBlock) {
    /** < Show the phase */
    card.find('.card-body').find('h6')
        .append(phase);

    /** < Show the reserve price */
    card.find('.card-body').find('.list-group')
        .append('<li class="list-group-item">Reserve: <span class="badge badge-info float-right mt-1">'
            + web3.utils.fromWei(auction['reservePrice'], 'ether') + ' ETH</span></li>');

    /** < Show the depost amount */
    card.find('.card-body').find('.list-group')
        .append('<li class="list-group-item">Deposit: <span class="badge badge-info float-right mt-1">'
            + web3.utils.fromWei(auction['deposit'], 'ether') + ' ETH</span></li>');

    /** < Advertise the user */
    card.find('.card-body').find('.list-group')
        .append('<li class="list-group-item">'
            + 'If you withdraw your bid, you will lose half of your deposit!</li>');

    /** < Show the withdraw button */
    withDrawButton(card);

    if (phase != 'Withdrawal Phase') {
        card.find('.card-footer').find('small')
            .text('Last Phase change > 5 blocks ago! Withdrawing will change the phase');
    }
    else if (nextPhase == 0) {
        card.find('.card-footer').find('small')
            .text('Last Phase change '
            + (actualBlock.sub(auction['blockCount'])).toString()
            + ' blocks ago!');
    }
    else {
        card.find('.card-footer').find('small')
            .text('Last Phase change is undefined! Withdrawing could withdraw you bid OR throw a transaction error!');
    }
}

/** < Create a new card for the specific Vicrey Auction in the commit phase */
function newCardOpenVic(auction, card, phase, nextPhase, actualBlock) {
    /** < Show the phase */
    card.find('.card-body').find('h6')
        .append(phase);

    /** < Show the reserve price */
    card.find('.card-body').find('.list-group')
        .append('<li class="list-group-item">Reserve: <span class="badge badge-info float-right mt-1">'
            + web3.utils.fromWei(auction['reservePrice'], 'ether') + ' ETH</span></li>');

    /** < Show the depost amount */
    card.find('.card-body').find('.list-group')
        .append('<li class="list-group-item">Deposit: <span class="badge badge-info float-right mt-1">'
            + web3.utils.fromWei(auction['deposit'], 'ether') + ' ETH</span></li>');
    /** < If the user has already committed a bid */
    if (auction['actualWinner'] == App.account) {
        /** < Advertise the user */
        card.find('.card-body').find('.list-group')
            .append('<li class="list-group-item">You are the actual winner!</li>');
    }
    else {
        /** < Advertise the user */
        card.find('.card-body').find('.list-group')
            .append('<li class="list-group-item">'
                + 'If you do not open your bid you will lose all your deposit!</li>');
        /** < Show the commit button */
        openBidButton(card);
    }

    if (phase != 'Opening Phase') {
        card.find('.card-footer').find('small')
            .text('Last Phase change > 5 blocks ago! Opening will change the phase');
    }
    else if (nextPhase == 0) {
        card.find('.card-footer').find('small')
            .text('Last Phase change '
                + (actualBlock.sub(auction['blockCount'])).toString()
                + ' blocks ago!');
    }
    else {
        card.find('.card-footer').find('small')
            .text('Last Phase change is undefined!');
    }
}

/************************************************
 *  ENGLISH auction Card creation
 ***********************************************/

/** < Create a new card for the specific English Auction owned by the user account */
function newCardOwnEng(auction, card, phase, nextPhase, actualBlock) {
    /** < Show the phase */
    card.find('.card-body').find('h6')
        .append(phase);

    /** < Show the actual price */
    if (auction['actualWinner'] != 0) {
        /** < Show the actual price */
        card.find('.card-body').find('.list-group')
            .append('<li class="list-group-item">Price: <span class="badge badge-info float-right mt-1">'
                + web3.utils.fromWei(auction['actualPrice'], 'ether') + ' ETH</span></li>');
    }
    else {
        /** < Advertise if noone make a bid */
        card.find('.card-body').find('.list-group')
            .append('<li class="list-group-item">Price: <span class="badge badge-info float-right mt-1">No bid yet</span></li>');
    }

    /** < If the phase is submitting ot glory phase */
    if (auction['phase'] <= 1) {
        /** < Show next phase button and enable it if 5 block have been mined */
        if (nextPhase > 0) {
            nextPhaseButton(card, false, 'eng');
            card.find('.card-footer').find('small')
                .text('Last Phase change > 5 blocks ago! You CAN change it!');
        }
        else if (nextPhase == 0) {
                nextPhaseButton(card, true, 'eng');
                
                card.find('.card-footer').find('small')
                    .text('Last Phase change ' + (actualBlock.sub(auction['blockCount'])).toString()
                    + ' blocks ago! You CANNOT change it!');
        }
        else {
            nextPhaseButton(card, false, 'eng');
            card.find('.card-footer').find('small')
                .text('Last Phase change is undefined! Pushing ' 
                + 'the button could change the phase OR throw a transaction error!');
        }
    }
    /** < If the phase is finilizing */
    else if (auction['phase'] == 2) {
        /** < Show the Finilize buttton */
        finilizeButton(card, 'eng');

        if (auction['actualWinner'] == 0) {
            card.find('.card-footer').find('small')
                .text('You can finilize the auction! No one make a bid, the auction will be destroyed!');
        }
        else {
            card.find('.card-footer').find('small')
                .text('You can finilize the auction!');
        }
    }
    else if (nextPhase >= 0) {
        card.find('.card-footer').find('small')
            .text('You have to wait, the auction was finilized '
            + (actualBlock.sub(auction['blockCount'])).toString() 
            + ' blocks ago! If it is grater than 1440 alert the manager!');
    }
    else {
        card.find('.card-footer').find('small')
            .text('You have to wait, the auction has been finilized!' 
            + ' The winner has to extinguish the pyament!');
    }
}

/** < Create a new card for the specific English Auction in the glory phase */
function newCardGloryEng(auction, card, nextPhase, actualBlock) {
    /** < Show the phase */
    card.find('.card-body').find('h6')
        .append('Glory Phase');

    /** < Show the reserve price */
    card.find('.card-body').find('.list-group')
        .append('<li class="list-group-item">Reserve: <span class="badge badge-info float-right mt-1">'
            + web3.utils.fromWei(auction['reservePrice'], 'ether') + ' ETH</span></li>');

    /** < Show makeBid button if 5 block have been mined */
    if (nextPhase == 1) {
        /** < Show the reserve price */
        card.find('.card-body').find('.list-group')
            .append('<li class="list-group-item">Increment: <span class="badge badge-info float-right mt-1">'
            + web3.utils.fromWei(auction['bidIncrement'], 'ether') + ' ETH</span></li>');
        
        makeBidButton(card);

        card.find('.card-footer').find('small')
            .text('Auction creation > 5 blocks ago! Making a bid will change the phase!');
    }
    else {
        /** < Show the buyout price */
        card.find('.card-body').find('.list-group')
            .append('<li class="list-group-item">Buy Out: <span class="badge badge-info float-right mt-1">'
                + web3.utils.fromWei(auction['buyOutPrice'], 'ether') + ' ETH</span></li>');

        buyoutButton(card);

        if (nextPhase == 0) {
            card.find('.card-footer').find('small')
                .text('Auction creation ' 
                + (actualBlock.sub(auction['blockCount'])).toString() 
                + ' blocks ago!');
        
        }
        else {
            card.find('.card-footer').find('small')
                .text('Last Phase change is undefined! Pushing '
                + 'the button could buyout the good OR throw a transaction error!');
        }
    }
}

/** < Create a new card for the specific English Auction in the submit phase */
function newCardSubmitEng(auction, card, nextPhase, actualBlock) {
    /** < Show the phase */
    card.find('.card-body').find('h6')
        .append('Submitting Phase');

    /** < Show the actual price */
    if (auction['actualWinner'] != 0) {
        /** < Show the actual price */
        card.find('.card-body').find('.list-group')
            .append('<li class="list-group-item">Price: <span class="badge badge-info float-right mt-1">'
                + web3.utils.fromWei(auction['actualPrice'], 'ether') + ' ETH</span></li>');
    }
    else {
        /** < Show the reserve price */
        card.find('.card-body').find('.list-group')
            .append('<li class="list-group-item">Reserve: <span class="badge badge-info float-right mt-1">'
                + web3.utils.fromWei(auction['reservePrice'], 'ether') + ' ETH</span></li>');
    }

    /** < If the user has made the actual highest bid */
    if (auction['actualWinner'] == App.account) {
        /** < Advertise the user */
        card.find('.card-body').find('.list-group')
            .append('<li class="list-group-item">You are the Actual Winner!</li>');
    }
    else {
        /** < Show the reserve price */
        card.find('.card-body').find('.list-group')
            .append('<li class="list-group-item">Increment: <span class="badge badge-info float-right mt-1">'
            + web3.utils.fromWei(auction['bidIncrement'], 'ether') + ' ETH</span></li>');
        /** < Show the makeBid button */
        makeBidButton(card);
    }

    if (nextPhase == 0) {
        card.find('.card-footer').find('small')
            .text('Last Phase change ' 
            + (actualBlock.sub(auction['blockCount'])).toString() 
            + ' blocks ago!');
    }
    else {
        card.find('.card-footer').find('small')
            .text('Last Phase change is undefined!'
            +' Submitting a bid could submit your bid OR it could throw a transaction error!');
    }
}

/************************************************
 *  Finilizing and Pending auction Card creation
 ***********************************************/

/** < Create a new card for the specific Auction in the finilize phase */
function newCardFinilize(auction, card, phase, type) {
    /** < Show the phase */
    card.find('.card-body').find('h6')
        .append(phase);

    /** < Show the actual price */
    card.find('.card-body').find('.list-group')
        .append('<li class="list-group-item">Price: <span class="badge badge-info float-right mt-1">'
            + web3.utils.fromWei(auction['actualPrice'], 'ether') + ' ETH</span></li>');

    /** < Show winner */
    card.find('.card-body').find('.list-group')
        .append('<li class="list-group-item">You win the auction, you can finilize it!</li>');

    /** < Show the finilize button */
    finilizeButton(card, type);

    if (phase != 'Finilizing Phase') {
        card.find('.card-footer').find('small')
            .text('Last Phase change > 5 blocks ago! Finilizing it will change the phase!');
    }
}

/** < Create a new card for the specific Auction in the pending phase */
function newCardPending(auction, card, actualBlock, type) {
    /** < Show the phase */
    card.find('.card-body').find('h6')
        .append('Pending Phase');

    /** < Show the actual price */
    card.find('.card-body').find('.list-group')
        .append('<li class="list-group-item">Price: <span class="badge badge-info float-right mt-1">'
            + web3.utils.fromWei(auction['actualPrice'], 'ether') + ' ETH</span></li>');

    /** < Show the pending button */
    pendingButton(card, type);

    card.find('.card-footer').find('small')
        .text('You can extinguish the payment! The auction was finilized '
        + (actualBlock.sub(auction['blockCount'])).toString()
        + ' blocks ago! If it is grater than 1440 the manager could extiguish it!');
}

/************************************************
 *  Buttons creation
 ***********************************************/

/** < Create next phase button and attach it to the card */
function nextPhaseButton(card, disabled, type) {
    card.find('.card-body')
        .append('<button type="button" class="btn btn-outline-primary mt-2"' 
        +' onclick="App.nextPhase($(this).closest(\'.cardTemplate\').attr(\'id\'), \''
        + type +'\'); return false;">Next Phase</button>');

    if (disabled)
        card.find('.card-body').find('button:last')
            .prop('disabled', true);
}

/** < Create finilize button and attach it to the card */
function finilizeButton(card, type) {
    card.find('.card-body')
        .append('<button type="button" class="btn btn-outline-success mt-2 "'
        + ' onclick="App.finilizeAuction($(this).closest(\'.cardTemplate\').attr(\'id\'), \''+type+'\'); return false;"'
        + ' >Finilize</button>');
}

/** < Create pending button and attach it to the card */
function pendingButton(card, type) {
    card.find('.card-body')
        .append('<button type="button" class="btn btn-outline-warning mt-2"' 
        + ' onclick="App.extinguishAuction($(this).closest(\'.cardTemplate\').attr(\'id\'), \'' + type + '\'); return false;"' 
        + '>Extinguish</button>');
}

/** < Create makeBid button and attach it to the card */
function makeBidButton(card) {
    card.find('.card-body')
        .append('<div class="input-group mb-3 mt-2"></div>');

    card.find('.card-body').find('.input-group')
        .append('<div class="input-group-prepend"></div>');
    card.find('.card-body').find('.input-group').find('.input-group-prepend')
        .append('<button type="button" class="btn btn-outline-primary"'
        + ' onclick="App.makeBid($(this).closest(\'.cardTemplate\').attr(\'id\')); return false;"'
        + ' >Bid</button>');

    card.find('.card-body').find('.input-group')
        .append('<input type="text" class="form-control" placeholder=""'
        + ' value="">');

    card.find('.card-body').find('.input-group')
        .append('<div class="input-group-append"></div>')
    card.find('.card-body').find('.input-group').find('.input-group-append')
        .append('<select class="custom-select" id="makeBidMeasure">'
        + '<option value="eth" selected>E</option>'
        + '<option value="wei">W</option></select>');

    card.find('.card-body')
        .append('<span class="text-muted text-center float-left">*E= ether, W= Wei</span>');
}

/** < Create buyOut button and attach it to the card */
function buyoutButton(card) {
    card.find('.card-body')
        .append('<div class="input-group mb-3 mt-2"></div>');

    card.find('.card-body').find('.input-group')
        .append('<div class="input-group-prepend"></div>');
    card.find('.card-body').find('.input-group').find('.input-group-prepend')
        .append('<button type="button" class="btn btn-outline-primary">Buy Now</button>');
}

/** < Create commit button and attach it to the card */
function commitButton(card) {
    card.find('.card-body')
        .append('<div class="input-group mb-3 mt-2"></div>');

    card.find('.card-body').find('.input-group')
        .append('<div class="input-group-prepend"></div>');
    card.find('.card-body').find('.input-group').find('.input-group-prepend')
        .append('<button type="button" class="btn btn-outline-primary"'
        + ' onclick="App.commitBid($(this).closest(\'.cardTemplate\').attr(\'id\')); return false;"'
        + '>Commit</button>');

    card.find('.card-body').find('.input-group')
        .append('<input type="text" class="form-control" placeholder="hash...">');
    card.find('.card-body').find('.input-group')
        .append('<span class="text-muted text-center">'
        + '*keccak256(nonce+bid), the bid expressed in wei!</span>');

    card.find('.card-body').find('.input-group')
        .append('<button type="button" class="btn btn-primary mt-2" data-toggle="modal" data-target="#sha3Modal">'
        +'Compute Keccak256</button>');
    card.find('.card-body').find('.input-group')
        .append('<span class="text-muted text-center">'
            + 'Compute the hash here!</span>');
}

/** < Create withDraw button and attach it to the card */
function withDrawButton(card) {
    card.find('.card-body')
        .append('<button type="button" class="btn btn-outline-danger mt-2"'
            + ' onclick="App.withdrawBid($(this).closest(\'.cardTemplate\').attr(\'id\')); return false;"'
            + '>Withdraw</button>');
}

/** < Create commit button and attach it to the card */
function openBidButton(card) {
    card.find('.card-body')
        .append('<div class="input-group mb-3 mt-2" id="nonceOpen"></div>');

    /** < Nonce input */ 
    card.find('.card-body').find('#nonceOpen')
        .append('<div class="input-group-prepend"></div>');

    card.find('.card-body').find('#nonceOpen').find('.input-group-prepend')
        .append('<span class="input-group-text">Nonce</span>');

    card.find('.card-body').find('#nonceOpen')
        .append('<input type="text" class="form-control" placeholder="Nonce">');

    /** < Bid amount input */
    card.find('.card-body')
        .append('<div class="input-group mb-3 mt-2" id="bidOpen"></div>');

    card.find('.card-body').find('#bidOpen')
        .append('<div class="input-group-prepend"></div>');

    card.find('.card-body').find('#bidOpen').find('.input-group-prepend')
        .append('<span class="input-group-text">Bid</span>');

    card.find('.card-body').find('#bidOpen')
        .append('<input type="text" class="form-control" placeholder="Amount">');
        
    card.find('.card-body').find('#bidOpen')
        .append('<div class="input-group-append"></div>');

    card.find('.card-body').find('#bidOpen').find('.input-group-append')
        .append('<select class="custom-select" id="openBidMeasure">'
            + '<option value="eth" selected>E</option>'
            + '<option value="wei">W</option></select>');

    /**< OpenBid Button */
    card.find('.card-body')
        .append('<button type="button" class="btn btn-outline-primary"'
            + ' onclick="App.openBid($(this).closest(\'.cardTemplate\').attr(\'id\')); return false;"'
            + '>Open</button>');
}

/************************************************
 *  Alert Creation
 ***********************************************/

/** < Create warning alert */
function createAlertWarning(text) {

    $.notify({
        title: '<strong>Warning: </strong>',
        message: text
    },{
            type: 'warning',
            animate: {
                enter: 'animated bounceInDown',
                exit: 'animated bounceOutUp'
            }
    });
}

/** < Create error alert */
function createAlertError(text) {
    $.notify({
        title: '<strong>Error: </strong>',
        message: text
    }, {
        type: 'danger',
        animate: {
            enter: 'animated bounceInDown',
            exit: 'animated bounceOutUp'
        }
    });
}

/** < Create success alert */
function createAlertSuccess(text) {
    $.notify({
        title: '<strong>Success: </strong>',
        message: text
    }, {
        type: 'success',
        animate: {
            enter: 'animated bounceInDown',
            exit: 'animated bounceOutUp'
        }
    });
}