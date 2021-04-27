const { BN, constants, expectEvent, expectRevert, time } = require("@openzeppelin/test-helpers");
const { expect } = require("chai");
const { ZERO_ADDRESS, MAX_UINT256 } = constants;

const TruffleContract = require("@truffle/contract");
const IEthSwap = artifacts.require("IEthSwap");
const UniTokenSwap = artifacts.require("UniTokenSwap");
const ERC20Metadata = require("@uniswap/v2-core/build/ERC20.json");
const UniSwapV2PairMetadata = require("@uniswap/v2-periphery/build/UniswapV2Router02.json");
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
    const uniswapVRouterAddress = process.env.UNISWAP_ROUTER;

    const amount = new BN("10").mul(new BN("10").pow(new BN("18")));

    let ERC20, UniSwapV2Pair;

    let swap, dai;

    let deadline, timestamp;

    beforeEach(async () => {
        swap = await UniTokenSwap.new(ethSwapAddress, uniswapFactoryAddress, minerAddress);

        const provider = new Web3.providers.HttpProvider("http://localhost:8545");
        ERC20 = TruffleContract({ abi: ERC20Metadata.abi });

        ERC20.setProvider(provider);

        dai = await ERC20.at(daiAddress);

        timestamp = (await web3.eth.getBlock("latest")).timestamp;
        deadline = timestamp + 20 * 60;
    });

    it("should convert a token for miner", async () => {
        const miner = await ERC20.at(minerAddress);
        const balance = await miner.balanceOf(OWNER);

        const daiToMiner = await swap.getTokenToMiner(dai.address, amount);
        const expected = daiToMiner.add(balance);

        await dai.approve(swap.address, amount, { from: OWNER });

        await swap.convert(dai.address, amount, amount, deadline, { from: OWNER });

        expect(await miner.balanceOf(OWNER)).to.be.bignumber.equal(expected);
    });

    it("should emit a Converted event", async () => {
        const miner = await ERC20.at(minerAddress);

        const daiToMiner = await swap.getTokenToMiner(dai.address, amount);

        await dai.approve(swap.address, amount, { from: OWNER });

        const { logs } = await swap.convert(
            dai.address,
            amount,
            amount,
            deadline,
            { from: OWNER }
        );

        expectEvent.inLogs(logs, "Converted", {
            token: dai.address,
            amountIn: amount,
            amountOut: daiToMiner,
        });
    });

    describe("calculating swaps", async() => {
        let uniswapVRouter, path;

        beforeEach(async () => {
            const provider = new Web3.providers.HttpProvider("http://localhost:8545");

            UniSwapV2Router = TruffleContract({ abi: UniSwapV2PairMetadata.abi });
            UniSwapV2Router.setProvider(provider);
            uniswapV2Router = await UniSwapV2Router.at(uniswapVRouterAddress);

            path = [];
            path[0] = dai.address;
            path[1] = await uniswapV2Router.WETH();
        });

        it("should get the amount of token required to convert to eth", async() => {
            const actual = await swap.getTokenToEth(dai.address, amount, { from: OWNER });

            const amounts = await uniswapV2Router.getAmountsOut(amount, path);
            const expected = amounts[path.length - 1];

            expect(actual).to.be.bignumber.equal(expected);
        });

        it("should get the amount of token require to convert to miner", async() => {
            const provider = new Web3.providers.HttpProvider("http://localhost:8545");

            const EthSwap = TruffleContract({ abi: IEthSwap.abi });
            EthSwap.setProvider(provider);
            ethSwap = await EthSwap.at("0x35755705DeFD61dC1EE0E86b9602088c2b2049bc");

            const actual = await swap.getTokenToMiner(dai.address, amount, { from: OWNER });

            const amounts = await uniswapV2Router.getAmountsOut(amount, path);

            const ethToMinerUnitPrice = await ethSwap.getConversionRate();
            const decimals = new BN("10").pow(new BN("18"));

            const expected = amounts[path.length - 1].mul(decimals).div(ethToMinerUnitPrice);

            expect(actual).to.be.bignumber.equal(expected);
        });
    });

    it("should NOT swap when deadline expires", async() => {
        await dai.approve(swap.address, amount, { from: OWNER });

        time.increase(time.duration.minutes(20));

        await expectRevert(
            swap.convert(
                dai.address,
                amount,
                amount,
                deadline,
                { from: OWNER }
            ),
            "UniswapV2Router: EXPIRED"
        );
    });

    it("should NOT swap invalid token", async() => {
        await dai.approve(swap.address, amount, { from: OWNER });

        await expectRevert.unspecified(
            swap.convert(
                ZERO_ADDRESS,
                amount,
                amount,
                deadline,
                { from: OWNER }
            )
        );
    });
});
