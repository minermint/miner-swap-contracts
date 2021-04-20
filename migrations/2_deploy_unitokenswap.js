const UniTokenSwap = artifacts.require("UniTokenSwap");

module.exports = async function(deployer) {
    const ethSwapAddress = process.env.ETHSWAP;
    const uniswapFactoryAddress = process.env.UNISWAP_FACTORY;
    const minerAddress = process.env.MINER;

    await deployer.deploy(
        UniTokenSwap,
        ethSwapAddress,
        uniswapFactoryAddress,
        minerAddress
    );
}
