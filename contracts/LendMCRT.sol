//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/math/SafeMathUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "./GameWallet/GameWallet.sol";
import "hardhat/console.sol";

contract LendMCRT is OwnableUpgradeable, ReentrancyGuardUpgradeable {
    using SafeMathUpgradeable for uint256;
    using SafeERC20Upgradeable for IERC20Upgradeable;

    IERC20Upgradeable public mcrtToken;
    GameWallet public gameWallet;

    address public investor;
    uint256 public amount;
    uint256 public timePeriod;
    uint8 public investorPercentage;
    uint256 public startTime;
    uint256 walletsCount;
    address[] wallets;
    mapping(address => uint256) public claims;
    mapping(address => bool) public isAuthorizedWallet;
    event Deposit(address indexed from, uint256 amount);
    event Claim(address indexed from, uint256 amount);

    function initialize(
        address mcrtTokenAddress_,
        address gameWalletAddress_,
        address investor_,
        address[] calldata wallets_,
        uint256 amount_,
        uint256 timePeriod_,
        uint8 investorPercentage_
    ) external initializer {
        require(mcrtTokenAddress_ != address(0), "initialize: Invalid MCRT token address");
        require(gameWalletAddress_ != address(0), "initialize: Invalid GameWallet address");
        require(investor_ != address(0), "initialize: Invalid investor address");
        require(wallets_.length > 0, "initialize: Wallets array cannot be empty");
        require(amount_ > 0, "initialize: Amount must be greater than 0");
        require(timePeriod_ > 0, "initialize: Time period must be greater than 0");
        require(
            investorPercentage_ > 0 && investorPercentage_ <= 100,
            "initialize: Invalid investor percentage"
        );

        __Ownable_init();
        _transferOwnership(investor_);

        mcrtToken = IERC20Upgradeable(mcrtTokenAddress_);
        gameWallet = GameWallet(gameWalletAddress_);
        investor = investor_;
        amount = amount_;
        timePeriod = timePeriod_;
        investorPercentage = investorPercentage_;
        startTime = block.timestamp;
        claims[investor] = 0;
        walletsCount = wallets_.length;
        isAuthorizedWallet[investor] = true;
        for (uint256 i = 0; i < wallets_.length; i++) {
            address wallet = wallets_[i];
            require(wallet != address(0), "initialize: Invalid wallet address");
            claims[wallet] = 0;
            isAuthorizedWallet[wallet] = true;
        }
        wallets = wallets_;
    }

    function deposit() external onlyOwner {
        mcrtToken.safeTransferFrom(msg.sender, address(this), amount);
        mcrtToken.approve(address(gameWallet), amount);
        gameWallet.manageBalance(true, amount);
        emit Deposit(msg.sender, amount);
    }

    function claim() external nonReentrant {
        require(isAuthorizedWallet[msg.sender] == true, "claim: Caller not authorized to claim");
        require(block.timestamp >= startTime.add(timePeriod), "claim: Claim period not started yet");
        uint256 gameWalletBalance = gameWallet.pBalance(address(this));
        require(gameWalletBalance > 0, "claim: game wallet balance is 0");
        uint256 investementRemainToClaim = amount >= claims[investor] ? amount.sub(claims[investor]) : 0;
        uint256 winnings = gameWalletBalance >= investementRemainToClaim ? gameWalletBalance.sub(investementRemainToClaim) : 0;
        uint256 investorClaimAmount = investementRemainToClaim;
        uint256 playerClaimAmount;
        
        if(winnings > 0) {
            uint256 remainingForInvestor = (winnings.mul(investorPercentage).div(100));
            investorClaimAmount = investementRemainToClaim.add(remainingForInvestor);
            winnings = winnings.sub(remainingForInvestor);
            playerClaimAmount = winnings.div(walletsCount);
        }

        if (msg.sender == investor) {
            uint256 claimedRemainings = claims[investor] >= amount ? claims[investor].sub(amount) : 0;
            investorClaimAmount = investorClaimAmount >= claimedRemainings ? investorClaimAmount.sub(claimedRemainings) : 0;
            require(investorClaimAmount > 0, "claim: investor remaining amount is 0");
            claims[investor] += investorClaimAmount;
            gameWallet.manageBalance(false, investorClaimAmount);
            mcrtToken.safeTransfer(investor, investorClaimAmount);
            emit Claim(investor, investorClaimAmount);
        } else {
            playerClaimAmount = playerClaimAmount >= claims[msg.sender] ? playerClaimAmount.sub(claims[msg.sender]) : 0;
            require(playerClaimAmount > 0, "claim: player remaining amount is 0");
            claims[msg.sender] += playerClaimAmount;
            gameWallet.manageBalance(false, playerClaimAmount);
            mcrtToken.safeTransfer(msg.sender, playerClaimAmount);
            emit Claim(msg.sender, playerClaimAmount);
        }
    }
}
