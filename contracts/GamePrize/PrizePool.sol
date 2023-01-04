//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

import "./GameSigner.sol";

contract PrizePool is OwnableUpgradeable, GameSigner {
    using SafeERC20Upgradeable for IERC20Upgradeable;

    // Address of prize token
    IERC20Upgradeable public prizeToken;

    // Signer address
    address public signer;

    // Minimum entry fee
    uint256 public minEntryFee;

    // Prize distributed
    uint256 public prizeDist;

    // Mapping for winners rewards
    mapping(address => uint256) public winRewards;

    uint256[50] private __gap;

    event MinEntryFeeUpdated(uint256 minEntryFee);

    event PrizeClaimed(address indexed account, uint256 amount);

    /** Initializes the PrizePool
    @param tokenAddress_ the token address for prize 
    @param signer_ the signer address
    @param minEntryFee_ minimum amount of entry fee
     */
    function initialize(
        address tokenAddress_,
        address signer_,
        uint256 minEntryFee_
    ) external initializer {
        require(tokenAddress_ != address(0), "Invalid token address");
        require(signer_ != address(0), "Invalid signer address");
        __Ownable_init();

        signer = signer_;
        minEntryFee = minEntryFee_;
        prizeToken = IERC20Upgradeable(tokenAddress_);
    }

    function addEntryFee(GameEntry memory _gameEntry, uint256 _amount) external {
        require(getSigner(_gameEntry) == signer, "Invalid signature");
        require(_amount >= minEntryFee, "Invalid entry fee amount");

        prizeToken.safeTransferFrom(msg.sender, address(this), _amount);
    }

    function claim() external {
        uint256 claimAmt = winRewards[msg.sender];
        require(claimAmt != 0, "No reward for account");

        winRewards[msg.sender] = 0;
        prizeToken.safeTransfer(msg.sender, claimAmt);
        prizeDist -= claimAmt;

        emit PrizeClaimed(msg.sender, claimAmt);
    }

    ///////////////////////
    /// Owner Functions ///
    ///////////////////////

    function updateMinEntryFee(uint256 _minEntryFee) external onlyOwner {
        minEntryFee = _minEntryFee;
        emit MinEntryFeeUpdated(minEntryFee);
    }

    function updatePrizeToken(address _prizeToken) external onlyOwner {
        require(_prizeToken != address(0), "Invalid prize token address");
        prizeToken = IERC20Upgradeable(_prizeToken);
    }

    function addWinners(address[] memory _winners) external onlyOwner {
        uint256 rewards = prizeToken.balanceOf(address(this)) - prizeDist;

        require(_winners.length != 0, "Invalid winners length");
        require(rewards != 0, "No prize for distribution");

        prizeDist += rewards;
        for (uint256 i; i < _winners.length; ++i) {
            if (i == _winners.length - 1)
                winRewards[_winners[i]] +=
                    rewards -
                    (rewards / _winners.length) *
                    (_winners.length - 1);
            else winRewards[_winners[i]] += rewards / _winners.length;
        }
    }
}
