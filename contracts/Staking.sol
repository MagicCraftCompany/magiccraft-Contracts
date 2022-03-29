//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

contract MCRTStaking is OwnableUpgradeable {
    using SafeERC20Upgradeable for IERC20Upgradeable;
    IERC20Upgradeable public stakingToken;

    event Stake(uint256 stakeId, address staker);
    event Unstake(uint256 stakeId, address unstaker);

    struct StakingInfo {
        uint256 id;
        address owner;
        uint256 timeToUnlock;
        uint256 stakingTime;
        uint256 tokensStaked;
        uint256 tokensStakedWithBonus;
        bool stakingOption; // false: Bonus, true: NFT Point
    }

    bool public stakingEnabled;
    uint256 public rewardRate; // 1 tokens per sec = 86400 tokens per day
    uint256 private constant DIVISOR = 1e11;
    uint256 public lastUpdateTime;
    uint256 public rewardPerTokenStored;
    uint256 public minClaimPeriod; // 30 days
    uint256 public uniqueAddressesStaked;
    uint256 public totalTokensStaked;

    mapping(address => uint256) public userRewardPerTokenPaid;
    mapping(address => uint256) public rewards;
    mapping(uint256 => uint256) public bonusTokenMultiplier;
    mapping(address => mapping(uint256 => StakingInfo)) public stakingInfoForAddress;
    mapping(address => uint256) public tokensStakedByAddress;
    mapping(address => uint256) public tokensStakedWithBonusByAddress;

    uint256 public totalTokensStakedWithBonusTokens;
    mapping(address => uint256) public balances;
    mapping(address => uint256) public lastClaimedTimestamp;
    mapping(address => uint256) public stakingNonce;

    /** Initializes the staking contract
    @param tokenAddress_ the token address that will be staked
    @param owner_ the address of the contract owner
     */
    function initialize(
        address tokenAddress_,
        address owner_,
        uint256 minClaimPeriod_,
        uint256 rewardRate_
    ) external initializer {
        __Ownable_init();
        stakingToken = IERC20Upgradeable(tokenAddress_);
        stakingEnabled = true;
        minClaimPeriod = minClaimPeriod_;
        rewardRate = rewardRate_;
        transferOwnership(owner_);
    }

    /** Computes the reward per token
     */
    function rewardPerToken() public view returns (uint256) {
        if (totalTokensStakedWithBonusTokens == 0) {
            return 0;
        }
        return
            rewardPerTokenStored +
            (((block.timestamp - lastUpdateTime) * rewardRate * 1e18) /
                totalTokensStakedWithBonusTokens);
    }

    /** Computes the earned amount thus far by the address
    @param account_ account to get the earned ammount for
     */
    function earned(address account_) public view returns (uint256) {
        return
            ((balances[account_] * (rewardPerToken() - userRewardPerTokenPaid[account_])) / 1e18) +
            rewards[account_];
    }

    /** modifier that updates and computes the correct internal variables
    @param account_ the account called for
     */
    modifier updateReward(address account_) {
        rewardPerTokenStored = rewardPerToken();
        lastUpdateTime = block.timestamp;

        rewards[account_] = earned(account_);
        userRewardPerTokenPaid[account_] = rewardPerTokenStored;
        _;
    }

    /** Staking function
    @param amount_ the amount to stake
    @param lockTime_ the lock time to lock the stake for
     */
    function stake(uint256 amount_, uint256 lockTime_) external updateReward(msg.sender) {
        require(stakingEnabled, "STAKING_DISABLED");
        require(amount_ > 0, "CANNOT_STAKE_0");
        require(bonusTokenMultiplier[lockTime_] > 0, "LOCK_TIME_ERROR");

        if (stakingNonce[msg.sender] == 0) {
            uniqueAddressesStaked++;
        }
        uint256 tokensWithBonus = (amount_ * bonusTokenMultiplier[lockTime_]) / DIVISOR;

        totalTokensStaked += amount_;
        totalTokensStakedWithBonusTokens += tokensWithBonus;
        balances[msg.sender] += tokensWithBonus;
        tokensStakedByAddress[msg.sender] += amount_;
        tokensStakedWithBonusByAddress[msg.sender] += tokensWithBonus;
        lastClaimedTimestamp[msg.sender] = block.timestamp;

        StakingInfo storage data = stakingInfoForAddress[msg.sender][stakingNonce[msg.sender]];
        data.owner = msg.sender;
        data.stakingTime = block.timestamp;
        data.tokensStaked = amount_;
        data.timeToUnlock = block.timestamp + lockTime_;
        data.tokensStakedWithBonus = tokensWithBonus;
        data.id = stakingNonce[msg.sender];

        emit Stake(stakingNonce[msg.sender], msg.sender);
        stakingNonce[msg.sender]++;

        stakingToken.safeTransferFrom(msg.sender, address(this), amount_);
    }

    /** Unstake function
    @param stakeId_ the stake id to unstake
     */
    function unstake(uint256 stakeId_) external updateReward(msg.sender) {
        StakingInfo storage info = stakingInfoForAddress[msg.sender][stakeId_];
        require(info.timeToUnlock <= block.timestamp, "Not reached to timeToUnlock yet");

        getRewardInternal();

        totalTokensStaked -= info.tokensStaked;
        totalTokensStakedWithBonusTokens -= info.tokensStakedWithBonus;
        balances[msg.sender] -= info.tokensStakedWithBonus;
        tokensStakedByAddress[msg.sender] -= info.tokensStaked;
        tokensStakedWithBonusByAddress[msg.sender] -= info.tokensStakedWithBonus;

        uint256 tokensTotal = info.tokensStaked;

        delete stakingInfoForAddress[msg.sender][stakeId_];
        emit Unstake(stakeId_, msg.sender);

        stakingToken.safeTransfer(msg.sender, tokensTotal);
    }

    /** The function called to get the reward for all the user stakes
     */
    function getReward() external updateReward(msg.sender) {
        require(
            lastClaimedTimestamp[msg.sender] + minClaimPeriod <= block.timestamp,
            "Cannot claim Rewards Yet"
        );
        getRewardInternal();
    }

    /** The function called to get the reward for all the user stakes
    This function does not check for min claimPeriod
     */
    function getRewardInternal() internal {
        lastClaimedTimestamp[msg.sender] = block.timestamp;
        uint256 reward = rewards[msg.sender];
        rewards[msg.sender] = 0;
        stakingToken.safeTransfer(msg.sender, reward);
    }

    /** 
    @dev Sets the bonus multipliers and the allowed locking durations
    @param durations_ an array of the allowed staking durations
    @param mutiplier_ the multiplier dor all staking durations
     */
    function setBonusMultiplier(uint256[] calldata durations_, uint256[] calldata mutiplier_)
        external
        onlyOwner
    {
        for (uint256 i = 0; i < durations_.length; i++) {
            require(mutiplier_[i] >= DIVISOR, "Invalid multiplier");
            bonusTokenMultiplier[durations_[i]] = mutiplier_[i];
        }
    }

    /** 
    @dev Sets the staking enabled flag
    @param stakingEnabled_ weather or not staking should be enabled
    */
    function setStakingEnabled(bool stakingEnabled_) external onlyOwner {
        stakingEnabled = stakingEnabled_;
    }

    /** 
    @dev Sets the new reward rate
    @param rewardRate_ the reward rate to set up
    */
    function setRewardRate(uint256 rewardRate_) external onlyOwner {
        require(rewardRate_ > 0, "Cannot have reward Rate 0");
        rewardRate = rewardRate_;
    }

    /** 
    @dev Sets the new minimum claim period
    @param minClaimPeriod_ the period limit for claiming rewards
    */
    function setMinClaimPeriod(uint256 minClaimPeriod_) external onlyOwner {
        minClaimPeriod = minClaimPeriod_;
    }

    /**
    @dev Returns all the user stakes
    @param userAddress_ returns all the user stakes
     */
    function getAllAddressStakes(address userAddress_) public view returns (StakingInfo[] memory) {
        StakingInfo[] memory stakings = new StakingInfo[](stakingNonce[userAddress_]);
        for (uint256 i = 0; i < stakingNonce[userAddress_]; i++) {
            StakingInfo memory staking = stakingInfoForAddress[userAddress_][i];
            if (staking.tokensStaked > 0) {
                stakings[i] = staking;
            }
        }
        return stakings;
    }
}
