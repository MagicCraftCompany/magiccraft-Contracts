// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.7.4;

interface IPoints {
    /**
     * @dev Emitted when item points of `_itemPoints`, character points of
     * `_characterPoints` and land points of `_landPoints` are moved from
     * one account (`from`) to another (`to`).
     */
    event TransferPoints(
        address indexed from,
        address indexed to,
        uint256 _itemPoints,
        uint256 _characterPoints,
        uint256 _landPoints
    );

    /**
     * @dev Emitted when the allowance of a `spender` for an `owner` is set
     * by a call to {approvePoints}. The item points of `_itemPoints`, character
     * points of `_characterPoints` and land points of `_landPoints` are the
     * new allowance.
     */
    event ApprovalPoints(
        address indexed owner,
        address indexed spender,
        uint256 _itemPoints,
        uint256 _characterPoints,
        uint256 _landPoints
    );

    /**
     * @dev Return total points.
     */
    function totalPoints() external view returns (uint256[3] memory);

    /**
     * @dev Return total points of account.
     */
    function pointsOf(address account) external view returns (uint256[3] memory);

    /**
     * @dev Transfer item points of `_itemPoints`, character points of `_characterPoints`
     * and land points of `_landPoints` from one account (`owner`) to another account (`to`).
     *
     * Requirements:
     *
     * - `to` cannot be the zero address.
     * - the caller must have at least item points of `_itemPoints`, character points of
     *  `_characterPoints` and land points of `_landPoints`.
     */
    function transferPoints(
        address to,
        uint256 _itemPoints,
        uint256 _characterPoints,
        uint256 _landPoints
    ) external returns (bool);

    /**
     * @dev Returns the remaining number of item points, character points and land
     * points that `spender` will be allowed to spend on behalf of `owner` through
     * {transferFrom}. This is zero by default.
     *
     * This value changes when {approvePoints} or {transferFrom} are called.
     */
    function allowancePoints(
        address owner,
        address spender
    ) external view returns (uint256[3] memory);

    /**
     * @dev Sets item points of `_itemPoints`, character points of `_characterPoints`
     * and land points of `_landPoints` as the allowance of `spender` over the caller's points.
     *
     * Returns a boolean value indicating whether the operation succeeded.
     *
     * Emits an {ApprovalPoints} event.
     */
    function approvePoints(
        address spender,
        uint256 _itemPoints,
        uint256 _characterPoints,
        uint256 _landPoints
    ) external returns (bool);

    /**
     * @dev Moves `_itemPoints`, `_characterPoints` and `_landPoints` from `from` to `to`
     * using the allowance mechanism. `_itemPoints`, `_characterPoints` and `_landPoints`
     * is then deducted from the caller's allowance.
     *
     * Returns a boolean value indicating whether the operation succeeded.
     *
     * Emits a {TransferPoints} event.
     */
    function transferFrom(
        address from,
        address to,
        uint256 _itemPoints,
        uint256 _characterPoints,
        uint256 _landPoints
    ) external returns (bool);

    /** @dev Creates `_itemPoints`, `_characterPoints` and `_landPoints`, and assigns
     * them to `account`, increasing the total points.
     *
     * Emits a {TransferPoints} event with `from` set to the zero address.
     *
     * Requirements:
     *
     * - `account` cannot be the zero address.
     */
    function mintPoints(
        address account,
        uint256 _itemPoints,
        uint256 _characterPoints,
        uint256 _landPoints
    ) external;

    /**
     * @dev Destroys `_itemPoints`, `_characterPoints` and `_landPoints` from `account`,
     * reducing the total points.
     *
     * Emits a {TransferPoints} event with `to` set to the zero address.
     *
     * Requirements:
     *
     * - `account` cannot be the zero address.
     * - `account` must have at least item points of `_itemPoints`, character points
     * of `_characterPoints` and land points of `_landPoints`.
     */
    function burnPoints(
        address account,
        uint256 _itemPoints,
        uint256 _characterPoints,
        uint256 _landPoints
    ) external;
}
