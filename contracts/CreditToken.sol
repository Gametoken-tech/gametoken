// SPDX-License-Identifier: MIT
pragma solidity ^0.8.3;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract CreditToken is ERC20, Ownable {
    event ExcludedFromFee(address indexed account);
    event IncludedForFee(address indexed account);
    event TransferFeeRateUpdated(uint256 transferFeeRate);
    event TreasuryUpdated(address indexed treasury);

    uint256 constant DENOMINATOR = 10000;
    uint256 public transferFeeRate;
    address public treasury;
    mapping(address => bool) public excludedFromFee;

    constructor(address _treasury, uint256 _transferFeeRate)
        ERC20("CreditToken", "CREDIT")
    {
        require(_treasury != address(0), "CREDITTOKEN: treasury cannot be zero");
        require(
            _transferFeeRate <= DENOMINATOR,
            "CREDITTOKEN: transfer fee rate can not be greater than 100%"
        );
        treasury = _treasury;
        transferFeeRate = _transferFeeRate;
        emit TransferFeeRateUpdated(transferFeeRate);

        _mint(msg.sender, 1e18 * 1e18);
    }

    function excludeFromFee(address _account) external onlyOwner {
        require(!excludedFromFee[_account], "CREDITTOKEN: already excluded");
        excludedFromFee[_account] = true;

        emit ExcludedFromFee(_account);
    }

    function includeForFee(address _account) external onlyOwner {
        require(excludedFromFee[_account], "CREDITTOKEN: not excluded");
        excludedFromFee[_account] = false;

        emit IncludedForFee(_account);
    }

    function setTransferFeeRate(uint256 _transferFeeRate) external onlyOwner {
        require(
            _transferFeeRate <= DENOMINATOR,
            "CREDITTOKEN: transfer fee rate can not be greater than 100%"
        );
        transferFeeRate = _transferFeeRate;

        emit TransferFeeRateUpdated(transferFeeRate);
    }

    function setTreasury(address _treasury) external onlyOwner {
        require(_treasury != address(0), "CREDITTOKEN: treasury cannot be zero");
        treasury = _treasury;

        emit TreasuryUpdated(treasury);
    }

    function _transfer(
        address sender,
        address recipient,
        uint256 amount
    ) internal override {
        uint256 transferFee = excludedFromFee[sender] ||
            excludedFromFee[recipient]
            ? 0
            : (amount * transferFeeRate) / DENOMINATOR;
        if (transferFee > 0) {
            super._transfer(sender, treasury, transferFee);
        }
        super._transfer(sender, recipient, amount - transferFee);
    }
}
