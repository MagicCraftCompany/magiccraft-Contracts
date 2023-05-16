// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

/**
 * @title GameWallet
 * @dev A contract for managing participants' token balances and distributing prizes.
 */
contract GameWallet is OwnableUpgradeable {
    using SafeERC20Upgradeable for IERC20Upgradeable;

    // Address of prize token
    IERC20Upgradeable public prizeToken;

    // Mapping for users balance
    mapping(address => uint256) public pBalance;

    // @deprecated
    mapping(address => bool) public locked;

    uint256[50] private __gap;

    // prize fee in basis points (bps), representing a fraction of 10,000
    // For example, a prizeFee of 200 means 200 basis points or 2% of the total prize amount
    uint256 public prizeFee;

    // treasury address
    address public treasury;

    // prize fond wallet address
    address public prizeFondWallet;

    // Lock duration in seconds
    uint256 public lockDuration;

    // Mapping for withdraw lock
    mapping(address => uint256) public lockUntil;

    // Participant struct
    struct Participant {
        address account;
        uint256 winningPerMille;
        bool isWinner;
        address stakeholderAccount;
        uint256 stakeholderFeePermille;
    }

    event Deposited(address indexed account, uint256 amount);
    event Withdrawn(address indexed account, uint256 amount);
    event Deducted(address indexed account, uint256 amount);
    event WonPrize(address indexed account, uint256 amount);
    event StakeHolderFeeSent(address indexed account, address indexed forAccount, uint256 amount);
    event PrizeFeeSent(address indexed account, uint256 amount);

    /**
    @param tokenAddress_ the token address for prize
     */
    function initialize(address tokenAddress_) external initializer {
        require(tokenAddress_ != address(0), "Invalid token address");
        __Ownable_init();

        prizeToken = IERC20Upgradeable(tokenAddress_);
    }

    /**
    @dev Allows deposit or withdraw of tokens.
    @param _deposit If true, deposit tokens; otherwise, withdraw tokens.
    @param _amount Amount of tokens to deposit or withdraw.
     */
    function manageBalance(bool _deposit, uint256 _amount) external {
        if (_deposit) {
            prizeToken.safeTransferFrom(msg.sender, address(this), _amount);
            pBalance[msg.sender] += _amount;
            emit Deposited(msg.sender, _amount);
        } else {
            require(pBalance[msg.sender] >= _amount, "Not enough token deposited");
            require(block.timestamp >= lockUntil[msg.sender], "Account locked for withdraw");

            pBalance[msg.sender] -= _amount;
            prizeToken.safeTransfer(msg.sender, _amount);

            emit Withdrawn(msg.sender, _amount);
        }
    }

    ///////////////////////
    /// Owner Functions ///
    ///////////////////////

    /**
    @dev Allows the owner to deposit balance to multiple specified wallets from prizeFondWallet's balance.
    @param _recipients The array of recipient addresses.
    @param _amounts The array of amounts of tokens to be transferred to each corresponding recipient.
    */
    function ownerDeposit(
        address[] calldata _recipients,
        uint256[] calldata _amounts
    ) external onlyOwner {
        require(
            _recipients.length != 0 && _recipients.length == _amounts.length,
            "Invalid recipients or amounts array"
        );

        uint256 totalAmount = 0;
        for (uint256 i = 0; i < _recipients.length; i++) {
            address recipient = _recipients[i];
            uint256 amount = _amounts[i];

            require(recipient != address(0), "Invalid recipient address");
            totalAmount += amount;

            pBalance[recipient] += amount;
            emit Deposited(recipient, amount);
        }

        require(
            pBalance[prizeFondWallet] >= totalAmount,
            "Not enough balance in prize fond wallet"
        );
        pBalance[prizeFondWallet] -= totalAmount;
    }

    /**
    @dev Distributes prizes to winners based on their winning per mille.
    @param _participants Array of participants.
    @param _prizePoolAmount Prize pool amount.
    @param _distributeFromPrizeFondWallet If true, distribute prize from the prizeFondWallet; otherwise, distribute from entry fees.
    */
    function winPrize(
        Participant[] calldata _participants,
        uint256 _prizePoolAmount,
        bool _distributeFromPrizeFondWallet
    ) external onlyOwner {
        uint256 len = _participants.length;
        require(len != 0, "Invalid participants array");

        uint256 sum;
        uint256 i;

        if (!_distributeFromPrizeFondWallet) {
            uint256 participantEntryFee = _prizePoolAmount / len;

            // Process participants and collect entry fees
            for (i; i < len; ) {
                address participantAccount = _participants[i].account;
                bool isWinner = _participants[i].isWinner;

                if (!isWinner) {
                    require(
                        pBalance[participantAccount] >= participantEntryFee,
                        "Not enough balance deposited"
                    );

                    pBalance[participantAccount] -= participantEntryFee;
                    sum += participantEntryFee;
                    emit Deducted(participantAccount, participantEntryFee);
                }

                unchecked {
                    ++i;
                }
            }
        } else {
            require(
                pBalance[prizeFondWallet] >= _prizePoolAmount,
                "Not enough balance in prize fond wallet"
            );
            sum = _prizePoolAmount;
            pBalance[prizeFondWallet] -= _prizePoolAmount;
        }

        // Check if total winning per mille is 1000
        uint256 totalWinningPerMille;
        for (i = 0; i < len; ) {
            if (_participants[i].isWinner) {
                totalWinningPerMille += _participants[i].winningPerMille;
            }
            unchecked {
                ++i;
            }
        }
        require(totalWinningPerMille == 1000, "Total winning per mille must be 1000");

        // sent royalty to tresury
        uint256 treasuryFee = (sum * prizeFee) / 1e4;
        if (treasuryFee != 0 && treasury != address(0)) {
            // Distribute stakeholders fees
            for (i = 0; i < len; ) {
                Participant memory participant = _participants[i];
                if (participant.isWinner) {
                    if (
                        participant.stakeholderAccount != address(0) &&
                        participant.stakeholderFeePermille > 0
                    ) {
                        require(
                            participant.account != participant.stakeholderAccount,
                            "account and stakeholder can not be equal"
                        );
                        require(
                            participant.stakeholderFeePermille <= 500,
                            "Maximum stakeholder fee is 50%"
                        );
                        uint256 stakeholderFee = (((treasuryFee * participant.winningPerMille) /
                            1000) * participant.stakeholderFeePermille) / 1000;
                        if (stakeholderFee > treasuryFee) {
                            break;
                        }
                        treasuryFee -= stakeholderFee;
                        pBalance[participant.stakeholderAccount] += stakeholderFee;
                        emit StakeHolderFeeSent(
                            participant.stakeholderAccount,
                            participant.account,
                            stakeholderFee
                        );
                    }
                }
                unchecked {
                    ++i;
                }
            }

            pBalance[treasury] += treasuryFee;
            emit PrizeFeeSent(treasury, treasuryFee);
            sum -= treasuryFee;
        }

        // Distribute prizes based on winning per mille
        for (i = 0; i < len; ) {
            Participant memory participant = _participants[i];
            if (participant.isWinner) {
                address winnerAccount = participant.account;
                uint256 winnerPerMille = participant.winningPerMille;

                uint256 prizeAmount = (sum * winnerPerMille) / 1000;
                pBalance[winnerAccount] += prizeAmount;
                emit WonPrize(winnerAccount, prizeAmount);
            }

            unchecked {
                ++i;
            }
        }
    }

    /**
    @dev Locks the accounts for a specified duration.
    @param _accounts Array of accounts to lock.
     */
    function lockAccounts(address[] calldata _accounts) external onlyOwner {
        require(_accounts.length != 0, "Invalid array length");

        uint256 len = _accounts.length;
        for (uint256 i; i < len; ) {
            if (lockUntil[_accounts[i]] != type(uint256).max)
                lockUntil[_accounts[i]] = block.timestamp + lockDuration;

            unchecked {
                ++i;
            }
        }
    }

    /**
    @dev Locks the accounts indefinitely.
    @param _accounts Array of accounts to lock.
     */
    function lockAccountsIndefinitely(address[] calldata _accounts) external onlyOwner {
        require(_accounts.length != 0, "Invalid array length");

        uint256 len = _accounts.length;
        for (uint256 i; i < len; ) {
            lockUntil[_accounts[i]] = type(uint256).max;

            unchecked {
                ++i;
            }
        }
    }

    /**
    @dev unlock the indefinitely locked accounts.
    @param _accounts Array of accounts to unlock.
     */
    function unlockAccountsIndefinitely(address[] calldata _accounts) external onlyOwner {
        require(_accounts.length != 0, "Invalid array length");

        uint256 len = _accounts.length;
        for (uint256 i; i < len; ) {
            if (lockUntil[_accounts[i]] == type(uint256).max)
                lockUntil[_accounts[i]] = block.timestamp;

            unchecked {
                ++i;
            }
        }
    }

    /**
    @dev Sets the treasury address.
    @param _treasury Treasury address.
     */
    function setTreasury(address _treasury) external onlyOwner {
        require(_treasury != address(0), "Invalid treasury address");
        treasury = _treasury;
    }

    /**
    @dev Sets the prize fond wallet address.
    @param _prizeFondWallet Prize fond wallet address.
     */
    function setPrizeFondWallet(address _prizeFondWallet) external onlyOwner {
        require(_prizeFondWallet != address(0), "Invalid prize fond wallet address");
        prizeFondWallet = _prizeFondWallet;
    }

    /**
    @dev Sets the prize fee.
    @param _prizeFee Prize fee value (must be less than or equal to 2000 -> 20%).
     */
    function setPrizeFee(uint256 _prizeFee) external onlyOwner {
        require(_prizeFee <= 2e3, "Invalid prize fee value");
        prizeFee = _prizeFee;
    }

    /**
    @dev Sets the lock duration.
    @param _lockDuration Lock duration in seconds.
     */
    function setLockDuration(uint256 _lockDuration) external onlyOwner {
        lockDuration = _lockDuration;
    }
}
