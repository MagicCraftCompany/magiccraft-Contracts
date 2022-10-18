// SPDX-License-Identifier: MIT
// OpenZeppelin Contracts (last updated v4.5.0) (token/ERC20/ERC20.sol)

pragma solidity 0.8.0;
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title JCGToken
 */
contract JCGToken is Ownable, ERC20 {
    uint8 _decimals = 9;

    uint256 public MAX_SUPPLY = 1000000000 * 10**9;

    mapping(address => bool) public isMinter;

    constructor() ERC20("Crypto Guru", "JCG") {}

    modifier onlyMinter() {
        require(isMinter[msg.sender], "Invalid minter");
        _;
    }

    function decimals() public view virtual override returns (uint8) {
        return _decimals;
    }

    function mint(address _account, uint256 _amount) external onlyMinter {
        require(totalSupply() + _amount <= MAX_SUPPLY, "Token amount overflowed");
        _mint(_account, _amount);
    }

    function setMinter(address _account, bool _isMinter) external onlyOwner {
        isMinter[_account] = _isMinter;
    }
}
