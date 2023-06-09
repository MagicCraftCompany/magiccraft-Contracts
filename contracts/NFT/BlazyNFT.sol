//SPDX-License-Identifier: None
pragma solidity ^0.8.7;

import "./MagicNFT.sol";

contract BlazyNFT is
    MagicNFT
{
    function initialize (
        string memory name_,
        string memory symbol_,
        uint256 maxSupply_,
        address treasure_,
        address designatedSigner_
    ) public override initializer {
        super.initialize(name_, symbol_, maxSupply_, treasure_, designatedSigner_);
    }
}
