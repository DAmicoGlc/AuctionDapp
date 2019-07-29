pragma solidity 0.4.23;

import "./AuctionManager.sol";

contract VicreyAuction {
    
    // Different Phase of the auction
    enum Phase {
        GloryPhase,
        Commitment,
        Withdrawal,
        Opening,
        Finilizing,
        Pending
    }
    // Global variable of the phase
    Phase public phase = Phase.GloryPhase;
    
    uint256 public deposit;     // deposit for each partecipiant
    // global variable to take into account all deposit values
    uint256 private totalDeposit;       
    
    uint256 public highestBid;             // acutal highest bid
    address public actualWinner;          // acutal highest bidder
    
    uint256 public actualPrice;          // acutal second highest bid
    uint256 public reservePrice;    // minimum price of good
    
    address public seller;          // seller of the good
    address public manager;         // manager address

    address public managerContract; // contract menager address

    uint256 public blockCount;     // block counter to update the phase
    
    // map to store all hash of committers
    mapping (address => bytes32) public bidHash;

    event LogAuctionEnded(string detail, address winner, uint256 price);      // end of auction
    event LogNewHighest(string detail, uint256 amount);                       // update of highest bid
    event LogNewSecondHighest(string detail, uint256 amount, address);                 // update of second highest bid
    event LogNewPhase(string detail, Phase oldP, Phase newP);                 // update of the phase
    event LogNoBidder(string detail);                          // if noone make a bid for the good before the end of the auction
    event LogAddPending(string detail);
    event LogExePending(string detail, uint256 amount);

    // modifier to check if the function is called in the right phase
    modifier atPhase(Phase _phase) {
        require(_phase == phase, 
        "Permission denied, operation out of the right phase! Check the actual phase");
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
    
    constructor (uint256 resPrice, uint256 depositValue, address sellerAdd, address manAdd) public {
        // Cannot be executed if the reserveprice is zero
        require(resPrice > 0, "The reserve price must be grater than zero!");
        reservePrice = resPrice;
        
        // the second higest start from the reserve price, while the highest one is zero
        actualPrice = resPrice;
        
        deposit = depositValue;

        seller = sellerAdd;
        manager = manAdd;
        managerContract = msg.sender;

        emit LogNewPhase("A new Vicrey auction is created", Phase.GloryPhase, Phase.GloryPhase);
    }
    
    // Go forward to the next Phase, only seller or menager contract
    // Emitting an event to inform all the partecipiant interested 
    function nextPhase() canChangePhase() public {
        Phase oldP = phase;
        uint256 count = blockCount;
        
        require(block.number >= count + 5, 
            "5 blocks must be mined before you could change phase. Please try again later!");
        require(oldP < Phase.Finilizing,
            "Auction is already ended!");
        
        blockCount = block.number;
        phase = Phase(uint(oldP) + 1);
        
        emit LogNewPhase("Phase is changed", oldP, Phase(uint(oldP)+1));
    }
    
    // Commit a new bid by providing the deposit and an hash of the bid
    function commit(bytes32 hashValue) public payable changePhase() atPhase(Phase.Commitment) {
        assert(msg.sender != seller);
        require(bidHash[msg.sender] == 0 && msg.value == deposit, 
                "If you do not already commit a bid, make sure too send the deposit amount correctly!");
        
        bidHash[msg.sender] = hashValue;
        
        totalDeposit += msg.value;
    }
    
    // Withdraw a bid and get back half of the deposit
    function withdraw() public changePhase() atPhase(Phase.Withdrawal) {
        require(bidHash[msg.sender] != 0);
        
        uint256 halfDeposit = deposit/2;
        
        // avoid the rientrance by delete the bidder from the auction
        bidHash[msg.sender] = 0;
        
        totalDeposit -= halfDeposit;
        msg.sender.transfer(halfDeposit);
    }
    
    // Open the bid by providing the value of the bid and the nonce
    function openBid(string nonce) public payable changePhase() atPhase(Phase.Opening) {
        require(bidHash[msg.sender] != 0, "You are not in the auction!");
        
        uint256 resPrice = reservePrice;
        
        // The value must be grater than the reserve price otherwise you lose your deposit
        require(msg.value >= resPrice, "Your bid is lower than the reserve price, you lose your deposit!");
        // Hash must match otherwise you lose your deposit
        require(bidHash[msg.sender] == keccak256(nonce, uint256(msg.value)), "No match, provide the correct values or you lose your deposit!");
        
        uint256 actualHighest = highestBid;

        uint256 localDeposit = deposit;
        uint256 refund = localDeposit;
        
        // avoid the rientrance buy delete the bidder from the auction
        bidHash[msg.sender] = 0;
        
        if ( msg.value <= actualHighest ) {
            refund += msg.value;

            // If the bid is not the highest but it is grater than the second highest
            // update the second highest
            if (actualPrice < msg.value) {
                actualPrice = msg.value;
                
                emit LogNewSecondHighest("The second highest bid has been updated!", msg.value, actualWinner);
            }
        }
        else {
            address oldWinner = actualWinner;
            
            // Update the highest bid and bidder
            highestBid = msg.value;
            actualWinner = msg.sender;

            // Update the second highest bid and bidder
            if (oldWinner != address(0)) {
                actualPrice = actualHighest;

                // Give back to the old second his bid amount
                oldWinner.transfer(actualHighest);
            }
            else {
                actualPrice = resPrice;
            }
            
            emit LogNewHighest("A new highest bid!", msg.value);
            emit LogNewSecondHighest("The second highest bid has been updated!", actualPrice, actualWinner);
        }

        totalDeposit -= localDeposit;
        
        // Anyway give back to the bidder his deposit
        msg.sender.transfer(refund);
    }
    
    // End the auction by transfer the value of the highest bid to the seller
    function finalize() public changePhase() atPhase(Phase.Finilizing) canChangePhase() {
        address sellAddress = seller;
        address winner = actualWinner;

        // Can be executed only from the seller or 
        // the highest bidder or in some case from the manager
        assert(msg.sender == actualWinner);

        
        emit LogAuctionEnded("The auction is ended!", winner, actualPrice);
        
        // Check if there is actually a valid bid for the good
        if (winner != address(0)) {
            Phase oldP = phase;
            // avoid rientrance by set to zero actual price of the good
            blockCount = block.number;
            phase = Phase(uint(oldP) + 1);

            emit LogAddPending("The pending transfer has been set!");
        }
        else {
            emit LogAuctionEnded("The auction is ended!", winner, 0);
        
            // Send deposit to manager contract all deposit eventually accumulated
            managerContract.transfer(totalDeposit);

            // Distruct the contract
            seller = 0;
            selfdestruct(sellAddress);
        }        
    }

    function transferPending() public atPhase(Phase.Pending) {
        address winner = actualWinner;
        address managerRef = managerContract;
        address sellerAdd = seller;

        require(msg.sender == winner 
                || (msg.sender == manager && block.number >= blockCount + 1440), 
                "Permission Denied!");

        uint256 price = actualPrice;
        uint256 winnerAmount = highestBid;
        uint256 refund;
        
        refund = winnerAmount - price;
        actualWinner = 0;
        // Give back to the highest bidder the difference between
        // his bid and the second highest bid
        winner.transfer(refund);
        
        seller = 0;
        // Pay the seller
        sellerAdd.transfer(price);
        
        emit LogExePending("The pending transfer has been executed!", price);

        AuctionManager man = AuctionManager(managerRef);
        man.deleteVicreyAuction();

        // Send deposit to manager contract all deposit eventually accumulated
        managerContract.transfer(totalDeposit);

        // Distruct the contract
        selfdestruct(sellerAdd);
    }

    
}