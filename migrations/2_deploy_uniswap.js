const UniTokenSwap = artifacts.require("./UniTokenSwap");

module.exports = async function(deployer, network) {
    console.log("network", network);
    console.log("envs", process.env);
    console.log("ethswap address", process.env.ETHSWAP);
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
