//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/math/SafeMathUpgradeable.sol";
import "./GameWallet/GameWallet.sol";

contract LendMCRT is OwnableUpgradeable {
    using SafeMathUpgradeable for uint256;
    using SafeERC20Upgradeable for IERC20Upgradeable;

    IERC20Upgradeable public mcrtToken;
    GameWallet public gameWallet;

    address public investor;
    uint256 public amount;
    uint256 public timePeriod;
    uint256 public investorPercentage;
    uint256 public startTime;
    address[] wallets;
    mapping(address => uint256) public claims;

    event Deposit(address indexed from, uint256 amount);

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
        amount = amount_;
        timePeriod = timePeriod_;
        investorPercentage = investorPercentage_;
        startTime = block.timestamp;

        for (uint256 i = 0; i < wallets_.length; i++) {
             claims[wallets_[i]] = 0;       
        }
    }

    function deposit() external onlyOwner {
        mcrtToken.safeTransferFrom(msg.sender, address(this), amount);
        mcrtToken.approve(address(gameWallet), amount);
        gameWallet.manageBalance(true, amount);
        emit Deposit(msg.sender, amount);
    }

    function claim() external {
        require(block.timestamp >= startTime.add(timePeriod), "claim: Claim period not started yet");

        uint256 remainingAmount = gameWallet.pBalance(address(this));
        gameWallet.manageBalance(false, amount);
        uint256 investorClaimAmount = remainingAmount.mul(investorPercentage).div(100);
        uint256 playerClaimAmount = remainingAmount.sub(investorClaimAmount).div(wallets.length);

        if (msg.sender == investor) {
            mcrtToken.safeTransfer(investor, investorClaimAmount);
        } else {
            bool isWallet = false;
            for (uint256 i = 0; i < wallets.length; i++) {
                if (msg.sender == wallets[i]) {
                    isWallet = true;
                    break;
                }
            }

            require(isWallet, "claim: Caller not authorized to claim");
            mcrtToken.safeTransfer(msg.sender, playerClaimAmount);
        }
    }
}
