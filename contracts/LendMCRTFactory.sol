// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
import "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "./GameWallet/GameWallet.sol";
import "./LendMCRT.sol";

/**
 * @title LendMCRTFactory
 * @dev A contract that deploys instances of LendMCRT.
 */
contract LendMCRTFactory is ReentrancyGuardUpgradeable {
    using SafeERC20Upgradeable for IERC20Upgradeable;
    
    /**
     * @dev A mapping to keep track of each LendMCRT contract's address.
     */
    mapping(address => address) public getLendMCRT;

    event LendMCRTCreated(address indexed creator, address lendMCRT);
    event InvestmentDeposited(address indexed from, uint256 amount);

    /**
     * @dev Creates a new LendMCRT contract.
     * @param mcrtTokenAddress_ Address of the MCRT token.
     * @param gameWalletAddress_ Address of the game wallet.
     * @param wallets_ Addresses of the wallets.
     * @param investment_ Amount of tokens.
     * @param timePeriod_ Time period in seconds.
     * @param investorPercentage_ Percentage of winnings the investor receives.
     */
    function lendMCRT(
        address mcrtTokenAddress_,
        address gameWalletAddress_,
        address[] calldata wallets_,
        uint256 investment_,
        uint256 timePeriod_,
        uint256 investorPercentage_
    ) external nonReentrant {
        // Deploy a new LendMCRT contract
        LendMCRT newLendMCRT = new LendMCRT();
        getLendMCRT[msg.sender] = address(newLendMCRT);

        // Transfer the investment amount to the new contract
        IERC20Upgradeable mcrtToken = IERC20Upgradeable(mcrtTokenAddress_);
        require(mcrtToken.balanceOf(msg.sender) >= investment_, "lendMCRT: insufficient investor balance");
        mcrtToken.safeTransferFrom(msg.sender, address(newLendMCRT), investment_);
        
        newLendMCRT.initialize(
            mcrtTokenAddress_,
            gameWalletAddress_,
            msg.sender,
            wallets_,
            investment_,
            timePeriod_,
            investorPercentage_
        );

        // Ensure the new contract is owned by the investor
        require(newLendMCRT.owner() == msg.sender, "lendMCRT: New contract owner must be the caller of lendMCRT");

        emit LendMCRTCreated(msg.sender, address(newLendMCRT));
    }
}
