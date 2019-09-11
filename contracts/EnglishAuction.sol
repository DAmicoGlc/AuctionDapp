// solium-disable linebreak-style
pragma solidity ^0.5.0;

import "./AuctionManager.sol";

/**
* Smart contract to create and manage an English Auction.
* The auction could be in 4 different Phase:
* - Glory phase: the good could be bought at its buyout price and
*   the auction will not start;
* - Submitting phase: anyone (excpet for seller and manager) can submit a bid,
*   the bid must be grater than the actual one + the min increment;
* - Finilizing phase: the auction is finished, the seller or the winner have to
*   confirm the end of it moving to the pending phase;
* - Pending phase: the winner has to perform the transfer of the value at which
*   the good has been sell (i.e. his bid).
*
* In some particular case, the manager of the auctions can change the phase or
* can interact with the contract to avoid ambiguous situation.
* The creation and the destruction of the auction will pass throught the contract manager.
*/
contract EnglishAuction {

    /**< Different auction phase >*/
    enum Phase {
        GloryPhase,
        Submitting,
        Finilizing,
        Pending
    }

    /**< Phase global variable >*/
    Phase public phase = Phase.GloryPhase;

    /**< Price to sell the good before the auction >*/
    uint256 public buyOutPrice;
    /**< Minimum price of the good >*/
    uint256 public reservePrice;

    /**< Minimum increment for each bid >*/
    uint256 public bidIncrement;
    /**< Acutal highest bid >*/
    uint256 public actualPrice;

    /**< Partecipant who sumbit the highest bid >*/
    address payable public actualWinner;

    /**< Seller of the good >*/
    address payable public seller;
    /**< Manager address >*/
    address public manager;

    /**< Contract menager address >*/
    address public managerContract;

    /**< Block counter to update the phase >*/
    uint256 public blockCount;

    /**
    * Event emitted when the phase changes.
    *
    * @param detail     explanation of the event;
    * @param oldP       old phase;
    * @param newP       new phase.
    */
    event LogNewPhase(string detail, Phase oldP, Phase newP);

    /**
    * Event emitted when a new highest bid has been submitted.
    *
    * @param detail     explanation of the event;
    * @param price      value of the new highest bid.
    */
    event LogNewHighest(string detail, uint256 price);

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
    * Modifier to check if the amount specified in the input
    * field is the effective one send to the contract
    *
    * @param amount  amount inserted in the input field.
    */
    modifier correctAmount(uint256 amount) {
        require(amount == msg.value,
            "Provided input amount is different from value sent, try again!");
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
    * @param resPrice   reserve price of the good;
    * @param buyOut     buy out price of the good;
    * @param incr       minimum increment from the previous bid;
    * @param sellerAdd  address of the seller;
    * @param manAdd     address of the manager.
    */
    constructor (uint256 resPrice, uint256 buyOut, uint256 incr, address payable sellerAdd, address manAdd) public {
        buyOutPrice = buyOut;
        reservePrice = resPrice;
        /**< The actual price starts from the reserve one >*/
        actualPrice = resPrice;
        bidIncrement = incr;

        /**< Address of seller >*/
        seller = sellerAdd;
        /**< Address of manager >*/
        manager = manAdd;
        /**< Address of contract manager >*/
        managerContract = msg.sender;

        blockCount = block.number;

        emit LogNewPhase("New English auction",
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
    * Sell the good before the auction start, emit the event to inform
    * other intrested partecipiants. Then go to the pending phase.
    *
    * @param amount  value transfered to the contract.
    *
    * modifier changePhase(): check if the phase can change (i.e. 5 block have
    * been mined from last phase change).
    *
    * modifier atPhase(Phase.GloryPhase): check if the phase is the right one.
    *
    * modifier canInteract(): check if the caller of the function is not the seller
    * OR the manager.
    *
    * modifier correctAmount(amount): check if the value sent is equal to the amount
    * in th einput field.
    */
    function buyNow(uint256 amount) public payable
         changePhase()
         atPhase(Phase.GloryPhase)
         canInteract()
         correctAmount(amount) {

        uint256 boPrice = buyOutPrice;

        /**< Cannot be executed if the value send is not equal to the buyout price >*/
        assert(msg.value == boPrice);

        emit LogEnd("BuyOut. Pending Set",
            msg.sender,
            boPrice);

        blockCount = block.number;
        phase = Phase.Pending;

        actualWinner = msg.sender;
    }

    /**
    * Submit a bid for the good. Check if the bid is correct and if
    * the bidder is not the actual winner or the seller or the manager.
    * Emit an event to declare the new highest bid.
    *
    * @param amount value transfered to the contract.
    *
    * modifier changePhase(): check if the phase can change (i.e. 5 block have
    * been mined from last phase change).
    *
    * modifier atPhase(Phase.Submitting): check if the phase is the right one.
    *
    * modifier canInteract(): check if the caller of the function is not the seller
    * OR the manager.
    *
    * modifier correctAmount(amount): check if the value sent is equal to the amount
    * in th einput field.
    */
    function makeBid(uint256 amount) public payable
         changePhase()
         atPhase(Phase.Submitting)
         canInteract()
         correctAmount(amount) {

        address payable oldWinner = actualWinner;

        /**< Cannot be executed if the sender is the actual winner >*/
        require(oldWinner != msg.sender,
            "You are the actual winner of the auction!");

        uint256 oldPrice = actualPrice;
        uint256 min;

        /**< If there is no winner the minimum is the reserve price >*/
        if (oldWinner == address(0)) {
            min = oldPrice;
        }
        /**< Otherwise the new bid must be grater than the old one + the min increment >*/
        else {
            min = oldPrice + bidIncrement;
        }

        /**< Cannot be executed if the bid is too low >*/
        require(msg.value >= min, "Your bid is too low!");

        /**< Update the highest bidder and the actual price >*/
        actualPrice = msg.value;
        actualWinner = msg.sender;

        /**< If it is not the first bid, return the value of the highest bid to the oldWinner.
            The values of both address and value are already updated, so no rientrance is possible >*/
        if (oldWinner != address(0)) {
            oldWinner.transfer(oldPrice);
        }

        emit LogNewHighest("New Highest", msg.value);

        blockCount = block.number;
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

            /**< Delete the auction from the contract manager >*/
            AuctionManager man = AuctionManager(managerContract);
            man.deleteEnglishAuction();

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

        address payable sellerAdd = seller;

        // /**< Can be executed only from the winner OR the manager in a special case >*/
        require(msg.sender == actualWinner ||
            (msg.sender == manager && block.number >= blockCount + 1440),
            "Permission denied!");

        uint256 actPrice = actualPrice;

        /** < Avoid the rientrance by delete the seller address >*/
        seller = address(0);
        sellerAdd.transfer(actPrice);

        emit LogPending("Pending extinguished", actPrice);

        /**< Delete the auction from the contract manager >*/
        AuctionManager man = AuctionManager(managerContract);
        man.deleteEnglishAuction();

        /**< Destruct the contract >*/
        delete seller;
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
