
const { ethers } = require("hardhat");
const { ADDRESS_0 } = require('./utils/constants');
const initBalance = 1000 * 1e9;
const prizeFeePercent = 10;

describe.only("LendMCRT Test", () => {
    let investor,
        bob,
        johnny,
        jackie,
        joey,
        chloe,
        moe,
        fondWallet,
        treasury,
        wallets,
        mcrt,
        gameWallet,
        lendMCRT,
        investedAmount,
        timePeriod,
        investorPercentage;

    beforeEach(async () => {
        [
            owner,
            investor,
            bob,
            johnny,
            jackie,
            joey,
            chloe,
            moe,
            fondWallet,
            treasury
        ] = await ethers.getSigners();

        // MCRT Token INITIALISATION
        const MCRTToken = await ethers.getContractFactory("MCRTToken");
        mcrt = await MCRTToken.deploy("MCRT", "MCRT", 9);

        // GAME WALLET INITIALISATION
        const GameWallet = await ethers.getContractFactory("GameWallet");
        gameWallet = await GameWallet.deploy();
        gameWallet.connect(owner).initialize(mcrt.address);
        await gameWallet.setLockDuration(600);
        await mcrt.connect(owner).transfer(fondWallet.address, initBalance); // 1000 MCRT

        // SENDS SOME FUNDS TO THE INVESTOR
        await mcrt.connect(owner).transfer(investor.address, initBalance);

        wallets = [
            bob.address,
            johnny.address,
            jackie.address,
            joey.address,
            chloe.address,
            moe.address
        ]

        await Promise.all(
            wallets.map((wallet) => {
                return mcrt.connect(owner).transfer(wallet, initBalance); // 1000 MCRT
            })
        );

        await gameWallet.setTreasury(treasury.address);
        await gameWallet.setPrizeFondWallet(fondWallet.address);
        await gameWallet.setPrizeFee(prizeFeePercent * 100);

        // LendMCRT DEFAULT VALUES
        investedAmount = initBalance / 2;
        timePeriod = 60 * 60 * 24 * 7; // one week in seconds
        investorPercentage = 10;
        const LendMCRT = await ethers.getContractFactory("LendMCRT");
        lendMCRT = await LendMCRT.deploy();
    })

    // INITIALISE - UNHAPPY PATHS
    it("Should not initialise more than one time", async function () {
        await lendMCRT.connect(owner).initialize(mcrt.address, gameWallet.address, investor.address, wallets, investedAmount, timePeriod, investorPercentage);
        await expect(lendMCRT.connect(owner).initialize(mcrt.address, gameWallet.address, investor.address, wallets, investedAmount, timePeriod, investorPercentage)).to.be.revertedWith('Initializable: contract is already initialized');
    });

    it("Should throw error if mcrtTokenAddress is address(0)", async function () {
        await expect(lendMCRT.connect(owner).initialize(ADDRESS_0, gameWallet.address, investor.address, wallets, investedAmount, timePeriod, investorPercentage)).to.be.revertedWith('initialize: Invalid MCRT token address');
    });

    it("Should throw error if gameWalletAddress is address(0)", async function () {
        await expect(lendMCRT.connect(owner).initialize(mcrt.address, ADDRESS_0, investor.address, wallets, investedAmount, timePeriod, investorPercentage)).to.be.revertedWith('initialize: Invalid GameWallet address');
    });

    it("Should throw error if investortAddress is address(0)", async function () {
        await expect(lendMCRT.connect(owner).initialize(mcrt.address, investor.address, ADDRESS_0, wallets, investedAmount, timePeriod, investorPercentage)).to.be.revertedWith('initialize: Invalid investor address');
    });

    it("Should not initialise if wallet list is emprty", async function () {
        await expect(lendMCRT.connect(owner).initialize(mcrt.address, gameWallet.address, investor.address, [], investedAmount, timePeriod, investorPercentage)).to.be.revertedWith('initialize: Wallets array cannot be empty');
    });

    it("Should not initialise if amount value is not greather than 0", async function () {
        await expect(lendMCRT.connect(owner).initialize(mcrt.address, gameWallet.address, investor.address, wallets, 0, timePeriod, investorPercentage)).to.be.revertedWith('initialize: Amount must be greater than 0');
    });

    it("Should not initialise if time period value is not greather than 0", async function () {
        await expect(lendMCRT.connect(owner).initialize(mcrt.address, gameWallet.address, investor.address, wallets, investedAmount, 0, investorPercentage)).to.be.revertedWith('initialize: Time period must be greater than 0');
    });

    it("Should not initialise if investor percentage value is not greather than 0", async function () {
        await expect(lendMCRT.connect(owner).initialize(mcrt.address, gameWallet.address, investor.address, wallets, investedAmount, timePeriod, 0)).to.be.revertedWith('initialize: Invalid investor percentage');
    });

    // DEPOSIT - UNHAPPY PATHS
    it("Should NOT approveGameWallet if the sender is not the owner", async function () {
        await lendMCRT.connect(owner).initialize(mcrt.address, gameWallet.address, investor.address, wallets, investedAmount, timePeriod, investorPercentage);
        await expect(lendMCRT.connect(owner).deposit()).to.be.revertedWith('Ownable: caller is not the owner');
    });

    // DEPOSIT - HAPPY PATHS
    it("Should approveGameWallet", async function () {
        await lendMCRT.connect(owner).initialize(mcrt.address, gameWallet.address, investor.address, wallets, investedAmount, timePeriod, investorPercentage);
        await mcrt.connect(investor).approve(lendMCRT.address, investedAmount);
        await lendMCRT.connect(investor).deposit();
        expect((await mcrt.balanceOf(gameWallet.address)).toString()).to.be.equal(investedAmount.toString());
    });

    // CLAIM - UNHAPPY PATHS
    it("Should NOT claim if the claim period is not started yet", async function () {
        await lendMCRT.connect(owner).initialize(mcrt.address, gameWallet.address, investor.address, wallets, investedAmount, timePeriod, investorPercentage);
        await mcrt.connect(investor).approve(lendMCRT.address, investedAmount);
        await lendMCRT.connect(investor).deposit();
        await expect(lendMCRT.connect(investor).claim()).to.be.revertedWith('claim: Claim period not started yet');
    });

    // CLAIM - UNHAPPY PATHS
    it("Should NOT claim if the sender is not the investor and is not one of the wallets", async function () {
        timePeriod = 1;
        await lendMCRT.connect(owner).initialize(mcrt.address, gameWallet.address, investor.address, wallets, investedAmount, timePeriod, investorPercentage);
        await mcrt.connect(investor).approve(lendMCRT.address, investedAmount);
        await lendMCRT.connect(investor).deposit();
        await expect(lendMCRT.connect(owner).claim()).to.be.revertedWith('claim: Caller not authorized to claim');
    });

    // CLAIM - HAPPY PATHS
    it("Should claim if the sender is the investor and there are no wins and no losses", async function () {
        // INVESTMENT = 500000000000
        // The investor will be able to reclaim his whole invested amount
        const expectedClaimAmount = investedAmount;
        timePeriod = 1;
        await lendMCRT.connect(owner).initialize(mcrt.address, gameWallet.address, investor.address, wallets, investedAmount, timePeriod, investorPercentage);
        await mcrt.connect(investor).approve(lendMCRT.address, investedAmount);
        await lendMCRT.connect(investor).deposit();
        await lendMCRT.connect(investor).claim();
        expect((await mcrt.balanceOf(investor)).toString()).to.be.equal(expectedClaimAmount);
    });

    it("Should claim if the sender is the investor and there are wins", async function () {
        // INVESTMENT = 500000000000
        // The investor will be able to reclaim his whole invested amount PLUS 10% of the wins
        const expectedClaimAmount = investedAmount;
        timePeriod = 1;
        const prizePool = 100 * 1e9;

        await gameWallet.winPrize
        await lendMCRT.connect(owner).initialize(mcrt.address, gameWallet.address, investor.address, wallets, investedAmount, timePeriod, investorPercentage);
        await mcrt.connect(investor).approve(lendMCRT.address, investedAmount);
        await lendMCRT.connect(investor).deposit();
        await lendMCRT.connect(investor).claim();
        expect((await mcrt.balanceOf(investor)).toString()).to.be.equal(expectedClaimAmount);
    });

});
