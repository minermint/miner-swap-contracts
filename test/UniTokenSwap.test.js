const {
    BN,
    constants,
    expectEvent,
    expectRevert,
    time,
} = require("@openzeppelin/test-helpers");
const { expect } = require("chai");
const { ZERO_ADDRESS } = constants;

const truffleContract = require("@truffle/contract");
const IEthSwap = artifacts.require("IEthSwap");
const UniTokenSwap = artifacts.require("UniTokenSwap");
const ERC20Contract = require("@uniswap/v2-core/build/ERC20.json");
const UniSwapV2RouterMetadata = require("@uniswap/v2-periphery/build/UniswapV2Router02.json");
const Web3 = require("web3");

contract("UniTokenSwap", (accounts) => {
    const OWNER = accounts[0];

    const ethSwapAddress = process.env.ETHSWAP;
    const uniswapFactoryAddress = process.env.UNISWAP_FACTORY;
    const minerAddress = process.env.MINER;
    const daiAddress = process.env.DAI;
    const uniswapVRouterAddress = process.env.UNISWAP_ROUTER;

    const amount = new BN("10").mul(new BN("10").pow(new BN("18")));

    let ERC20;

    let swap, dai, ethSwap;

    let deadline, timestamp;

    beforeEach(async () => {
        swap = await UniTokenSwap.new(
            ethSwapAddress,
            uniswapFactoryAddress,
            minerAddress
        );

        const provider = new Web3.providers.HttpProvider(
            "http://localhost:8545"
        );
        ERC20 = truffleContract({ abi: ERC20Contract.abi });

        ERC20.setProvider(provider);

        dai = await ERC20.at(daiAddress);

        timestamp = (await web3.eth.getBlock("latest")).timestamp;
        const twentyMinutes = 20 * 60;
        deadline = timestamp + twentyMinutes;

        const EthSwap = truffleContract({ abi: IEthSwap.abi });
        EthSwap.setProvider(provider);

        ethSwap = await EthSwap.at(ethSwapAddress);
    });

    it("should convert a token for miner", async () => {
        const miner = await ERC20.at(minerAddress);
        const balance = await miner.balanceOf(OWNER);

        const daiToMiner = await swap.getTokenToMiner(dai.address, amount);
        const expected = daiToMiner.add(balance);

        await dai.approve(swap.address, amount, { from: OWNER });

        await swap.convert(dai.address, amount, amount, deadline, {
            from: OWNER
        });

        expect(await miner.balanceOf(OWNER)).to.be.bignumber.equal(expected);
    });

    it("should emit a Converted event", async () => {
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
            amountIn: amount,
            amountOut: daiToMiner,
            token: dai.address,
        });
    });

    it("should have an Ether balance in EthSwap", async() => {
        const expected = await swap.getTokenToEth(dai.address, amount);

        const initialBalance = await ethSwap.payments(OWNER);

        await dai.approve(swap.address, amount, { from: OWNER });

        await swap.convert(dai.address, amount, amount, deadline, {
            from: OWNER
        });

        await ethSwap.payments(OWNER);
        let balance = await ethSwap.payments(OWNER);

        balance = balance.sub(initialBalance);

        expect(balance).to.be.bignumber.equal(expected);
    });

    describe("calculating swaps", async () => {
        let uniswapV2Router, path;

        beforeEach(async () => {
            const provider = new Web3.providers.HttpProvider(
                "http://localhost:8545"
            );

            const UniSwapV2Router = truffleContract({
                abi: UniSwapV2RouterMetadata.abi,
            });
            UniSwapV2Router.setProvider(provider);
            uniswapV2Router = await UniSwapV2Router.at(uniswapVRouterAddress);

            path = [];
            path[0] = dai.address;
            path[1] = await uniswapV2Router.WETH();
        });

        it("should get the amount of token required to convert to eth", async () => {
            const actual = await swap.getTokenToEth(dai.address, amount, {
                from: OWNER,
            });

            const amounts = await uniswapV2Router.getAmountsOut(amount, path);
            const expected = amounts[path.length - 1];

            expect(actual).to.be.bignumber.equal(expected);
        });

        it("should get the amount of token require to convert to miner", async () => {
            const actual = await swap.getTokenToMiner(dai.address, amount, {
                from: OWNER,
            });

            const amounts = await uniswapV2Router.getAmountsOut(amount, path);

            const ethToMinerUnitPrice = await ethSwap.getConversionRate();
            const decimals = new BN("10").pow(new BN("18"));

            const expected = amounts[path.length - 1]
                .mul(decimals)
                .div(ethToMinerUnitPrice);

            expect(actual).to.be.bignumber.equal(expected);
        });
    });

    it("should NOT swap when deadline expires", async () => {
        await dai.approve(swap.address, amount, { from: OWNER });

        time.increase(time.duration.minutes(20));

        await expectRevert(
            swap.convert(dai.address, amount, amount, deadline, {
                from: OWNER,
            }),
            "UniswapV2Router: EXPIRED"
        );
    });

    it("should NOT swap invalid token", async () => {
        await dai.approve(swap.address, amount, { from: OWNER });

        await expectRevert.unspecified(
            swap.convert(ZERO_ADDRESS, amount, amount, deadline, {
                from: OWNER,
            })
        );
    });

    it("should return tokens if deadline expires", async () => {
        const expected = await dai.balanceOf(OWNER);

        await dai.approve(swap.address, amount, { from: OWNER });

        time.increase(time.duration.minutes(20));

        await expectRevert(
            swap.convert(dai.address, amount, amount, deadline, {
                from: OWNER,
            }),
            "UniswapV2Router: EXPIRED"
        );

        expect(await dai.balanceOf(OWNER)).to.be.bignumber.equal(expected);
    });
});
