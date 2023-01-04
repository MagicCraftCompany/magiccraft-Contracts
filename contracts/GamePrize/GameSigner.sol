//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.7;

import "@openzeppelin/contracts-upgradeable/utils/cryptography/draft-EIP712Upgradeable.sol";

contract GameSigner is EIP712Upgradeable {
    string private constant SIGNING_DOMAIN = "MagicCraft Game";
    string private constant SIGNATURE_VERSION = "1";

    struct GameEntry {
        address userAddress;
        bytes signature;
    }

    function __GameSigner_init() internal onlyInitializing {
        __EIP712_init(SIGNING_DOMAIN, SIGNATURE_VERSION);
    }

    function getSigner(GameEntry memory gameEntry) public view returns (address) {
        return _verify(gameEntry);
    }

    /// @notice Returns a hash of the given rarity, prepared using EIP712 typed data hashing rules.

    function _hash(GameEntry memory gameEntry) internal view returns (bytes32) {
        return
            _hashTypedDataV4(
                keccak256(
                    abi.encode(keccak256("GameEntry(address userAddress)"), gameEntry.userAddress)
                )
            );
    }

    function _verify(GameEntry memory gameEntry) internal view returns (address) {
        bytes32 digest = _hash(gameEntry);
        return ECDSAUpgradeable.recover(digest, gameEntry.signature);
    }

    function getChainID() external view returns (uint256) {
        uint256 id;

        assembly {
            id := chainid()
        }

        return id;
    }
}
