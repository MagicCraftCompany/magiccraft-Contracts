// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.7.4;

import "./Ownable.sol";
import "./SafeMath.sol";
import "./IERC20.sol";
import "./IPoints.sol";

// ----------------------------------------------------------------------------
// ERC20 Token, with the addition of symbol, name and decimals and assisted
// token transfers
// ----------------------------------------------------------------------------
contract MCRTStake is Ownable {
    using SafeMath for uint256;

    address public MCRT; // address of MCRT
    address public Points; //address of Point Contract
    // uint256 public MCRTPrice; // the price of MCRT
    // uint256 public PointPrice; // the price of Point 
    // uint8 public MCRTDecimals; // the decimals of MCRTPrice eg: MCRTPrice = 9, MCRTDecimals = 3 => token price = $0.0009 (9/10^3)
    // uint8 public PointDecimals; // the decimals of PointPrice eg: PointPrice = 20, MCRTDecimals = 0 => pointPrice = $20 (20/10^0)
    uint8 public decimals = 18; // the decimals of MCRT
    uint256 public totalHolders; // the count of stakers
    // uint256 public LockingPeriod = 30 days;
    uint256 public totalTokensForStaking = 0; //the total tokens for the Staking
    uint256 public totalTokensForPoint = 0; // the total tokens for the Point
    uint256 public totalAddedTokens = 0; //the total tokens added in the Staking and Point

    uint256 public tokenAmountForItemPoint = 83333 * (10 ** 18);
    uint256 public tokenAmountForCharacterPoint = 166333 * (10 ** 18);
    uint256 public tokenAmountForLandPoint = 1663333 * (10 ** 18);


    uint256 public totalAmountForReward = 0;

    struct USER {
        uint256 stakedTokens; // the token amount while is staking now
        uint256 rewardTokens; // the token amount that is rewarded
        uint256 tokenForPoints; // the token amount to get the point
        uint256 rewardItem; // the reward item 
        uint256 stakingTime; // the start time of staking
        uint256 currentTime;
        uint256 lockingPeriod;
        uint256 claimAbaleTokensForStaking;
        uint256 claimAbaleTokensForPoint;
        uint256 claimAbleRewardToken;
        uint256 claimAbleRewardItem;
        uint256 apr;
        bool initialized; // the bool variable to show if it is staking
    }
    mapping(address => mapping (uint256 => USER)) private stakers;
    // address[] public holders;

    mapping(uint256 => uint256) private lockingPeriods;
    mapping(uint256 => address) private holders;
    mapping(address => uint256) public holdersTostake;
    mapping(uint256 => uint256) public rewardTokenPercentage;

    event STAKED(address staker, uint256 LockingPeriod, uint256 tokens, uint8 option);
    event UNSTAKED(address staker, uint256 LockingPeriod, uint256 tokens);

    event CLAIMEDREWARD(address staker, uint256 rewardTokens, uint256 rewardItemPoints,uint256 rewardCharacterPoints,uint256 rewardLandPoints);


    constructor (address _MCRT, address _Points) {
        MCRT = _MCRT;
        Points = _Points;
        lockingPeriods[30] = 30 days;
        lockingPeriods[90] = 90 days;
        lockingPeriods[180] = 180 days;
        lockingPeriods[365] = 365 days;
        lockingPeriods[1095] = 1095 days;
        lockingPeriods[1825] = 1825 days;
        rewardTokenPercentage[30] = 25;
        rewardTokenPercentage[90] = 50;
        rewardTokenPercentage[180] = 75;
        rewardTokenPercentage[365] = 100;
        rewardTokenPercentage[1095] = 150;
        rewardTokenPercentage[1825] = 200;
        totalHolders = 0;
    }

    // ------------------------------------------------------------------------
    // Owner set the MCRT Contract address calling this function
    // ------------------------------------------------------------------------

    function setMCRT(address _MCRT) external onlyOwner {
        MCRT = _MCRT;
    }

    
    // ------------------------------------------------------------------------
    // Owner set the Point Contract address calling this function
    // ------------------------------------------------------------------------
    
    function setPoints(address _Points) external onlyOwner {
        Points = _Points;
    }
    // ------------------------------------------------------------------------
    // Owner can set the MCRT price and it must be called by owner or API one time at least 
    // @param - _MCRTPrice:  price     eg: if the price is $0.0009, the _MCRTPrice is 9 and the _MCRTDecimals is 4
    // @param - _MCRTDecimals: Decimals of price        eg: $0.0009 = 9 / 10^4
    // ------------------------------------------------------------------------
    

    // function setMCRTPrice(uint256 _MCRTPrice, uint8 _MCRTDecimals) external onlyOwner {
    //     require(_MCRTPrice>0,"Error: Please input the correct price");
    //     require(_MCRTDecimals>=0,"Error: Please input the correct decimals");
    //     MCRTPrice = _MCRTPrice;
    //     MCRTDecimals = _MCRTDecimals;
    // }
    // ------------------------------------------------------------------------
    // Owner can set the point price and it must be called by owner one time at least
    // @param - _PointPrice:  price     eg: if the price is $0.001, the _PointPrice is 1 and the _PointDecimals is 3
    // @param - _PointDecimals: Decimals of price        eg: $0.001 = 1 / 10^3
    // ------------------------------------------------------------------------
    
    // function setPointPrice(uint256 _PointPrice, uint8 _PointDecimals) external onlyOwner {
    //     require(_PointPrice>0,"Error: Please input the correct price");
    //     require(_PointDecimals>=0,"Error: Please input the correct decimals");
    //     PointPrice = _PointPrice;
    //     PointDecimals = _PointDecimals;
    // }
    // ------------------------------------------------------------------------
    // Only owner Sets the APY per period by calling this function
    // ------------------------------------------------------------------------
    
    function setAPYPerPeriod(uint256 period, uint256 apy) external onlyOwner {
        period = verifyperiod(period);
        rewardTokenPercentage[period] = apy;
    }

    // ------------------------------------------------------------------------
    // Only owner Sets the TokemAmountForItemPoint by calling this function
    // ------------------------------------------------------------------------

    function setTokemAmountForItemPoint(uint256 amount) external onlyOwner {
        tokenAmountForItemPoint = amount;
    }

    // ------------------------------------------------------------------------
    // Only owner Sets the TokemAmountForCharacterPoint by calling this function
    // ------------------------------------------------------------------------

    function setTokemAmountForCharacterPoint(uint256 amount) external onlyOwner {
        tokenAmountForCharacterPoint = amount;
    }

    // ------------------------------------------------------------------------
    // Only owner Sets the TokemAmountForLandPoint by calling this function
    // ------------------------------------------------------------------------

    function setTokemAmountForLandPoint(uint256 amount) external onlyOwner {
        tokenAmountForLandPoint = amount;
    }

    // ------------------------------------------------------------------------
    // get the TokemAmountForItemPoint by calling this function
    // ------------------------------------------------------------------------

    function getTokemAmountForItemPoint() external view returns(uint256) {
        return tokenAmountForItemPoint;
    }

    // ------------------------------------------------------------------------
    // Only owner Sets the TokemAmountForCharacterPoint by calling this function
    // ------------------------------------------------------------------------

    function getTokemAmountForCharacterPoint() external view returns(uint256) {
        return tokenAmountForCharacterPoint;
    }

    // ------------------------------------------------------------------------
    // Only owner Sets the TokemAmountForLandPoint by calling this function
    // ------------------------------------------------------------------------

    function getTokemAmountForLandPoint() external view returns(uint256) {
        return tokenAmountForLandPoint;
    }
    // ------------------------------------------------------------------------
    // get the MCRT price calling this function
    // ------------------------------------------------------------------------
    
    // function getMCRTPrice() external  view returns(uint256, uint8) {
    //     return(MCRTPrice, MCRTDecimals);
    // }

    // ------------------------------------------------------------------------
    // get the Point price using the function
    // ------------------------------------------------------------------------

    // function getPointPrice() external view returns(uint256 , uint8)  {
    //     return(PointPrice,PointDecimals);
    // }

    // ------------------------------------------------------------------------
    // privatet function
    // ------------------------------------------------------------------------

    function verifyperiod(uint256 period) private pure returns(uint256){
        if (period <= 30){
            period = 30;
        } else if (period <= 90){
            period = 90;
        } else if (period <= 180) {
            period = 180;
        } else if (period <= 365) {
            period = 365;
        } else if (period <= 1095) {
            period = 1095;
        } else if (period <= 1825) {
            period = 1825;
        }
        return period;
    }

    // ------------------------------------------------------------------------
    // User can stake calling this function
    // @param - user: the address of staker 
    // @param - tokens: the number of tokens to be staked now
    // @param - lockingPeriod: the period of staking 
    // @param - option: 0 APY Reward method, 1 NFT Reward method
    // ------------------------------------------------------------------------
    
    function STAKE(address user,uint256 tokens, uint256 lockingPeriod, uint8 option) external {
        require(tokens > 0, "ERROR: Cannot stake 0 tokens");
        require(user != address(0), "MCRTStake: sending to the zero address");

        lockingPeriod = verifyperiod(lockingPeriod);
        if (stakers[user][lockingPeriod].initialized) {
            require(stakers[user][lockingPeriod].stakingTime + lockingPeriods[lockingPeriod] < block.timestamp,"Error: The staking time is not finished yet!");
            if (option == 0){
                require(stakers[user][lockingPeriod].tokenForPoints == 0,"Error: You are already staking in the NFT Reard Method");
            } else if(option == 1){
                require(stakers[user][lockingPeriod].stakedTokens == 0,"Error: You are already staking in the APY Reward Method");
            }
        }
        if(option == 1){
            require(lockingPeriod>=180,"Error: You can't stake in the NFT reward with 30days and 90days");
        }

        require(IERC20(MCRT).transferFrom(user, address(this), tokens),"Tokens cannot be transferred from user for locking"
        );

        if (option == 0) {
            totalTokensForStaking = totalTokensForStaking.add(tokens);
        } else {
            totalTokensForPoint = totalTokensForPoint.add(tokens); 
        }
        totalAddedTokens = totalAddedTokens.add(tokens);  

        holdersTostake[user] = holdersTostake[user].add(tokens);
       
        
        if (stakers[user][lockingPeriod].initialized){
            _poolUpdate(lockingPeriod);
            if(option == 0) {
                stakers[user][lockingPeriod].stakedTokens = stakers[user][lockingPeriod].stakedTokens.add(tokens);
            } else {
                USER memory User = stakers[user][lockingPeriod];
                User.tokenForPoints = User.tokenForPoints.add(tokens);


                if(lockingPeriod == 180){
                    User.claimAbleRewardItem = User.claimAbleRewardItem.add(
                        tokens.div(
                            tokenAmountForItemPoint
                        )
                    );
                } else if (lockingPeriod == uint256(365)) {
                    User.claimAbleRewardItem = User.claimAbleRewardItem.add(
                        tokens.div(
                            tokenAmountForCharacterPoint
                        )
                    );
                } else if (lockingPeriod == 1095) {
                    User.claimAbleRewardItem = User.claimAbleRewardItem.add(
                        tokens.div(
                            tokenAmountForLandPoint
                        )
                    );
                } else if (lockingPeriod == 1825) {
                    User.claimAbleRewardItem = User.claimAbleRewardItem.add(
                        tokens.div(
                            tokenAmountForLandPoint
                        ).mul(2)
                    );
                }
            }
            stakers[user][lockingPeriod].stakingTime = block.timestamp;
        } else {
            holders[totalHolders] = user;
            totalHolders ++;

            if(option == 0) {
                USER memory newStaking;
                newStaking.initialized = true;
                newStaking.lockingPeriod = lockingPeriod;
                newStaking.stakedTokens = tokens;
                newStaking.rewardTokens = 0;
                newStaking.tokenForPoints = 0;
                newStaking.stakingTime = block.timestamp;
                newStaking.currentTime = block.timestamp;
                newStaking.claimAbaleTokensForPoint = 0;
                newStaking.claimAbaleTokensForStaking = 0;
                newStaking.apr = rewardTokenPercentage[lockingPeriod];
                newStaking.claimAbleRewardItem = 0;
                newStaking.claimAbleRewardToken = 0;
                stakers[user][lockingPeriod] = newStaking;
            } else {
                USER memory newPoint;
                newPoint.initialized = true;
                newPoint.lockingPeriod = lockingPeriod;
                newPoint.stakedTokens = 0;
                newPoint.rewardTokens = 0;
                newPoint.tokenForPoints = tokens;
                newPoint.stakingTime = block.timestamp;
                newPoint.currentTime = block.timestamp;
                newPoint.claimAbaleTokensForPoint = 0;
                newPoint.claimAbaleTokensForStaking = 0;
                newPoint.apr = rewardTokenPercentage[lockingPeriod];
                if(lockingPeriod == 180){
                    newPoint.claimAbleRewardItem = tokens.div(
                            tokenAmountForItemPoint
                        );
                } else if (lockingPeriod == uint256(365)) {
                    newPoint.claimAbleRewardItem = tokens.div(
                            tokenAmountForCharacterPoint
                        );
                } else if (lockingPeriod == 1095) {
                    newPoint.claimAbleRewardItem = tokens.div(
                            tokenAmountForLandPoint
                        );
                } else if (lockingPeriod == 1825) {
                    newPoint.claimAbleRewardItem = tokens.div(
                            tokenAmountForLandPoint
                        ).mul(2);
                }
                newPoint.claimAbleRewardToken = 0;
                stakers[user][lockingPeriod] = newPoint;
            }
        }
        emit STAKED(user, lockingPeriod,tokens, option);
    }

    // ------------------------------------------------------------------------
    // Owners can send the funds to be distributed to stakers using this function
    // @param tokens number of tokens to distribute
    // ------------------------------------------------------------------------
    function ADDFUNDS(uint256 amountForReward) external {
        require(
            IERC20(MCRT).transferFrom(_msgSender(), address(this), amountForReward),
            "MCRTStake: tokens cannot be transferred from funder account"
        );

        totalAmountForReward = amountForReward;
    }

    // ------------------------------------------------------------------------
    // Update the all info of STAKER 
    // @param lockingPeriod 
    // @param option 
    // private function
    // ------------------------------------------------------------------------
    function _poolUpdate(uint256 lockingPeriod) private {
        if (stakers[_msgSender()][lockingPeriod].initialized == true){

            USER memory updateStaking = stakers[_msgSender()][lockingPeriod];
            if(block.timestamp!=updateStaking.stakingTime){
                uint256 tempRewardToken = rewardTokenPercentage[lockingPeriod].mul(
                                            block.timestamp.sub(updateStaking.currentTime) 
                                        ).mul(
                                            updateStaking.stakedTokens    
                                        ).div(
                                            36500
                                        ).div(86400);

                updateStaking.rewardTokens = updateStaking.rewardTokens.add(tempRewardToken);
            }
            if(updateStaking.stakingTime + lockingPeriods[updateStaking.lockingPeriod]<block.timestamp){
                updateStaking.claimAbaleTokensForStaking = updateStaking.stakedTokens;
                updateStaking.claimAbaleTokensForPoint = updateStaking.tokenForPoints ;
                updateStaking.claimAbleRewardToken = updateStaking.claimAbleRewardToken.add(
                    updateStaking.rewardTokens
                    );
            } 
            updateStaking.currentTime  = block.timestamp;        
        }
    }

    // ------------------------------------------------------------------------
    // Get the reward item per period
    // @param - period: the period of staking 
    // ------------------------------------------------------------------------
    function getRewardTotalPointPerperiod(uint256 period) public view returns(uint256,uint256,uint256) { 
        period = verifyperiod(period);
        if(period == 1825){
            return (0,0,stakers[_msgSender()][period].claimAbleRewardItem);
        } else if (period == 1095){
            return (0,0,stakers[_msgSender()][period].claimAbleRewardItem);
        } else if (period == 365){
            return (0,stakers[_msgSender()][period].claimAbleRewardItem,0);
        } else if(period == 180){
            return (stakers[_msgSender()][period].claimAbleRewardItem,0,0);
        } else {
            return (0,0,0);
        }
    }

    // ------------------------------------------------------------------------
    // After cliam the reward token, change the claimableReward token to 0
    // @param - period: the period of staking 
    // private function
    // ------------------------------------------------------------------------
    function clearRewardTokensPerperiod(uint256 period) private {
        period = verifyperiod(period);
        stakers[_msgSender()][period].claimAbleRewardToken = 0;
    }

    // ------------------------------------------------------------------------
    // Stakers can unstake the reward tokens using this function each period option
    // @param - period: the period of staking
    // private fuction
    // ------------------------------------------------------------------------
    function clearRewardPointPerperiod(uint256 period) private {
        period = verifyperiod(period);
        stakers[_msgSender()][period].claimAbleRewardItem = 0;
    }


    // ------------------------------------------------------------------------
    // Stakers can unstake the reward tokens using this function each period option
    // @param  - period: the period of staking
    // @param  - option 0: APY Reward   1: NFT Reward
    // ------------------------------------------------------------------------
    function ClaimRewardPerperiod(uint8 option, uint256 period) external {
        period = verifyperiod(period);
        _poolUpdate(period);
 
        if(option == 0){
            uint256 claimRewardTokens = stakers[_msgSender()][period].claimAbleRewardToken;
            require(claimRewardTokens > 0,"Error: There aren't reward tokens to be claimed or time limit");
            require(IERC20(MCRT).transfer(_msgSender(), claimRewardTokens),"MCRTStake: error in claiming tokens");
            totalAmountForReward = totalAmountForReward.sub(
                claimRewardTokens
            );
            clearRewardTokensPerperiod(period);
            emit CLAIMEDREWARD(_msgSender(), claimRewardTokens, 0,0,0);

        } else {
            uint256 totalRewardItemPoint;
            uint256 totalRewardCharacterPoint;
            uint256 totalRewardLandPoint;
            (totalRewardItemPoint, totalRewardCharacterPoint, totalRewardLandPoint) = getRewardTotalPointPerperiod(period);
            if(period == 180){
                require(totalRewardItemPoint>0, "Error: There isn't Item Point to be claimed");
            } else if (period == 365) {
                require(totalRewardCharacterPoint>0, "Error: There isn't Character Point to be claimed");
            } else if (period == 1095) {
                require(totalRewardLandPoint>0, "Error: There isn't Land Point to be claimed");
            } else if (period == 1825) {
                require(totalRewardLandPoint>0, "Error: There isn't Land Point to be claimed");
            }
            require(IPoints(Points).transferFrom(owner, _msgSender(), totalRewardItemPoint, totalRewardCharacterPoint, totalRewardLandPoint), "MCRTStake: error in claiming points");
            clearRewardPointPerperiod(period);
            emit CLAIMEDREWARD(_msgSender(), 0, totalRewardItemPoint,totalRewardCharacterPoint,totalRewardLandPoint);

        }

    }

    // ------------------------------------------------------------------------
    // Stakers can unstake the staked tokens using this function each period option
    // @param  - lockingPeriod: lockingPeriod  the period of staking
    // @param  - option 0: APY Reward   1: NFT Reward
    // ------------------------------------------------------------------------
    function WithdrawForStakingPerPeriod(uint256 lockingPeriod, uint8 option) external {
        
        lockingPeriod = verifyperiod(lockingPeriod);
        _poolUpdate(lockingPeriod);
        if (option == 0){
            uint256 withdrawTokens = stakers[_msgSender()][lockingPeriod].claimAbaleTokensForStaking;
            require(withdrawTokens>0,"Error: there aren't withdrawable tokens or they aren't limited to staking time");
            require(IERC20(MCRT).transfer(_msgSender(),withdrawTokens),"MCRTStake: Error in un-staking tokens");
            holdersTostake[_msgSender()] = holdersTostake[_msgSender()].sub(withdrawTokens);
            stakers[_msgSender()][lockingPeriod].stakedTokens = stakers[_msgSender()][lockingPeriod].stakedTokens.sub(
                    stakers[_msgSender()][lockingPeriod].claimAbaleTokensForStaking
                    );
            totalTokensForStaking = totalTokensForStaking.sub(
                    stakers[_msgSender()][lockingPeriod].claimAbaleTokensForStaking
                    );
 
            stakers[_msgSender()][lockingPeriod].claimAbaleTokensForStaking = 0;
            stakers[_msgSender()][lockingPeriod].claimAbleRewardToken = stakers[_msgSender()][lockingPeriod].claimAbleRewardToken.add(
                            stakers[_msgSender()][lockingPeriod].rewardTokens
                            );
            emit UNSTAKED(_msgSender(), lockingPeriod,withdrawTokens);

        } else {
            uint256 withdrawTokens = stakers[_msgSender()][lockingPeriod].claimAbaleTokensForPoint;
            require(withdrawTokens>0,"Error: there aren't withdrawable tokens or they aren't limited to staking time");
            require(IERC20(MCRT).transfer(_msgSender(),withdrawTokens),"MCRTStake: Error in un-staking tokens");
            holdersTostake[_msgSender()] = holdersTostake[_msgSender()].sub(withdrawTokens);
            stakers[_msgSender()][lockingPeriod].tokenForPoints = stakers[_msgSender()][lockingPeriod].tokenForPoints.sub(
                    stakers[_msgSender()][lockingPeriod].claimAbaleTokensForPoint
                    );
            totalTokensForPoint = totalTokensForPoint.sub(
                    stakers[_msgSender()][lockingPeriod].claimAbaleTokensForPoint
                    );
            stakers[_msgSender()][lockingPeriod].claimAbaleTokensForPoint = 0;
            emit UNSTAKED(_msgSender(), lockingPeriod,withdrawTokens);
        }

    }
    // ------------------------------------------------------------------------
    // Get the number of APY  each periodtokens, tokens staked by a staker each period, total tokens staked by me each period, staking time and current reward
    // @param - user: the address of the staker
    // @param - lockingPeriod:  the period of staking
    // @param - option 0: APY Reward   1: NFT Reward
    // ------------------------------------------------------------------------
    function yourStakedMCRT(address user,uint256 lockingPeriod,uint8 option)
        public
        view
        returns (uint256,uint256,uint256,uint256,uint256)
    {
        USER memory userinfo = stakers[user][lockingPeriod];
        uint256 stakedMCRTOption = userinfo.stakedTokens;
        uint256 startTime = userinfo.stakingTime;
        uint256 currentTime = userinfo.currentTime;

        if (userinfo.stakingTime == 0){
            startTime = 0;
            currentTime = 0;
        }
        uint256 apy = rewardTokenPercentage[lockingPeriod];
        uint256 currentreward = userinfo.claimAbleRewardToken;
        currentreward = currentreward.add(
                userinfo.rewardTokens
            );

        if (option == 1){
            stakedMCRTOption = userinfo.tokenForPoints;
            currentreward = userinfo.claimAbleRewardItem;
        }   
        return (apy,
                stakedMCRTOption,
                currentTime,
                currentreward,
                startTime);
    }

    // ------------------------------------------------------------------------
    // reset the USER info
    // ------------------------------------------------------------------------
    function emergencySaveLostTokensForUser() external  {
        uint256[6] memory lockingPeriod = [uint256(30),uint256(90),uint256(180), uint256(365), uint256(1095), uint256(1825)];
        uint256 totalTokenForStaker = 0;
        for (uint i = 0; i< 6;i++){
            if(stakers[_msgSender()][lockingPeriod[i]].initialized){
                totalTokenForStaker = totalTokenForStaker.add(
                    stakers[_msgSender()][lockingPeriod[i]].stakedTokens
                    );
                stakers[_msgSender()][lockingPeriod[i]].stakedTokens = 0;
                stakers[_msgSender()][lockingPeriod[i]].claimAbleRewardToken = 0;
                stakers[_msgSender()][lockingPeriod[i]].claimAbaleTokensForStaking = 0;
                totalTokenForStaker = totalTokenForStaker.add(
                    stakers[_msgSender()][lockingPeriod[i]].tokenForPoints
                );
                stakers[_msgSender()][lockingPeriod[i]].rewardTokens = 0;
                stakers[_msgSender()][lockingPeriod[i]].tokenForPoints = 0;
                stakers[_msgSender()][lockingPeriod[i]].claimAbaleTokensForPoint = 0;
                stakers[_msgSender()][lockingPeriod[i]].claimAbleRewardItem = 0;
                stakers[_msgSender()][lockingPeriod[i]].rewardItem = 0;
                stakers[_msgSender()][lockingPeriod[i]].initialized = false;
                stakers[_msgSender()][lockingPeriod[i]].stakingTime = 0;
                stakers[_msgSender()][lockingPeriod[i]].currentTime = 0;
                stakers[_msgSender()][lockingPeriod[i]].lockingPeriod = 0;
                stakers[_msgSender()][lockingPeriod[i]].apr = 0;
            }
        }
        require(
            IERC20(MCRT).transfer(
                _msgSender(),
                totalTokenForStaker
            ),
            "MCRTStake: Error in retrieving tokens"
        );
    }
    function emergencySaveLostTokens() external onlyOwner {
        require(totalAmountForReward>0,"Error: There aren't reward tokens for owner!");
        require(
            IERC20(MCRT).transfer(
                owner,
                totalAmountForReward
            ),
            "MCRTStake: Error in retrieving tokens"
        );
    }
}
