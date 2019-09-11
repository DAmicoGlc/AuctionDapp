// solium-disable linebreak-style
pragma solidity ^0.5.0;

import "./AuctionManager.sol";

/**
* Smart contract to create and manage a Vcrey Auction.
* The auction could be in 6 different Phase:
* - Glory phase: no action could be done in this phase;
* - Commitment phase: anyone (excpet for seller and manager) can commit a bid,
*   the bidder must provide the sha3 of a nonce + the value of the bid and must
*   send the deposit to the contract;
* - Withdrawal phase: all bidder that commit a bid could withdraw their bid
*   losing half of their deposit sent in the commitment phase;
* - Opening phase: all bidder that don't whitdraw their bid have to open their
*   bid, sending the right value of the bid to the contract and passing the nonce
*   used in the sha3 function;
* - Finilizing phase: the auction is finished, the seller or the winner have to
*   confirm the end of it moving to the pending phase;
* - Pending phase: the winner has to perform the transfer of the value at which
*   the good has been sell (i.e. his bid).
*
* In some particular case, the manager of the auctions can change the phase or
* can interact with the contract to avoid ambiguous situation.
* The creation and the destruction of the auction will pass throught the contract manager.
*/
contract VicreyAuction {
    /**< Different auction phase >*/
    enum Phase {
        GloryPhase,
        Commitment,
        Withdrawal,
        Opening,
        Finilizing,
        Pending
    }

    /**< Phase global variable >*/
    Phase public phase = Phase.GloryPhase;

    /**< Deposit that each partecipant need to provide during the commitment phase >*/
    uint256 public deposit;
    /**< Amount of all deposit provided by all bidder >*/
    uint256 private totalDeposit;

    /**< Value of the actual highest bid >*/
    uint256 public highestBid;
    /**< Address of the atual winner >*/
    address payable public actualWinner;

    /**< Value of the second highest bid, the price at which the good will be sell >*/
    uint256 public actualPrice;
    /**< Minimum price for the good >*/
    uint256 public reservePrice;    // minimum price of good

    /**< Seller of the good >*/
    address payable public seller;
    /**< Manager address >*/
    address payable public manager;

    /**< Contract menager address >*/
    address public managerContract;

    /**< Block counter to update the phase >*/
    uint256 public blockCount;

    /**< Mapping to contain all the addresses of the different bidders and their hash >*/
    mapping (address => bytes32) public bidHash;

    /**
    * Event emitted when the phase changes.
    *
    * @param detail     explanation of the event;
    * @param oldP       old phase;
    * @param newP       new phase.
    */
    event LogNewPhase(string detail, Phase oldP, Phase newP);

    /**
    * Event emitted when a new highest bid has been opened.
    *
    * @param detail     explanation of the event;
    * @param price      value of the new highest bid.
    */
    event LogNewHighest(string detail, uint256 price);

    /**
    * Event emitted when a new second highest bid has been opened.
    *
    * @param detail     explanation of the event;
    * @param price      value of the new price.
    */
    event LogNewPrice(string detail, uint256 price);

    /**
    * Event emitted when the auction end.
    *
    * @param detail     explanation of the event, how the auction ended;
    * @param winner     address of the winner;
    * @param price      price of the good.
    */
    event LogEnd(string detail, address winner, uint256 price);

    /**
    * Event emitted when the pending trasfer has been extiguished.
    *
    * @param detail     explanation of the event;
    * @param amount     amount transfered.
    */
    event LogPending(string detail, uint256 amount);

    /**
    * Modifier to check if the function is called in the correct phase
    *
    * @param _phase  phase related to the function.
    */
    modifier atPhase(Phase _phase) {
        require(_phase == phase,
            "Permission denied, operation out of the correct phase! Check the actual phase");
        _;
    }

    /**
    * Modifier to change the phase based on block mined.
    */
    modifier changePhase() {
        Phase oldP = phase;
        uint256 count = blockCount;

        /** < Check if the phase change more than 5 block ago
            AND the phase is not the Finilizing one. >*/
        if ( (block.number >= count + 5) && (oldP < Phase.Finilizing)) {
            incrementPhase(oldP, block.number);
        }
        _;
    }

    /**
    * Modifier to avoid that the seller or the manager make a bid
    * OR buy out the good.
    */
    modifier canInteract() {
        assert(msg.sender != seller && msg.sender != manager);
        _;
    }

    /**
    * Modifier to permit only to seller and manager to change phase manually.
    */
    modifier canChangePhase() {
        assert(msg.sender == seller || msg.sender == manager);
        _;
    }

    /**
    * Contract constructor, it can be called from the contract manager
    * and it need the address of the seller and of the manager.
    *
    * @param resPrice       reserve price of the good;
    * @param depositValue   amount of deposit to provide in the commitment;
    * @param sellerAdd      address of the seller;
    * @param manAdd         address of the manager.
    */
    constructor (uint256 resPrice, uint256 depositValue, address payable sellerAdd, address payable manAdd) public {
        /** < Cannot be executed if the reserve price is zero >*/
        require(resPrice > 0,
            "The reserve price must be grater than zero!");
        reservePrice = resPrice;

        /** < the second higest start from the reserve price, while the highest one is zero >*/
        actualPrice = resPrice;

        deposit = depositValue;

        /**< Address of seller >*/
        seller = sellerAdd;
        /**< Address of manager >*/
        manager = manAdd;
        /**< Address of contract manager >*/
        managerContract = msg.sender;

        blockCount = block.number;

        emit LogNewPhase("New Vicrey auction",
            Phase.GloryPhase,
            Phase.GloryPhase);
    }

    /**
    * Manually go forward to the next Phase, only seller or manager can change it.
    * 5 block must be mined from the last phase change and the phase cannot be changed
    * if it is in Filizing or Pending.
    *
    * modifier canChangePhase(): check if the fuction has been called by the seller
    * OR the manager
    */
    function nextPhase() public canChangePhase()  {
        Phase oldP = phase;
        uint256 count = blockCount;

        /** < Check if the phase change more than 5 block ago
            AND the phase is not the Finilizing one. >*/
        if ( (block.number >= count + 5) && (oldP < Phase.Finilizing)) {
            incrementPhase(oldP, block.number);
        }
    }

    /**
    * Commit a new bid. Check if the address doesn't already commit a bid
    * and if the bidder is not the seller or the manager.
    *
    * @param hashValue sha3 of nonce + bid value.
    *
    * modifier changePhase(): check if the phase can change (i.e. 5 block have
    * been mined from last phase change).
    *
    * modifier atPhase(Phase.Commitment): check if the phase is the right one.
    *
    * modifier canInteract(): check if the caller of the function is not the seller
    * OR the manager.
    */
    function commit(bytes32 hashValue) public payable
         changePhase()
         atPhase(Phase.Commitment)
         canInteract() {

        require(bidHash[msg.sender] == 0 && msg.value == deposit,
            "You cannot commit 2 different bid. If you do not already commit a bid, make sure to send the deposit amount correctly!");

        bidHash[msg.sender] = hashValue;

        totalDeposit += msg.value;
    }

    /**
    * Withdraw a bid. Check if the sender commit a bid for the auction
    * send back half of the deposit to the sender.
    *
    * modifier changePhase(): check if the phase can change (i.e. 5 block have
    * been mined from last phase change).
    *
    * modifier atPhase(Phase.Withdrawal): check if the phase is the right one.
    */
    function withdraw() public
         changePhase()
         atPhase(Phase.Withdrawal) {

        require(bidHash[msg.sender] != 0,
            "You don't commit any bid!");

        uint256 halfDeposit = deposit/2;

        /** < Avoid the rientrance by delete the bidder from the auction >*/
        delete bidHash[msg.sender];

        totalDeposit -= halfDeposit;
        msg.sender.transfer(halfDeposit);
    }

    /**
    * Open a bid. Check if the sender commit a bid for the auction and
    * if the nonce + the bid value match the hash sent in the commitment
    * phase and if the value of the bid is grater than the reserve price.
    * Give back all the deposit to the sender if he provides the
    * right value of the nonce and the bid. If the bid is the highest one,
    * update the highest bid and update the price with the old highest bid.
    * If the bid is not the highest one, but it is grater than the actual price,
    * update the actual price.
    * Emit an event if the highest bid or the actual price are updated.
    *
    * @param nonce string used to produce the provided hash in the commitment phase.
    *
    * modifier changePhase(): check if the phase can change (i.e. 5 block have
    * been mined from last phase change).
    *
    * modifier atPhase(Phase.Opening): check if the phase is the right one.
    */
    function openBid(string memory nonce) public payable
         changePhase()
         atPhase(Phase.Opening) {

        require(bidHash[msg.sender] != 0,
            "You don't commit any bid!");

        uint256 resPrice = reservePrice;

        /** < The value must be grater than the reserve price otherwise you lose your deposit >*/
        require(msg.value >= resPrice,
            "Your bid is lower than the reserve price, you lose your deposit!");

        /** < Hash must match otherwise you lose your deposit >*/
        require(bidHash[msg.sender] == keccak256(abi.encodePacked(nonce, uint256(msg.value))),
            "No match, provide the correct nonce and bid or you will lose your deposit!");

        /** < Avoid the rientrance buy delete the bidder from the auction >*/
        delete bidHash[msg.sender];

        /** < Actual price >*/
        uint256 oldPrice = actualPrice;

        /** < Deposit amount >*/
        uint256 localDeposit = deposit;
        /** < Amount to refund, the msg.value will be subtracted in case the bid is the new highest >*/
        uint256 refund = localDeposit + msg.value;

        /** < If the bid is grater than the actual price >*/
        if ( msg.value > oldPrice ) {

            /** < Actual highest bid >*/
            uint256 oldHighest = highestBid;

            /** < If the bid is grater than the highest one >*/
            if (msg.value > oldHighest) {

                address payable oldWinner = actualWinner;

                /** < Update the highest bid information >*/
                highestBid = msg.value;
                actualWinner = msg.sender;

                /** < If it is not the first opened bid >*/
                if (oldWinner != address(0)) {
                    /** < Give back to the old highest bidder its bid >*/
                    oldWinner.transfer(oldHighest);

                    /** < Update the actual price with the old highest bid >*/
                    actualPrice = oldHighest;

                    emit LogNewPrice("New Second Highest", oldHighest);
                }
                /** < If it is the first bid >*/
                else {
                    /** < Update the actual price with the reserve price >*/
                    actualPrice = resPrice;

                    emit LogNewPrice("New Second Highest", resPrice);
                }

                /** < Don't refund the bid to the actual highest bidder >*/
                refund -= msg.value;

                emit LogNewHighest("New Highest!", msg.value);
            }
            /** < If the bid is not grater than the highest one >*/
            else {
                /** < Update only the actual price >*/
                actualPrice = msg.value;

                emit LogNewPrice("New Second Highest", msg.value);
            }
        }

        /** < Subtract the deposit refunded from the total >*/
        totalDeposit -= localDeposit;

        /** < Refund the deposit (and the bid if it is not the highest) to the sender >*/
        msg.sender.transfer(refund);
    }

    /**
    * Finilize the auction to confirm the end of it and the amount that
    * the winner have to pay for the good. The amount is freez in the contract
    * and the payment become pending.
    * Emit an event to declare the end of the auction.
    *
    * modifier changePhase(): check if the phase can change (i.e. 5 block have
    * been mined from last phase change).
    *
    * modifier atPhase(Phase.Finilizing): check if the phase is the right one.
    */
    function finalize() public
         changePhase()
         atPhase(Phase.Finilizing) {

        address payable sellAddress = seller;
        address winner = actualWinner;

        /**< Can be executed only from the seller OR the winner OR in some case from the manager >*/
        require(msg.sender == winner ||
            msg.sender == sellAddress ||
            (msg.sender == manager && block.number >= blockCount + 1440),
            "Permission denied!");

        /**< Check if there is actually a valid bid for the good >*/
        if (winner != address(0)) {
            Phase oldP = phase;

            blockCount = block.number;
            phase = Phase(uint(oldP) + 1);

            emit LogEnd("Finilized. Pending Set",
                winner, actualPrice);
        }
        else {
            emit LogEnd("Finilized. No Bidder",
                winner, actualPrice);

            /**< Send to the manager the deposit left in the contract >*/
            manager.transfer(totalDeposit);

            /**< Delete the auction from the contract manager >*/
            AuctionManager man = AuctionManager(managerContract);
            man.deleteVicreyAuction();

            /**< Destruct the contract >*/
            delete seller;
            selfdestruct(sellAddress);
        }
    }

    /**
    * Extinguish the payment freezed in the finilizing phase.
    * The winner have 1440 mined block to do it, otherwise the manager
    * can tranfer the pending amount to the seller, or give back the
    * amount to the winner (e.g. the seller don't send the good to the winner).
    * Emit an event to declare the end of pending payment.
    *
    * modifier atPhase(Phase.Pending): check if the phase is the right one.
    */
    function transferPending() public
         atPhase(Phase.Pending) {

        address payable winner = actualWinner;
        address payable sellerAdd = seller;

        require(msg.sender == winner ||
            (msg.sender == manager && block.number >= blockCount + 1440),
            "Permission denied!");

        uint256 price = actualPrice;

        /** < Avoid the rientrance by delete the actual winner address >*/
        delete actualWinner;
        /** < Give back to the highest bidder the difference between
        *   his bid and the second highest bid >*/
        winner.transfer(highestBid - price);

        /** < Avoid the rientrance by delete the seller address >*/
        delete seller;
        /** <  Pay the seller >*/
        sellerAdd.transfer(price);

        emit LogPending("Pending extinguished", price);

        /**< Send to the manager the deposit left in the contract >*/
        manager.transfer(totalDeposit);

        /**< Delete the auction from the contract manager >*/
        AuctionManager man = AuctionManager(managerContract);
        man.deleteVicreyAuction();

        /**< Destruct the contract >*/
        selfdestruct(sellerAdd);
    }

    /**
    * Change the phase.
    *
    * @param oldP      old phase;
    * @param actBlock  actual block.
    */
    function incrementPhase(Phase oldP, uint256 actBlock) private {
        blockCount = actBlock;
        phase = Phase(uint(oldP) + 1);

        emit LogNewPhase("Phase Change", oldP, phase);
    }
}