//SPDX-License-Identifier: None
pragma solidity ^0.8.7;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";

import "../NFT/ERC721AUpgradeable.sol";

contract JCGNFT is
    ERC721AUpgradeable,
    ReentrancyGuardUpgradeable,
    OwnableUpgradeable,
    PausableUpgradeable
{
    string public baseTokenURI;

    uint256 public MAX_SUPPLY;

    uint96 public constant ROYALTY_PERCENT = 75;

    mapping(address => bool) public minters;

    bytes4 private constant _INTERFACE_ID_ERC2981 = 0x2a55205a;

    struct RoyaltyInfo {
        address receiver;
        uint96 royaltyFraction;
    }

    RoyaltyInfo private _defaultRoyaltyInfo;
    mapping(uint256 => RoyaltyInfo) private _tokenRoyaltyInfo;

    modifier onlyMinter() {
        require(minters[msg.sender], "Invalid minter");
        _;
    }

    function initialize(
        string memory name_,
        string memory symbol_,
        uint256 maxSupply_
    ) public initializer {
        __ReentrancyGuard_init();
        __ERC721A_init(name_, symbol_);
        __Ownable_init();

        MAX_SUPPLY = maxSupply_;
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

            for (uint256 j = _currentIndex; j <= _currentIndex + _amount[i]; j++) {
                _setTokenRoyalty(j, _account[i], ROYALTY_PERCENT);
            }

            _safeMint(_account[i], _amount[i]);
        }
    }

    function setBaseURI(string memory baseURI_) public onlyOwner {
        require(bytes(baseURI_).length > 0, "Invalid base URI");
        baseTokenURI = baseURI_;
    }

    function setMinter(address _account, bool _isMinter) external onlyOwner {
        minters[_account] = _isMinter;
    }

    function supportsInterface(bytes4 interfaceId) public view virtual override returns (bool) {
        return interfaceId == _INTERFACE_ID_ERC2981 || super.supportsInterface(interfaceId);
    }

    ///@dev Toggle contract pause
    function togglePause() external onlyOwner {
        if (paused()) {
            _unpause();
        } else {
            _pause();
        }
    }

    ///@dev Override Function
    function _startTokenId() internal view virtual override returns (uint256) {
        return 1;
    }

    function tokenURI(uint256 tokenId) public view virtual override returns (string memory) {
        return baseTokenURI;
    }

    ///////////////
    /// Royalty ///
    ///////////////

    function royaltyInfo(uint256 _tokenId, uint256 _salePrice)
        public
        view
        returns (address, uint256)
    {
        RoyaltyInfo memory royalty = _tokenRoyaltyInfo[_tokenId];

        if (royalty.receiver == address(0)) {
            royalty = _defaultRoyaltyInfo;
        }

        uint256 royaltyAmount = (_salePrice * royalty.royaltyFraction) / _feeDenominator();

        return (royalty.receiver, royaltyAmount);
    }

    function _feeDenominator() internal pure virtual returns (uint96) {
        return 10000;
    }

    function _setTokenRoyalty(
        uint256 tokenId,
        address receiver,
        uint96 feeNumerator
    ) internal virtual {
        require(feeNumerator <= _feeDenominator(), "ERC2981: royalty fee will exceed salePrice");
        require(receiver != address(0), "ERC2981: Invalid parameters");

        _tokenRoyaltyInfo[tokenId] = RoyaltyInfo(receiver, feeNumerator);
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
