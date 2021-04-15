const UniTokenSwap = artifacts.require("./UniTokenSwap");

module.exports = async function(deployer, network) {
    console.log("network", network);
    console.log("issuance address", process.env.ISSUANCE);
    const issuanceAddress = process.env.ISSUANCE;
    const uniswapFactoryAddress = process.env.UNISWAP_FACTORY;
    const minerAddress = process.env.MINER;

    await deployer.deploy(
        UniTokenSwap,
        issuanceAddress,
        uniswapFactoryAddress,
        minerAddress
    );
}
