
const { ethers } = require("hardhat");
const { ADDRESS_0 } = require('./utils/constants');
const initiaInvestorBalance = 10 * 1e9;
const prizeFeePercent = 10;

describe.only("LendMCRT Test", () => {
    let investor,
        bob,
        johnny,
        jackie,
        joey,
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

        // SENDS SOME FUNDS TO THE INVESTOR
        await mcrt.connect(owner).transfer(investor.address, initiaInvestorBalance);

        // WALLETS STORED IN THE LendMCRT CONTRACT
        wallets = [
            bob.address,
            johnny.address,
            jackie.address,
            joey.address
        ]

        await Promise.all(
            wallets.map((wallet) => {
                return mcrt.connect(owner).transfer(wallet, initiaInvestorBalance); // 1000 MCRT
            })
        );

        await gameWallet.setTreasury(treasury.address);
        await gameWallet.setPrizeFondWallet(fondWallet.address);
        await gameWallet.setPrizeFee(prizeFeePercent * 100);

        // LendMCRT DEFAULT VALUES
        investedAmount = initiaInvestorBalance / 2;
        timePeriod = 60 * 60 * 24 * 7; // one week in seconds
        investorPercentage = 10;
        const LendMCRT = await ethers.getContractFactory("LendMCRT");
        lendMCRT = await LendMCRT.deploy();
    })

    // INITIALISE
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
        await expect(lendMCRT.connect(owner).initialize(mcrt.address, gameWallet.address, ADDRESS_0, wallets, investedAmount, timePeriod, investorPercentage)).to.be.revertedWith('initialize: Invalid investor address');
    });

    it("Should throw error if one of the wallets is address(0)", async function () {
        wallets[0] = ADDRESS_0;
        await expect(lendMCRT.connect(owner).initialize(mcrt.address, gameWallet.address, investor.address, wallets, investedAmount, timePeriod, investorPercentage)).to.be.revertedWith('initialize: Invalid wallet address');
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

    // DEPOSIT
    it("Should NOT approveGameWallet if the sender is not the owner", async function () {
        await lendMCRT.connect(owner).initialize(mcrt.address, gameWallet.address, investor.address, wallets, investedAmount, timePeriod, investorPercentage);
        await expect(lendMCRT.connect(owner).deposit()).to.be.revertedWith('Ownable: caller is not the owner');
    });

    it("Should approveGameWallet", async function () {
        await lendMCRT.connect(owner).initialize(mcrt.address, gameWallet.address, investor.address, wallets, investedAmount, timePeriod, investorPercentage);
        await mcrt.connect(investor).approve(lendMCRT.address, investedAmount);
        await expect(lendMCRT.connect(investor).deposit()).to.emit(lendMCRT, 'Deposit');

        expect(+(await mcrt.balanceOf(gameWallet.address))).to.be.equal(investedAmount);
    });

    // CLAIM
    it("Should NOT claim if the claim period is not started yet", async function () {
        await lendMCRT.connect(owner).initialize(mcrt.address, gameWallet.address, investor.address, wallets, investedAmount, timePeriod, investorPercentage);
        await mcrt.connect(investor).approve(lendMCRT.address, investedAmount);
        await lendMCRT.connect(investor).deposit();
        await expect(lendMCRT.connect(investor).claim()).to.be.revertedWith('claim: Claim period not started yet');
    });

    it("Should NOT claim if the sender is not the investor and is not one of the wallets", async function () {
        timePeriod = 1;
        await lendMCRT.connect(owner).initialize(mcrt.address, gameWallet.address, investor.address, wallets, investedAmount, timePeriod, investorPercentage);
        await mcrt.connect(investor).approve(lendMCRT.address, investedAmount);
        await lendMCRT.connect(investor).deposit();
        await expect(lendMCRT.connect(owner).claim()).to.be.revertedWith('claim: Caller not authorized to claim');
    });

    it("Should NOT claim if the sender is the investor and there are no remaing amounts", async function () {
        timePeriod = 1;
        await lendMCRT.connect(owner).initialize(mcrt.address, gameWallet.address, investor.address, wallets, investedAmount, timePeriod, investorPercentage);
        await mcrt.connect(investor).approve(lendMCRT.address, investedAmount);
        await lendMCRT.connect(investor).deposit();
        const investorBalance = +(await mcrt.balanceOf(investor.address));

        const expectedClaimAmount = investorBalance + investedAmount;
        await expect(lendMCRT.connect(investor).claim()).to.emit(lendMCRT, 'Claim');

        expect(+(await mcrt.balanceOf(investor.address))).to.be.equal(expectedClaimAmount);
        expect(+(await gameWallet.pBalance(lendMCRT.address))).to.be.equal(0);

        // TRY TO CLAIM AGAIN
        await expect(lendMCRT.connect(investor).claim()).to.be.revertedWith('claim: game wallet balance is 0');
    });

    it("Should claim if the sender is the investor and there are no wins and no losses", async function () {
        // INVESTMENT = 500000000000
        // The investor will be able to reclaim his whole invested amount

        timePeriod = 1;
        await lendMCRT.connect(owner).initialize(mcrt.address, gameWallet.address, investor.address, wallets, investedAmount, timePeriod, investorPercentage);
        await mcrt.connect(investor).approve(lendMCRT.address, investedAmount);
        await lendMCRT.connect(investor).deposit();
        const investorBalance = +(await mcrt.balanceOf(investor.address));

        const expectedClaimAmount = investorBalance + investedAmount;
        await expect(lendMCRT.connect(investor).claim()).to.emit(lendMCRT, 'Claim');

        expect(+(await mcrt.balanceOf(investor.address))).to.be.equal(expectedClaimAmount);
        expect(+(await gameWallet.pBalance(lendMCRT.address))).to.be.equal(0);
    });

    it("Should claim for one participant and the investor when there are wins", async function () {
        // INVESTMENT = 500000000000
        // The investor will be able to reclaim his whole invested amount PLUS 10% of the wins

        timePeriod = 1;
        await lendMCRT.connect(owner).initialize(mcrt.address, gameWallet.address, investor.address, wallets, investedAmount, timePeriod, investorPercentage);
        await mcrt.connect(investor).approve(lendMCRT.address, investedAmount);
        await lendMCRT.connect(investor).deposit();

        // // WINNER PRIZE 
        const entryFee = 10 * 1e9;

        // SENDS SOME FUNDS TO ANOTHER USER TO JOIN IN THE GAME VS LendMCRT CONTRACT
        await mcrt.connect(owner).transfer(moe.address, entryFee);
        await mcrt.connect(moe).approve(gameWallet.address, entryFee);
        await gameWallet.connect(moe).manageBalance(true, entryFee);

        await gameWallet.connect(owner).winPrize(
            [
                {
                    account: lendMCRT.address,
                    winningPerMille: 1000,
                    isWinner: true,
                    stakeholderAccount: ADDRESS_0,
                    stakeholderFeePermille: 0,
                },
                {
                    account: moe.address,
                    winningPerMille: 0,
                    isWinner: false,
                    stakeholderAccount: ADDRESS_0,
                    stakeholderFeePermille: 0,
                }
            ],
            entryFee * 2,
            false
        );

        // CALCULATE THE REMAINING
        let gameWalletBalance = +(await gameWallet.pBalance(lendMCRT.address));
        let remaining = gameWalletBalance - investedAmount;

        // CALCULATE THE INVESTOR CLAIM AMOUNT
        let investorRemainingPercentage = remaining * investorPercentage / 100;
        let expectedInvestorClaimAmount = investedAmount + investorRemainingPercentage;
        remaining = remaining - investorRemainingPercentage;

        // CALCULATE THE PARTICIPANT CLAIM AMOUNT
        const bobBalance = +(await mcrt.balanceOf(bob.address));
        const expectedParticipantBalance = bobBalance + (remaining / wallets.length);

        // A WALLET CLAIMS ITS PART
        console.log('--> BOB CLAIM')
        await expect(lendMCRT.connect(bob).claim()).to.emit(lendMCRT, 'Claim');
        expect(+(await mcrt.balanceOf(bob.address))).to.be.equal(expectedParticipantBalance);

        // CALCULATE THE REMAINING
        gameWalletBalance = +(await gameWallet.pBalance(lendMCRT.address));
        remaining = gameWalletBalance - investedAmount;

        // CALCULATE THE INVESTOR CLAIM AMOUNT
        investorRemainingPercentage = remaining * investorPercentage / 100;
        expectedInvestorClaimAmount = investedAmount + investorRemainingPercentage;
        remaining = remaining - investorRemainingPercentage;

        const expectedClaimAmount = initiaInvestorBalance + ((gameWalletBalance - investedAmount) * investorPercentage / 100);

        // INVESTOR CLAIM
        console.log('--> INVESTOR CLAIM')
        await expect(lendMCRT.connect(investor).claim()).to.emit(lendMCRT, 'Claim');

        expect((await mcrt.balanceOf(investor.address))).to.be.equal(expectedClaimAmount);

        // BOB TRIES TO CLAIM AGAIN
        console.log('--> BOB RE-CLAIM')
        await expect(lendMCRT.connect(bob).claim()).to.be.revertedWith('claim: player remaining amount is 0');

        // INVESTOR TRIES TO CLAIM AGAIN
        console.log('--> INVESTOR RE-CLAIM')
        await expect(lendMCRT.connect(investor).claim()).to.be.revertedWith('claim: investor remaining amount is 0');
    });

    it("Should claim for one participant and the investor when there are wins and the gamewallet is refilled", async function () {
        // INVESTMENT = 500000000000
        // The investor will be able to reclaim his whole invested amount PLUS 10% of the wins

        timePeriod = 1;
        await lendMCRT.connect(owner).initialize(mcrt.address, gameWallet.address, investor.address, wallets, investedAmount, timePeriod, investorPercentage);
        await mcrt.connect(investor).approve(lendMCRT.address, investedAmount);
        await lendMCRT.connect(investor).deposit();

        // // WINNER PRIZE 
        const entryFee = 5 * 1e9;

        // SENDS SOME FUNDS TO ANOTHER USER TO JOIN IN THE GAME VS LendMCRT CONTRACT
        await mcrt.connect(owner).transfer(moe.address, entryFee * 2);
        await mcrt.connect(moe).approve(gameWallet.address, entryFee * 2);
        await gameWallet.connect(moe).manageBalance(true, entryFee * 2);

        await gameWallet.connect(owner).winPrize(
            [
                {
                    account: lendMCRT.address,
                    winningPerMille: 1000,
                    isWinner: true,
                    stakeholderAccount: ADDRESS_0,
                    stakeholderFeePermille: 0,
                },
                {
                    account: moe.address,
                    winningPerMille: 0,
                    isWinner: false,
                    stakeholderAccount: ADDRESS_0,
                    stakeholderFeePermille: 0,
                }
            ],
            entryFee * 2,
            false
        );

        // CALCULATE THE REMAINING
        let gameWalletBalance = +(await gameWallet.pBalance(lendMCRT.address));
        let remaining = gameWalletBalance - investedAmount;

        // CALCULATE THE INVESTOR CLAIM AMOUNT
        let investorRemainingPercentage = remaining * investorPercentage / 100;
        //let expectedInvestorClaimAmount = investedAmount + investorRemainingPercentage;
        remaining = remaining - investorRemainingPercentage;

        // CALCULATE THE PARTICIPANT CLAIM AMOUNT
        let bobBalance = +(await mcrt.balanceOf(bob.address));
        let expectedParticipantBalance = bobBalance + (remaining / wallets.length);

        // A WALLET CLAIMS ITS PART
        await expect(lendMCRT.connect(bob).claim()).to.emit(lendMCRT, 'Claim');
        expect(+(await mcrt.balanceOf(bob.address))).to.be.equal(expectedParticipantBalance);

        // CALCULATE THE REMAINING
        gameWalletBalance = +(await gameWallet.pBalance(lendMCRT.address));
        remaining = gameWalletBalance - investedAmount;

        // CALCULATE THE INVESTOR CLAIM AMOUNT
        investorRemainingPercentage = remaining * investorPercentage / 100;
        remaining = remaining - investorRemainingPercentage;

        let expectedInvestorBalance = initiaInvestorBalance + ((gameWalletBalance - investedAmount) * investorPercentage / 100);

        await expect(lendMCRT.connect(investor).claim()).to.emit(lendMCRT, 'Claim');

        expect((await mcrt.balanceOf(investor.address))).to.be.equal(expectedInvestorBalance);

        // BOB TRIES TO CLAIM AGAIN
        await expect(lendMCRT.connect(bob).claim()).to.be.revertedWith('claim: player remaining amount is 0');

        // INVESTOR TRIES TO CLAIM AGAIN
        await expect(lendMCRT.connect(investor).claim()).to.be.revertedWith('claim: investor remaining amount is 0');

        // ANOTHER GAME HAS BEEN PLAYED
        await gameWallet.connect(owner).winPrize(
            [
                {
                    account: lendMCRT.address,
                    winningPerMille: 1000,
                    isWinner: true,
                    stakeholderAccount: ADDRESS_0,
                    stakeholderFeePermille: 0,
                },
                {
                    account: moe.address,
                    winningPerMille: 0,
                    isWinner: false,
                    stakeholderAccount: ADDRESS_0,
                    stakeholderFeePermille: 0,
                }
            ],
            entryFee * 2,
            false
        );

        // CALCULATE THE REMAINING
        gameWalletBalance = +(await gameWallet.pBalance(lendMCRT.address));
        console.log('--> gameWalletBalance', gameWalletBalance);
        remaining = gameWalletBalance * investorPercentage / 100;
        console.log('--> investorRemaining', remaining);
        expectedInvestorBalance = expectedInvestorBalance + remaining;

        // INVESTOR CLAIM
        await expect(lendMCRT.connect(investor).claim()).to.emit(lendMCRT, 'Claim');
        expect((await mcrt.balanceOf(investor.address))).to.be.equal(expectedInvestorBalance);

        // INVESTOR TRIES TO CLAIM AGAIN
        await expect(lendMCRT.connect(investor).claim()).to.be.revertedWith('claim: investor remaining amount is 0');

        // CALCULATE THE PARTICIPANT CLAIM AMOUNT
        gameWalletBalance = +(await gameWallet.pBalance(lendMCRT.address));
        bobBalance = +(await mcrt.balanceOf(bob.address));
        console.log('--> playerClaimAmount', (gameWalletBalance / wallets.length))
        expectedParticipantBalance = bobBalance + (gameWalletBalance / wallets.length);

        // BOB CLAIMS ITS PART
        await expect(lendMCRT.connect(bob).claim()).to.emit(lendMCRT, 'Claim');
        expect((await mcrt.balanceOf(bob.address))).to.be.equal(expectedParticipantBalance);

        // BOB TRIES TO CLAIM AGAIN
        await expect(lendMCRT.connect(bob).claim()).to.be.revertedWith('claim: player remaining amount is 0');
    });
});
