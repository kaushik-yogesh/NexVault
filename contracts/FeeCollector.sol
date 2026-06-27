// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title FeeCollector
 * @dev Wraps DEX interactions to deduct a configurable platform fee natively on-chain.
 */

interface IERC20 {
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    function transfer(address recipient, uint256 amount) external returns (bool);
    function approve(address spender, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

contract FeeCollector {
    address public owner;
    
    // Fee denominator is 10,000 (e.g., 50 = 0.5%)
    uint256 public constant FEE_DENOMINATOR = 10000;

    event FeeCollected(address indexed token, address indexed treasury, uint256 amount);
    event SwapExecuted(address indexed user, address indexed dexRouter, uint256 netAmount);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not authorized");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    // Allow contract to receive ETH
    receive() external payable {}

    /**
     * @dev Swap native ETH, taking a fee before routing.
     * @param treasury The address to send the fee to.
     * @param feeBps The fee in basis points (e.g., 50 for 0.5%).
     * @param dexRouter The DEX router address to forward the call to.
     * @param swapCalldata The raw calldata to execute on the dexRouter.
     */
    function swapNativeWithFee(
        address treasury,
        uint256 feeBps,
        address dexRouter,
        bytes calldata swapCalldata
    ) external payable {
        require(feeBps < FEE_DENOMINATOR, "Fee too high");
        require(msg.value > 0, "No ETH sent");

        uint256 feeAmount = (msg.value * feeBps) / FEE_DENOMINATOR;
        uint256 netAmount = msg.value - feeAmount;

        // Transfer fee to treasury
        if (feeAmount > 0) {
            (bool feeSuccess, ) = treasury.call{value: feeAmount}("");
            require(feeSuccess, "Fee transfer failed");
            emit FeeCollected(address(0), treasury, feeAmount);
        }

        // Forward to DEX Router
        (bool swapSuccess, ) = dexRouter.call{value: netAmount}(swapCalldata);
        require(swapSuccess, "DEX swap failed");

        emit SwapExecuted(msg.sender, dexRouter, netAmount);

        // Refund any unspent ETH to user
        uint256 remainingEth = address(this).balance;
        if (remainingEth > 0) {
            (bool refundSuccess, ) = msg.sender.call{value: remainingEth}("");
            require(refundSuccess, "Refund failed");
        }
    }

    /**
     * @dev Swap ERC20 tokens, taking a fee before routing.
     * @param tokenIn The address of the ERC20 token being sold.
     * @param amountIn The amount of tokenIn to sell.
     * @param treasury The address to send the fee to.
     * @param feeBps The fee in basis points (e.g., 50 for 0.5%).
     * @param dexRouter The DEX router address to forward the call to.
     * @param swapCalldata The raw calldata to execute on the dexRouter.
     */
    function swapERC20WithFee(
        address tokenIn,
        uint256 amountIn,
        address treasury,
        uint256 feeBps,
        address dexRouter,
        bytes calldata swapCalldata
    ) external {
        require(feeBps < FEE_DENOMINATOR, "Fee too high");
        require(amountIn > 0, "Amount must be > 0");

        IERC20 token = IERC20(tokenIn);

        // Pull tokens from user
        require(token.transferFrom(msg.sender, address(this), amountIn), "TransferFrom failed");

        uint256 feeAmount = (amountIn * feeBps) / FEE_DENOMINATOR;
        uint256 netAmount = amountIn - feeAmount;

        // Transfer fee to treasury
        if (feeAmount > 0) {
            require(token.transfer(treasury, feeAmount), "Fee transfer failed");
            emit FeeCollected(tokenIn, treasury, feeAmount);
        }

        // Approve DEX router to spend netAmount
        require(token.approve(dexRouter, netAmount), "Approve failed");

        // Forward to DEX Router
        (bool swapSuccess, ) = dexRouter.call(swapCalldata);
        require(swapSuccess, "DEX swap failed");

        emit SwapExecuted(msg.sender, dexRouter, netAmount);

        // Reset approval (just in case)
        token.approve(dexRouter, 0);

        // Refund any unspent tokenIn to user
        uint256 remainingTokens = token.balanceOf(address(this));
        if (remainingTokens > 0) {
            require(token.transfer(msg.sender, remainingTokens), "Refund failed");
        }
    }
}
