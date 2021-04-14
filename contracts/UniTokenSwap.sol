// SPDX-License-Identifier: GPL-3.0-only

pragma solidity >=0.6.2 <0.8.0;

import "@uniswap/v2-periphery/contracts/libraries/UniswapV2Library.sol";
import "@uniswap/v2-core/contracts/interfaces/IUniswapV2Pair.sol";
import "@uniswap/v2-core/contracts/interfaces/IUniswapV2ERC20.sol";
import "@uniswap/v2-periphery/contracts/UniswapV2Router02.sol";

import "./IEthSwap.sol";

contract UniTokenSwap {
    using SafeMath for uint256;

    address public ethSwapAddress;
    address public uniswapFactoryAddress;
    address public minerAddress;

    constructor(address ethSwapAddress_, address uniswapFactoryAddress_, address minerAddress_) public {
        ethSwapAddress = ethSwapAddress_;
        uniswapFactoryAddress = uniswapFactoryAddress_;
        minerAddress = minerAddress_;
    }

    function convert(address token, uint256 amount, uint256 minerMin) public {
        IEthSwap ethSwap = IEthSwap(ethSwapAddress);

        IUniswapV2ERC20 erc20 = IUniswapV2ERC20(token);

        erc20.transferFrom(msg.sender, address(this), amount);

        erc20.approve(uniswapFactoryAddress, amount);

        IUniswapV2Router02 router = IUniswapV2Router02(uniswapFactoryAddress);

        address[] memory path = new address[](2);
        path[0] = address(erc20);
        path[1] = router.WETH();
        uint256 etherMin = getTokenToEth(token, amount);

        require(ethSwap.getConversionAmount(etherMin) >= minerMin, "UniTokenSwap/miner-min-not-met");

        router.swapExactTokensForETH(amount, etherMin, path, address(this), block.timestamp);

        ethSwap.convert{value: address(this).balance}(minerMin);

        IUniswapV2ERC20 miner = IUniswapV2ERC20(minerAddress);
        miner.transfer(msg.sender, miner.balanceOf(address(this)));
    }

    receive() external payable {

    }

    function getTokenToEth(address token, uint256 amount) public view returns (uint256) {
        IUniswapV2Router02 router = IUniswapV2Router02(uniswapFactoryAddress);
        IUniswapV2ERC20 erc20 = IUniswapV2ERC20(token);

        address[] memory path = new address[](2);
        path[0] = address(erc20);
        path[1] = router.WETH();

        return router.getAmountsOut(amount, path)[path.length - 1];
    }

    function getEthToToken(address token, uint256 amount) public view returns (uint256) {
        IUniswapV2Router02 router = IUniswapV2Router02(uniswapFactoryAddress);
        IUniswapV2ERC20 erc20 = IUniswapV2ERC20(token);

        address[] memory path = new address[](2);
        path[0] = router.WETH();
        path[1] = address(erc20);

        return router.getAmountsOut(amount, path)[path.length - 1];
    }

    function getTokenToMiner(address token, uint256 amount) public view returns (uint256) {
        uint256 tokenToEth = getTokenToEth(token, amount);
        IEthSwap ethSwap = IEthSwap(ethSwapAddress);

        return ethSwap.getConversionAmount(tokenToEth);
    }

    function getConversionRate(address token) external view returns (uint256) {
        IEthSwap ethSwap = IEthSwap(ethSwapAddress);

        uint256 ethPricePerMiner = ethSwap.getConversionRate();
        uint256 tokenPricePerMiner = getEthToToken(token, ethPricePerMiner);

        // latest per miner price * by 18 dp, divide by latest price per eth.
        return tokenPricePerMiner;
    }

    function getConversionAmount(address token, uint256 amount) external view returns (uint256) {
        return getTokenToMiner(token, amount);
    }
}
