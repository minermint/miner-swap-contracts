const { BN, constants, expectEvent, expectRevert } = require("@openzeppelin/test-helpers");
const { expect } = require("chai");
const { ZERO_ADDRESS, MAX_UINT256 } = constants;

const TruffleContract = require("@truffle/contract");
const UniTokenSwap = artifacts.require("UniTokenSwap");
const ERC20Metadata = require("@uniswap/v2-core/build/ERC20.json");

const Web3 = require("web3");

contract("UniTokenSwap", (accounts) => {

    const OWNER = accounts[0];
    const MINTER = accounts[1];

    const ALICE = accounts[3];
    const BOB = accounts[4];

    const ZERO_BALANCE = new BN(0);

    const ethSwapAddress = process.env.ETHSWAP;
    const uniswapFactoryAddress = process.env.UNISWAP_FACTORY;
    const minerAddress = process.env.MINER;
    const daiAddress = process.env.DAI;

    let swap, dai, ERC20;

    beforeEach(async () => {
        console.log("miner address", );
        swap = await UniTokenSwap.new(ethSwapAddress, uniswapFactoryAddress, minerAddress);

        const provider = new Web3.providers.HttpProvider("http://localhost:8545");
        ERC20 = TruffleContract({ abi: ERC20Metadata.abi });

        ERC20.setProvider(provider);

        dai = await ERC20.at(daiAddress);
    });

    it("should convert a token for miner", async () => {
        const miner = await ERC20.at(minerAddress);
        console.log((await miner.balanceOf(OWNER)).toString());

        await dai.approve(swap.address, new BN("100000000000000000000"), { from: OWNER });

        await swap.convert(dai.address, new BN("100000000000000000000"), new BN("1300000000000000000000"), { from: OWNER });

        console.log((await miner.balanceOf(OWNER)).toString());
    });

    it("should get the amount of token required to convert to eth", async() => {
        const estimate = await swap.getTokenToEth(dai.address, new BN("100000000000000000000"), { from: OWNER });

        console.log(estimate.toString());
    });

    it("should get the amount of token require to convert to miner", async() => {
        const estimate = await swap.getTokenToMiner(dai.address, new BN("100000000000000000000"), { from: OWNER });

        console.log(estimate.toString());
    });
});
