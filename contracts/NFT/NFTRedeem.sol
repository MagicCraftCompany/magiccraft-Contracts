//SPDX-License-Identifier: None
pragma solidity ^0.8.7;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";

import "../IPoints.sol";

interface IMagicNFT {
    function mint(address[] memory, uint256[] memory) external;
}

contract NFTRedeem is OwnableUpgradeable, PausableUpgradeable {
    // Point contract address
    address public point;

    // MagicNFT contract address
    address public magicNFT;

    function initialize(address _point, address _magicNFT) public initializer {
        require(_point != address(0), "Invalid Point contract address");
        require(_magicNFT != address(0), "Invalid MagicNFT address");

        __Ownable_init();

        point = _point;
        magicNFT = _magicNFT;
    }

    function redeem(uint256 _amount) external {
        require(_amount != 0, "Amount can't be zero");
        require(
            _amount <= IPoints(point).pointsOf(msg.sender)[1],
            "You don't have enough character point"
        );

        require(
            IPoints(point).transferFrom(msg.sender, address(this), 0, _amount, 0),
            "Point Transfer failed"
        );
        address[] memory accounts = new address[](1);
        uint256[] memory amounts = new uint256[](1);
        accounts[0] = msg.sender;
        amounts[0] = _amount;

        IMagicNFT(magicNFT).mint(accounts, amounts);
    }

    ///////////////////////////
    /// OnlyOwner Functions ///
    ///////////////////////////

    function updateMagicNFT(address _magicNFT) external onlyOwner {
        require(_magicNFT != address(0), "Invalid MagicNFT address");
        magicNFT = _magicNFT;
    }

    function updatePoint(address _point) external onlyOwner {
        require(_point != address(0), "Invalid Point contract address");
        point = _point;
    }
}
