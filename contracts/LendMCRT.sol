//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/math/SafeMathUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/math/MathUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "./GameWallet/GameWallet.sol";
import "hardhat/console.sol";

contract LendMCRT is OwnableUpgradeable, ReentrancyGuardUpgradeable {
    using SafeMathUpgradeable for uint256;
    using SafeERC20Upgradeable for IERC20Upgradeable;

    IERC20Upgradeable public mcrtToken;
    GameWallet public gameWallet;

    address public investor;
    uint256 public investment;
    uint256 public investmentClaimed;
    uint256 public timePeriod;
    uint256 public investorPercentage;
    uint256 public startTime;
    uint256 walletsCount;
    uint256 lastGameWalletBalance;
    address[] wallets;
    mapping(address => uint256) public claims;
    mapping(address => uint256) public claimsCount;
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
        uint256 investorPercentage_
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
        investment = amount_;
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
        mcrtToken.safeTransferFrom(msg.sender, address(this), investment);
        mcrtToken.approve(address(gameWallet), investment);
        gameWallet.manageBalance(true, investment);
        emit Deposit(msg.sender, investment);
    }

    function claim() external nonReentrant {
       
        require(isAuthorizedWallet[msg.sender] == true, "claim: Caller not authorized to claim");
        require(block.timestamp >= startTime.add(timePeriod), "claim: Claim period not started yet");
        uint256 gameWalletBalance = gameWallet.pBalance(address(this));
        require(gameWalletBalance > 0, "claim: game wallet balance is 0");
        console.log("investmentClaimed", investmentClaimed);
        uint256 investementRemainToClaim;
        uint256 winnings;
        if(investmentClaimed < investment) {
            investementRemainToClaim = investment.sub(investmentClaimed);
            winnings = gameWalletBalance >= investementRemainToClaim ? gameWalletBalance.sub(investementRemainToClaim) : 0;
        } else {
            winnings = gameWalletBalance;
        }

        console.log("investementRemainToClaim", investementRemainToClaim);
        uint256 investorClaimAmount;
        uint256 playerClaimAmount;
        
        if(winnings > 0) {
            investorClaimAmount = (winnings.mul(investorPercentage).div(100));
            winnings = winnings.sub(investorClaimAmount);
            playerClaimAmount = winnings.div(walletsCount);
        }

        if (msg.sender == investor) {
            console.log("investor_claimsCount", claimsCount[investor]);
            if(lastGameWalletBalance == gameWalletBalance) {
                for(uint256 i=0; i< wallets.length; i++)  {
                    if(claimsCount[investor] > claimsCount[wallets[i]]) {
                        investorClaimAmount = 0;
                        break;
                    }
                }
            }
            console.log("lastGameWalletBalance", lastGameWalletBalance);
            console.log("gameWalletBalance", gameWalletBalance);
            console.log("claims[investor]", claims[investor]);
            //investorClaimAmount = investorClaimAmount >= claims[investor] ? investorClaimAmount.sub(claims[investor]) : investorClaimAmount;
            console.log("investorClaimAmount", investorClaimAmount);
            if(investementRemainToClaim == 0) {
                console.log("SONO QUI");
                require(investorClaimAmount > 0, "claim: investor remaining amount is 0");
            }
            uint256 amountToclaim = investementRemainToClaim.add(investorClaimAmount);
            console.log("amountToclaim", amountToclaim);

            investmentClaimed = investmentClaimed.add(investementRemainToClaim);
            console.log("investmentClaimed", investmentClaimed);
            claims[investor] += investorClaimAmount;
            claimsCount[investor]++;
            gameWallet.manageBalance(false, amountToclaim);
            mcrtToken.safeTransfer(investor, amountToclaim);
            lastGameWalletBalance = gameWallet.pBalance(address(this));
            
            emit Claim(investor, amountToclaim);
        } else {
            playerClaimAmount = playerClaimAmount >= claims[msg.sender] ? playerClaimAmount.sub(claims[msg.sender]) : playerClaimAmount;
            require(playerClaimAmount > 0, "claim: player remaining amount is 0");
            claims[msg.sender] += playerClaimAmount;
            claimsCount[msg.sender]++;
            gameWallet.manageBalance(false, playerClaimAmount);
            mcrtToken.safeTransfer(msg.sender, playerClaimAmount);
            lastGameWalletBalance = gameWallet.pBalance(address(this));
            emit Claim(msg.sender, playerClaimAmount);
        }
    }
}
