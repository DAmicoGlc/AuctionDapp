pragma solidity 0.4.23;

import "./EnglishAuction.sol";
import "./VicreyAuction.sol";

contract AuctionManager { 

    // map to store all hash of committers
    address[] public engAuctionList;
    address[] public vicAuctionList;

    mapping(address => uint256) public engAuctionMap;
    mapping(address => uint256) public vicAuctionMap;

    address public managerOwner;

    bool public couldCreateAuction;

    event LogEngCreateAuction(string detail, address auction);
    event LogVicCreateAuction(string detail, address auction);
    event LogStopAuctionCreation(string detail);
    event LogStartAuctionCreation(string detail);
    event LogDestroied(string detail);

    modifier couldCreate() {
        require(couldCreateAuction, 
                "It's no longer possible to create auctions!");
        _;
    }

    modifier owner() {
        assert(msg.sender == managerOwner);
        _;
    }

    constructor() public {
        managerOwner = msg.sender;
        couldCreateAuction = true;
    }

    function createEnglishAuction(uint256 resPrice, uint256 buyOut, uint256 incr) public couldCreate() {
        assert(msg.sender != managerOwner);
        EnglishAuction auction = new EnglishAuction(resPrice, buyOut, incr, msg.sender, managerOwner);
        emit LogEngCreateAuction("A new English Auction has been created!", auction);
        engAuctionMap[auction] = engAuctionList.push(auction) - 1;
    }

    function createVicreyAuction(uint256 resPrice, uint256 depositValue) public couldCreate() {
        assert(msg.sender != managerOwner);
        VicreyAuction auction = new VicreyAuction(resPrice, depositValue, msg.sender, managerOwner);
        emit LogVicCreateAuction("A new Vicrey Auction has been created!", auction);
        vicAuctionMap[auction] = vicAuctionList.push(auction) - 1;
    }

    function deleteEnglishAuction() public {
        uint256 index = engAuctionMap[msg.sender];
        require(index != 0);

        uint256 lastIndex = engAuctionList.length;

        engAuctionList[index] = engAuctionList[lastIndex-1];
        delete engAuctionList[lastIndex - 1];
        engAuctionList.length--;
        engAuctionMap[msg.sender] = 0;
    }

    function deleteVicreyAuction() public {
        uint256 index = vicAuctionMap[msg.sender];
        require(index != 0);

        uint256 lastIndex = vicAuctionList.length;

        vicAuctionList[index] = vicAuctionList[lastIndex-1];
        delete vicAuctionList[lastIndex - 1];
        vicAuctionList.length--;
        vicAuctionMap[msg.sender] = 0;

    }

    function getAllAuctions() public view returns(address[] english, address[] vicrey) {
        return (engAuctionList, vicAuctionList);
    }

    function stopCreation() public owner() {
        couldCreateAuction = false;

        emit LogStopAuctionCreation("The auction creation is temporally stopped!");
    }

    function startCreation() public owner() {
        couldCreateAuction = true;

        emit LogStartAuctionCreation("The auction creation is now available!");
    }

    function destroyManager() public owner() {
        require(engAuctionList.length == 0 && 
                vicAuctionList.length == 0);

        emit LogDestroied("The manager will be destroyed!");
        
        selfdestruct(msg.sender);
    }
}