
const { ethers } = require("hardhat");

describe.only("LendMCRTFactory Test", function () {
    let LendMCRTFactory;
    let factory;
    let owner;
    let investor;
    let player1;
    let player2;
    let player3;
    let player4;

    beforeEach(async function () {
        LendMCRTFactory = await ethers.getContractFactory("LendMCRTFactory");
        [owner, investor, player1, player2, player3, player4] = await ethers.getSigners();
        factory = await LendMCRTFactory.deploy();
        await factory.deployed();
    });

    it("Should create new LendMCRT contract", async function () {
        // MCRT Token INITIALISATION
        const MCRTToken = await ethers.getContractFactory("MCRTToken");
        mcrt = await MCRTToken.deploy("MCRT", "MCRT", 9);

        // GAME WALLET INITIALISATION
        const GameWallet = await ethers.getContractFactory("GameWallet");
        const gameWallet = await GameWallet.deploy();
        gameWallet.connect(owner).initialize(mcrt.address);
        await gameWallet.setLockDuration(600);

        const initiaInvestorBalance = 10 * 1e9
        const timePeriod = 60 * 60 * 24 * 7; // one week in seconds
        const investmentAmount = 5 * 1e9;
        const investorPercentage = 10;
        const wallets = [player1.address, player1.address, player2.address, player3.address, player4.address];

        // SENDS SOME FUNDS TO THE INVESTOR
        await mcrt.connect(owner).transfer(investor.address, initiaInvestorBalance);

        // APPROVE THE FACTORY CONTRACT FOR TRANSFERRING THE INVESTMENT AMOUNT
        await mcrt.connect(investor).approve(factory.address, investmentAmount);

        const tx = await factory.connect(investor).lendMCRT(
            mcrt.address,
            gameWallet.address,
            wallets,
            investmentAmount,
            timePeriod,
            investorPercentage
        );
        await tx.wait();
        const newLendMCRTAddress = await factory.getLendMCRT(investor.address);

        await expect(tx)
            .to.emit(factory, 'LendMCRTCreated')
            .withArgs(investor.address, newLendMCRTAddress, investmentAmount, timePeriod, investorPercentage);

        expect(+(await mcrt.balanceOf(gameWallet.address))).to.be.equal(investmentAmount);
    });
});