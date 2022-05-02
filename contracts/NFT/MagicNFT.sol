//SPDX-License-Identifier: None
pragma solidity ^0.8.7;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";

import "./ERC721AUpgradeable.sol";
import "./MagicSigner.sol";

contract MagicNFT is
    ERC721AUpgradeable,
    MagicSigner,
    ReentrancyGuardUpgradeable,
    OwnableUpgradeable,
    PausableUpgradeable
{
    string public baseTokenURI;

    uint8 public maxWhiteListMintForEach;
    uint8 public maxPublicMintForEach;

    uint256 public MAX_SUPPLY;

    uint256 public whiteListPriceForEach;
    uint256 public publicMintPriceForEach;

    address public designatedSigner;
    address payable public treasure;

    uint256 public whiteListMinted;
    uint256 public publicMinted;
    uint256 public ownerMinted;

    bool public isWhiteListSale;
    bool public isPublicSale;

    mapping(address => uint256) public whiteListSpotBought;
    mapping(address => uint256) public publicMintSpotBought;
    mapping(address => bool) public minters;

    modifier onlyMinter() {
        require(minters[msg.sender], "Invalid minter");
        _;
    }

    modifier onlyEOA() {
        require(msg.sender == tx.origin, "Only wallet can call function");
        _;
    }

    function initialize(
        string memory name_,
        string memory symbol_,
        uint256 maxSupply_,
        address treasure_,
        address designatedSigner_
    ) public initializer {
        require(designatedSigner_ != address(0), "Invalid designated signer address");
        require(treasure_ != address(0), "Invalid treasure address");

        __ERC721A_init(name_, symbol_);
        __Ownable_init();
        __ReentrancyGuard_init();
        __MagicSigner_init();

        maxWhiteListMintForEach = 1;
        maxPublicMintForEach = 1;

        isWhiteListSale = true;
        isPublicSale = false;

        MAX_SUPPLY = maxSupply_;

        treasure = payable(treasure_);
        designatedSigner = designatedSigner_;
        whiteListPriceForEach = 0.75 ether;
        publicMintPriceForEach = 0.75 ether;
    }

    function ownerMint(uint256 _amount) external onlyOwner {
        require(_amount + totalSupply() <= MAX_SUPPLY, "Max Supply Limit Exceeded");
        ownerMinted += _amount;
        _mint(_msgSender(), _amount);
    }

    function whiteListMint(WhiteList memory _whitelist, uint256 _amount)
        external
        payable
        nonReentrant
    {
        require(isWhiteListSale, "Whitelist sale is not open yet");
        require(getSigner(_whitelist) == designatedSigner, "Invalid Signature");
        require(_whitelist.userAddress == _msgSender(), "Not A Whitelisted Address");
        require(
            _amount + whiteListSpotBought[_whitelist.userAddress] <= maxWhiteListMintForEach,
            "Max WhiteList Spot Bought"
        );
        require(msg.value == _amount * whiteListPriceForEach, "Pay Exact Amount");
        whiteListMinted += _amount;
        whiteListSpotBought[_whitelist.userAddress] += _amount;

        _mint(_whitelist.userAddress, _amount);
    }

    function publicMint(uint256 _amount) external payable onlyEOA nonReentrant {
        require(isPublicSale, "Public sale is not open yet");
        require(
            _amount + publicMintSpotBought[_msgSender()] <= maxPublicMintForEach,
            "Max Public Mint Spot Bought"
        );
        require(totalSupply() + _amount <= MAX_SUPPLY, "Public Mint all sold");
        require(msg.value == publicMintPriceForEach * _amount, "Pay Exact Amount");

        publicMintSpotBought[_msgSender()] += _amount;
        publicMinted += _amount;

        _mint(_msgSender(), _amount);
    }

    function mint(address[] memory _account, uint256[] memory _amount)
        external
        nonReentrant
        onlyMinter
    {
        require(_account.length == _amount.length, "Invalid array length");

        for (uint256 i = 0; i < _account.length; i++) {
            require(totalSupply() + _amount[i] <= MAX_SUPPLY, "Token all minted");
            require(_account[i] != address(0), "Invalid receiver address");

            _mint(_account[i], _amount[i]);
        }
    }

    ///@dev withdraw funds from contract to treasure
    function withdraw() external onlyOwner {
        require(treasure != address(0), "Treasure address not set");
        treasure.transfer(address(this).balance);
    }

    function setBaseURI(string memory baseURI_) public onlyOwner {
        require(bytes(baseURI_).length > 0, "Invalid base URI");
        baseTokenURI = baseURI_;
    }

    function setTreasure(address _treasure) external onlyOwner {
        require(_treasure != address(0), "Invalid address for signer");
        treasure = payable(_treasure);
    }

    function setDesignatedSigner(address _signer) external onlyOwner {
        require(_signer != address(0), "Invalid address for signer");
        designatedSigner = _signer;
    }

    /////////////////
    /// Set Price ///
    /////////////////

    function setPublicMintPriceForEach(uint256 _price) external onlyOwner {
        publicMintPriceForEach = _price;
    }

    function setWhitelistPriceForEach(uint256 _price) external onlyOwner {
        whiteListPriceForEach = _price;
    }

    ///////////////
    /// Set Max ///
    ///////////////

    function setMaxWhiteListMintForEach(uint8 _amount) external onlyOwner {
        maxWhiteListMintForEach = _amount;
    }

    function setMaxPublicMintForEach(uint8 _amount) external onlyOwner {
        maxPublicMintForEach = _amount;
    }

    function setMaxSupply(uint256 amount) external onlyOwner {
        require(MAX_SUPPLY >= totalSupply(), "Invalid max supply number");
        MAX_SUPPLY = amount;
    }

    ///@dev Toggle contract pause
    function togglePause() external onlyOwner {
        if (paused()) {
            _unpause();
        } else {
            _pause();
        }
    }

    ///@dev set public sale
    function setPublicSale(bool _isOpen) external onlyOwner {
        require(isPublicSale != _isOpen, "Your value is the same with current one");
        isPublicSale = _isOpen;
    }

    ///@dev set whitelist sale
    function setWhiteSale(bool _isOpen) external onlyOwner {
        require(isWhiteListSale != _isOpen, "Your value is the same with current one");
        isWhiteListSale = _isOpen;
    }

    ///@dev Override Function
    function _startTokenId() internal view virtual override returns (uint256) {
        return 1;
    }

    function _baseURI() internal view virtual override returns (string memory) {
        return baseTokenURI;
    }

    function _beforeTokenTransfers(
        address from,
        address to,
        uint256 startTokenId,
        uint256 quantity
    ) internal virtual override whenNotPaused {
        super._beforeTokenTransfers(from, to, startTokenId, quantity);
    }
}
