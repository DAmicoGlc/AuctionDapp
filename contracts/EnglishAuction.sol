pragma solidity 0.4.23;

import "./AuctionManager.sol";

contract EnglishAuction {

    // Different Phase of the auction
    enum Phase {
        GloryPhase,
        Submitting,
        Finilizing,
        Pending
    }
    // Global variable of the phase
    Phase public phase = Phase.GloryPhase;
    
    uint256 public buyOutPrice;     // price to sell the good before the auction
    uint256 public reservePrice;    // minimum price of good

    uint256 public bidIncrement;    // minimum incremente from the previous highest bid
    uint256 public actualPrice;     // acutal highest bid

    address public actualWinner;    // actual partecipant who sumbit the highest bid

    address public seller;          // seller of the good
    address public manager;         // manager address

    address public managerContract; // contract menager address

    uint256 public blockCount;     // block counter to update the phase

    event LogAuctionEnded(string detail, address winner, uint256 price);  // end of auction
    event LogNewHighest(string detail, uint256 price);                    // update of highest bid
    event LogNewPhase(string detail, Phase oldP, Phase newP);             // update of the phase
    event LogBuyOut(string detail);                        // the good has been sell before the auction
    event LogNoBidder(string detail);                      // if noone make a bid for the good before the end of the auction
    event LogLowBid(string detail, uint256 actPrice);      // if the bid is lower than the highest 
    event LogAddPending(string detail);
    event LogExePending(string detail, uint256 amount);

    // modifier to check if the function is called in the right phase
    modifier atPhase(Phase _phase) {
        require(_phase == phase,"Permission denied, operation out of the right phase! Check the actual phase");
        _;
    }
    
    // modifier to check if the amount specified in 
    // the input field is the effective one send to the contract
    modifier correctAmount(uint256 amount) {
        require(amount == msg.value, 
            "Provided input amount is different from value sent, try again!");
        _;
    }

    // modifier to change phase based on block mined
    modifier changePhase() {
        Phase oldP = phase;
        uint256 count = blockCount;

        if ( block.number >= count + 5 && oldP < Phase.Finilizing) {
            blockCount = block.number;
            phase = Phase(uint(oldP) + 1);
        
            emit LogNewPhase("Phase is changed", oldP, Phase(uint(oldP)+1));
        }
        _;
    }

    // modifier to avoid that the seller bid on its own auction
    modifier notSeller() {
        assert(msg.sender != seller);
        _;
    }

    // modifier to permit only to seller and manager to change phase
    modifier canChangePhase() {
        assert(msg.sender == seller || msg.sender == manager);
        _;
    }


    constructor (uint256 resPrice, uint256 buyOut, uint256 incr, address sellerAdd, address manAdd) public {
        buyOutPrice = buyOut;
        reservePrice = resPrice;
        actualPrice = resPrice;     // the actual price starts from the reserve one
        bidIncrement = incr;
        seller = sellerAdd;
        manager = manAdd;
        managerContract = msg.sender;
        blockCount = block.number;

        emit LogNewPhase("A new English auction is created", Phase.GloryPhase, Phase.GloryPhase);
    }

// Go forward to the next Phase, only seller or menager contract
// Emitting an event to inform all the partecipiant interested
    function nextPhase() public canChangePhase()  {
        Phase oldP = phase;
        uint256 count = blockCount;
        require(block.number >= count + 5,"5 blocks must be mined before you could change phase. Please try again later!");
        require(oldP < Phase.Finilizing,
            "Auction is already ended!");
        blockCount = block.number;
        phase = Phase(uint(oldP) + 1);
        emit LogNewPhase("Phase is changed", oldP, Phase(uint(oldP)+1));
    }

    // Sell the good before the auction start, emit the event to inform other intrested partecipiants
    function buyNow(uint256 amount) public payable changePhase() atPhase(Phase.GloryPhase) notSeller() correctAmount(amount) {
        uint256 boPrice = buyOutPrice;
        // Cannot be executed if the value send is not equal to the buyout price
        assert(msg.value == boPrice);

        emit LogBuyOut("The good has been sell for its bayout price! The auction will not starts!");
        emit LogAuctionEnded("The auction is ended!", msg.sender, boPrice);
        // avoid rientrance by set to zero actual price of the good
        blockCount = block.number;
        phase = Phase.Pending;

        actualWinner = msg.sender;
    
        emit LogAddPending("The pending transfer has been set!");
    }

    // Anyone could sumbit a bid, emit an event if the bid is too low, 
    // or if it is the new highest one 
    function makeBid(uint256 amount) public payable changePhase() atPhase(Phase.Submitting) 
                                        notSeller() correctAmount(amount) returns(bool) {
        address oldWinner = actualWinner;
        
        // Cannot be executed if the sender is the actual winner
        require(oldWinner != msg.sender, "You are the actual winner of the auction!");
        
        uint256 oldPrice = actualPrice;
        uint256 min;

        // If there is no winner the minimum is the reserve price (e.g. the actual at start)
        if (oldWinner == address(0)) {
            min = oldPrice;
        }
        else {
            min = oldPrice + bidIncrement;
        }

        // If the bid is too low, emit an event return
        if( msg.value < min ){
            emit LogLowBid("There is already an highest bid, try to increse yours!", msg.value);
            msg.sender.transfer(msg.value);
            return false;
        }

        // Update the highest bidder and the actual price
        actualPrice = msg.value;
        actualWinner = msg.sender;
        
        // If it is not the first bid, return the value of the highest bid to the oldWinner
        // the values of bot (address and parameter) are already updated
        if (oldWinner != address(0)) {
            oldWinner.transfer(oldPrice);
        }
        
        emit LogNewHighest("A new highest bid!", msg.value);

        blockCount = block.number;

        return true;
    }

    // End the auction by transfer the value of the highest bid to the seller
    function finalize() public changePhase() atPhase(Phase.Finilizing) canChangePhase() {
        address sellAddress = seller;
        address winner = actualWinner;

        // Can be executed only from the seller or 
        // the highest bidder or in some case from the manager
        assert(msg.sender == winner);

        emit LogAuctionEnded("The auction is ended!", winner, actualPrice);

        // Check if there is actually a valid bid for the good
        if (winner != 0) {
            Phase oldP = phase;
            
            blockCount = block.number;
            phase = Phase(uint(oldP) + 1);
        
            emit LogAddPending("The pending transfer has been set!");
        }
        else {
            emit LogNoBidder("Nobody makes a bid for the item, try to create another auction!");

            AuctionManager man = AuctionManager(manager);
            man.deleteEnglishAuction();

            // Distruct the contract
            seller = 0;
            selfdestruct(sellAddress);
        }
    }

    function transferPending() public atPhase(Phase.Pending) {
        address managerRef = manager;
        address sellerAdd = seller;

        require(msg.sender == actualWinner || (msg.sender == managerRef && block.number >= blockCount + 1440), 
                "Permission denied!");

        uint256 actPrice = actualPrice;

        actualPrice = 0;
        sellerAdd.transfer(actPrice);

        emit LogExePending("The pending transfer has been executed!", actPrice);

        AuctionManager man = AuctionManager(managerRef);
        man.deleteEnglishAuction();

        // Distruct the contract
        seller = 0;
        selfdestruct(sellerAdd);
    }
}
