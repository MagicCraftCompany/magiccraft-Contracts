//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/math/SafeMathUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/math/MathUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "./GameWallet/GameWallet.sol";

contract LendMCRT is OwnableUpgradeable, ReentrancyGuardUpgradeable {
    using SafeMathUpgradeable for uint256;
    using SafeERC20Upgradeable for IERC20Upgradeable;

    IERC20Upgradeable public mcrtToken;
    GameWallet public gameWallet;

    address public investor;
    uint256 public investment;
    uint256 public investorPercentage;

    uint256 public timePeriod;
    uint256 public startTime;

    uint256 walletsCount;
    address[] wallets;

    mapping(address => uint256) public claims;
    mapping(address => bool) public isAuthorizedWallet;

    event Deposit(address indexed from, uint256 amount);
    event Claim(address indexed from, uint256 amount);

    /**
     * @dev Initializes the contract with the provided values.
     * @param mcrtTokenAddress_ Address of the MCRT token.
     * @param gameWalletAddress_ Address of the game wallet.
     * @param investor_ Address of the investor.
     * @param wallets_ Addresses of the wallets.
     * @param amount_ Amount of the investor's investment.
     * @param timePeriod_ Time period in seconds.
     * @param investorPercentage_ Percentage of winnings the investor receives.
     */
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

    /**
     * @dev Allows the owner to deposit tokens into the contract.
     */
    function deposit() external onlyOwner {
        mcrtToken.safeTransferFrom(msg.sender, address(this), investment);
        mcrtToken.approve(address(gameWallet), investment);
        gameWallet.manageBalance(true, investment);
        emit Deposit(msg.sender, investment);
    }

    /**
     * @dev Allows authorized wallets to claim tokens from the contract.
     */
    function claim() external nonReentrant {
        require(isAuthorizedWallet[msg.sender] == true, "claim: Caller not authorized to claim");
        require(block.timestamp >= startTime.add(timePeriod), "claim: Claim period not started yet");
        
        uint256 gameWalletBalance = gameWallet.pBalance(address(this));
        require(gameWalletBalance > 0, "claim: game wallet balance is 0");
        gameWallet.manageBalance(false, gameWalletBalance);

        uint256 contractBalance = mcrtToken.balanceOf(address(this));
        uint256 investementRemainToClaim = investment > claims[investor] ? investment.sub(claims[investor]) : 0;
        uint256 winnings = contractBalance > investementRemainToClaim ? contractBalance.sub(investementRemainToClaim) : 0;
        uint256 investorClaimAmount = investementRemainToClaim;
        uint256 playerClaimAmount;
     
        if(winnings > 0) {
            uint256 investorFeeAmount = (winnings.mul(investorPercentage).div(100));
            investorClaimAmount = investorClaimAmount.add(investorFeeAmount);
            playerClaimAmount = (winnings.sub(investorFeeAmount)).div(walletsCount);
        }
        
        // INVESTOR CLAIM
        if(investorClaimAmount > 0) {
            claims[investor] += investorClaimAmount;
            mcrtToken.safeTransfer(investor, investorClaimAmount);
            emit Claim(investor, investorClaimAmount);
        }
        
        // PLAYER CLAIM
        if(playerClaimAmount > 0) {
            for(uint256 i=0; i<walletsCount; i++) {
                claims[wallets[i]] += playerClaimAmount;
                mcrtToken.safeTransfer(wallets[i], playerClaimAmount);
                emit Claim(wallets[i], playerClaimAmount);
            }
        }
        contractBalance = mcrtToken.balanceOf(address(this));
    }
}
