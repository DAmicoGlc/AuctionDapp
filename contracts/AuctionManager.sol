// solium-disable linebreak-style
pragma solidity ^0.5.0;

import "./EnglishAuction.sol";
import "./VicreyAuction.sol";

/**
* Smart contract to manage the auctions creation.
* The constructor of an auction must be done from this contract manager.
* It is possible to stop the creation of the auctions by set the variable
* couldCreateAuction to false. In this way the manager can control the number
* of active auctions and can destroy the contract manager.
* In particular, to destroy the contract manager, no active auctions must
* be in progress.
* To save all addresses of the active auctions, a map and an array are used.
* The index related to a specific auction address are saved in the map, using
* the address as key (the index is incremented by one, and decremented by one
* when needed, in such a way that the index 0 is not present in the map). When
* an auction is deleted, the last auction in the array is moved in the position
* of the deleted one and the length of the array is decremented by one.
*/
contract AuctionManager {

    /**< Array of active auctions address >*/
    address[] public engAuctionList;
    address[] public vicAuctionList;

    /**< Mapping of active auctions index >*/
    mapping(address => uint256) public engAuctionMap;
    mapping(address => uint256) public vicAuctionMap;

    /**< Manager address >*/
    address payable public managerOwner;

    /**< Boolean variable to enable and disable the auction creation >*/
    bool public couldCreateAuction;

    /**
    * Event emitted when an english auction is created.
    *
    * @param detail     explanation of the event;
    * @param auction    address of the auction.
    */
    event LogEngCreateAuction(string detail, address auction);

    /**
    * Event emitted when a vicrey auction is created.
    *
    * @param detail     explanation of the event;
    * @param auction    address of the auction.
    */
    event LogVicCreateAuction(string detail, address auction);

    /**
    * Event emitted when the auction creation is disabled.
    *
    * @param detail     explanation of the event.
    */
    event LogStopAuctionCreation(string detail);

    /**
    * Event emitted when the auction creation is enabled.
    *
    * @param detail     explanation of the event.
    */
    event LogStartAuctionCreation(string detail);

    /**
    * Event emitted when the contract manager is destroyed.
    *
    * @param detail     explanation of the event.
    */
    event LogDestroied(string detail);

    /**
    * Modifier to avoid the creation of an auction when the
    * creation is disabled.
    */
    modifier couldCreate() {
        require(couldCreateAuction,
                "It's no longer possible to create auctions!");
        _;
    }

    /**
    * Modifier to permit only to the manager to controll the contract.
    */
    modifier owner() {
        assert(msg.sender == managerOwner);
        _;
    }

    /**
    * Modifier to avoid that the manager create an auction.
    */
    modifier notOwner() {
        assert(msg.sender != managerOwner);
        _;
    }

    /**
    * Contract constructor, set the creation as enabled and save the
    * sender address as the manager.
    */
    constructor() public {
        managerOwner = msg.sender;
        couldCreateAuction = true;
    }

    /**
    * English auction creation. It call the constructor of the english auction
    * and insert the new address in the map and in the array of auctions.
    * Emit a english creation event.
    *
    * @param resPrice   reserve price for the auction;
    * @param buyOut     buy out price for the auction;
    * @param incr       minimum bid increment for the auction.
    *
    * modifier couldCreate(): check if the creation is enabled.
    *
    * modifier notOwner(): check that the sender is not the owner.
    */
    function createEnglishAuction(uint256 resPrice, uint256 buyOut, uint256 incr) public
         couldCreate()
         notOwner() {

        EnglishAuction auction = new EnglishAuction(resPrice, buyOut, incr, msg.sender, managerOwner);

        emit LogEngCreateAuction("A new English Auction has been created!", address(auction));

        /** < The related index in the map is the index + 1
        *     so that the are no 0 in the map >*/
        engAuctionMap[address(auction)] = engAuctionList.push(address(auction));
    }

    /**
    * Vicrey auction creation. It call the constructor of the vicrey auction
    * and insert the new address in the map and in the array of auctions.
    * Emit a vicrey creation event.
    *
    * @param resPrice       reserve price for the auction;
    * @param depositValue   deposit for the auction.
    *
    * modifier couldCreate(): check if the creation is enabled.
    *
    * modifier notOwner(): check that the sender is not the owner.
    */
    function createVicreyAuction(uint256 resPrice, uint256 depositValue) public
         couldCreate()
         notOwner() {

        VicreyAuction auction = new VicreyAuction(resPrice, depositValue, msg.sender, managerOwner);

        emit LogVicCreateAuction("A new Vicrey Auction has been created!", address(auction));

        /** < The related index in the map is the index + 1
        *     so that the are no 0 in the map >*/
        vicAuctionMap[address(auction)] = vicAuctionList.push(address(auction));
    }

    /**
    * English auction deletion. It is called from the auction contract,
    * after check if the auction is present in the array, the last auction
    * in the array is moved in the position of the deleted one.
    */
    function deleteEnglishAuction() public {
        uint256 index = engAuctionMap[msg.sender];

        /** < Knowing that in the map there is no index-0, if the related
        *     index is zero means that the auction is not present >*/
        require(index != 0, "The auction does not exist!");

        /**< The real index is the decremented >*/
        index--;

        uint256 lastIndex = engAuctionList.length;
        address lastAddress = engAuctionList[lastIndex-1];

        /**< Move the last auction in the index of the auction that must be deleted>*/
        engAuctionList[index] = lastAddress;
        /**< Delete the last auction >*/
        delete engAuctionList[lastIndex-1];
        /**< Decrement the length of the dynamic array >*/
        engAuctionList.length--;

        /**< Change the index related to the last auction that have been moved >*/
        engAuctionMap[lastAddress] = index+1;

        /**< Empty the related index of the auction deleted >*/
        engAuctionMap[msg.sender] = 0;
    }

    /**
    * Vicrey auction deletion. It is called from the auction contract,
    * after check if the auction is present in the array, the last auction
    * in the array is moved in the position of the deleted one.
    */
    function deleteVicreyAuction() public {
        uint256 index = vicAuctionMap[msg.sender];

        /** < Knowing that in the map there is no index-0, if the related
        *     index is zero means that the auction is not present >*/
        require(index != 0, "The auction does not exist!");

        /**< The real index is the decremented >*/
        index--;

        uint256 lastIndex = vicAuctionList.length;
        address lastAddress = vicAuctionList[lastIndex-1];

        /**< Move the last auction in the index of the auction that must be deleted>*/
        vicAuctionList[index] = lastAddress;
        /**< Delete the last auction >*/
        delete vicAuctionList[lastIndex-1];
        /**< Decrement the length of the dynamic array >*/
        vicAuctionList.length--;

        /**< Change the index related to the last auction that have been moved >*/
        vicAuctionMap[lastAddress] = index+1;

        /**< Empty the related index of the auction deleted >*/
        vicAuctionMap[msg.sender] = 0;
    }

    /**
    * Retrive all english active auctions.
    */
    function getEnglishAuctions() public view returns(address[] memory english) {
        return engAuctionList;
    }

    /**
    * Retrive all vicrey active auctions.
    */
    function getVicreyAuctions() public view returns(address[] memory vicrey) {
        return vicAuctionList;
    }

    /**
    * Disable the auction creation.
    *
    * modifier owner(): check if the sender is the owner.
    */
    function stopCreation() public
         owner() {

        couldCreateAuction = false;

        emit LogStopAuctionCreation("The auction creation is temporally stopped!");
    }

    /**
    * Enable the auction creation.
    *
    * modifier owner(): check if the sender is the owner.
    */
    function startCreation() public
         owner() {

        couldCreateAuction = true;

        emit LogStartAuctionCreation("The auction creation is now available!");
    }

    /**
    * Destroy the contract manager after checking that no auctions are active.
    *
    * modifier owner(): check if the sender is the owner.
    */
    function destroyManager() public
         owner() {

        require(engAuctionList.length == 0 &&
                vicAuctionList.length == 0,
                "Some auctions still in progress, delete it!");

        emit LogDestroied("The auction manager will be destroyed!");

        selfdestruct(msg.sender);
    }
}