
const { ethers } = require("hardhat");
const { ADDRESS_0 } = require('./utils/constants');
const initiaInvestorBalance = 10 * 1e9;
const prizeFeePercent = 10;

describe.only("LendMCRT Test", () => {
    let investor,
        player1,
        player2,
        player3,
        player4,
        player5,
        fondWallet,
        treasury,
        wallets,
        mcrt,
        gameWallet,
        lendMCRT,
        investmentAmount,
        timePeriod,
        investorPercentage;

    beforeEach(async () => {
        [
            owner,
            investor,
            player1,
            player2,
            player3,
            player4,
            player5,
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
            player1.address,
            player2.address,
            player3.address,
            player4.address
        ]

        await Promise.all(
            wallets.map((wallet) => {
                return mcrt.connect(owner).transfer(wallet, initiaInvestorBalance); // 1000 MCRT
            })
        );

        await gameWallet.setTreasury(treasury.address);
        await gameWallet.setPrizeFondWallet(fondWallet.address);
        await gameWallet.setPrizeFee(prizeFeePercent * 100);

        // LendMCRTFactory
        const LendMCRTFactory = await ethers.getContractFactory("LendMCRTFactory");
        const lendMCRTFactory = await LendMCRTFactory.deploy();

        // LendMCRT DEFAULT VALUES
        investmentAmount = initiaInvestorBalance / 2;
        timePeriod = 1; //seconds
        investorPercentage = 10;

        // APPROVE THE FACTORY CONTRACT FOR TRANSFERRING THE INVESTMENT AMOUNT
        await mcrt.connect(investor).approve(lendMCRTFactory.address, investmentAmount);

        // LendMCRT CREATION
        const LendMCRT = await ethers.getContractFactory("LendMCRT");
        const tx = await lendMCRTFactory.connect(investor).lendMCRT(mcrt.address, gameWallet.address, wallets, investmentAmount, timePeriod, investorPercentage);
        await tx.wait();
        const lendMCRTContractAddress = await lendMCRTFactory.getLendMCRT(investor.address);
        lendMCRT = LendMCRT.attach(lendMCRTContractAddress);
    })

    // INITIALISE
    it("Should not initialise more than one time", async function () {
        // test only the initialise function
        const LendMCRT = await ethers.getContractFactory("LendMCRT");
        const lendMCRT = await LendMCRT.deploy();
        await mcrt.connect(owner).transfer(lendMCRT.address, investmentAmount);
        await lendMCRT.connect(owner).initialize(mcrt.address, gameWallet.address, investor.address, wallets, investmentAmount, timePeriod, investorPercentage);
        await expect(lendMCRT.connect(owner).initialize(mcrt.address, gameWallet.address, investor.address, wallets, investmentAmount, timePeriod, investorPercentage)).to.be.revertedWith('Initializable: contract is already initialized');
    });

    it("Should throw error if mcrtTokenAddress is address(0)", async function () {
        // test only the initialise function
        const LendMCRT = await ethers.getContractFactory("LendMCRT");
        const lendMCRT = await LendMCRT.deploy();
        await mcrt.connect(owner).transfer(lendMCRT.address, investmentAmount);
        await expect(lendMCRT.connect(owner).initialize(ADDRESS_0, gameWallet.address, investor.address, wallets, investmentAmount, timePeriod, investorPercentage)).to.be.revertedWith('initialize: Invalid MCRT token address');
    });

    it("Should throw error if gameWalletAddress is address(0)", async function () {
        // test only the initialise function
        const LendMCRT = await ethers.getContractFactory("LendMCRT");
        const lendMCRT = await LendMCRT.deploy();
        await mcrt.connect(owner).transfer(lendMCRT.address, investmentAmount);
        await expect(lendMCRT.connect(owner).initialize(mcrt.address, ADDRESS_0, investor.address, wallets, investmentAmount, timePeriod, investorPercentage)).to.be.revertedWith('initialize: Invalid GameWallet address');
    });

    it("Should throw error if investortAddress is address(0)", async function () {
        // test only the initialise function
        const LendMCRT = await ethers.getContractFactory("LendMCRT");
        const lendMCRT = await LendMCRT.deploy();
        await mcrt.connect(owner).transfer(lendMCRT.address, investmentAmount);
        await expect(lendMCRT.connect(owner).initialize(mcrt.address, gameWallet.address, ADDRESS_0, wallets, investmentAmount, timePeriod, investorPercentage)).to.be.revertedWith('initialize: Invalid investor address');
    });

    it("Should throw error if one of the wallets is address(0)", async function () {
        // test only the initialise function
        const LendMCRT = await ethers.getContractFactory("LendMCRT");
        const lendMCRT = await LendMCRT.deploy();
        await mcrt.connect(owner).transfer(lendMCRT.address, investmentAmount);
        wallets[0] = ADDRESS_0;
        await expect(lendMCRT.connect(owner).initialize(mcrt.address, gameWallet.address, investor.address, wallets, investmentAmount, timePeriod, investorPercentage)).to.be.revertedWith('initialize: Invalid wallet address');
    });

    it("Should not initialise if wallet list is empty", async function () {
        // test only the initialise function
        const LendMCRT = await ethers.getContractFactory("LendMCRT");
        const lendMCRT = await LendMCRT.deploy();
        await mcrt.connect(owner).transfer(lendMCRT.address, investmentAmount);
        await expect(lendMCRT.connect(owner).initialize(mcrt.address, gameWallet.address, investor.address, [], investmentAmount, timePeriod, investorPercentage)).to.be.revertedWith('initialize: Wallets array cannot be empty');
    });

    it("Should not initialise if amount value is not greather than 0", async function () {
        // test only the initialise function
        const LendMCRT = await ethers.getContractFactory("LendMCRT");
        const lendMCRT = await LendMCRT.deploy();
        await mcrt.connect(owner).transfer(lendMCRT.address, investmentAmount);
        await expect(lendMCRT.connect(owner).initialize(mcrt.address, gameWallet.address, investor.address, wallets, 0, timePeriod, investorPercentage)).to.be.revertedWith('initialize: Amount must be greater than 0');
    });

    it("Should not initialise if time period value is not greather than 0", async function () {
        // test only the initialise function
        const LendMCRT = await ethers.getContractFactory("LendMCRT");
        const lendMCRT = await LendMCRT.deploy();
        await mcrt.connect(owner).transfer(lendMCRT.address, investmentAmount);
        await expect(lendMCRT.connect(owner).initialize(mcrt.address, gameWallet.address, investor.address, wallets, investmentAmount, 0, investorPercentage)).to.be.revertedWith('initialize: Time period must be greater than 0');
    });

    it("Should not initialise if investor percentage value is not greather than 0", async function () {
        // test only the initialise function
        const LendMCRT = await ethers.getContractFactory("LendMCRT");
        const lendMCRT = await LendMCRT.deploy();
        await mcrt.connect(owner).transfer(lendMCRT.address, investmentAmount);
        await expect(lendMCRT.connect(owner).initialize(mcrt.address, gameWallet.address, investor.address, wallets, investmentAmount, timePeriod, 0)).to.be.revertedWith('initialize: Invalid investor percentage');
    });

    it("Should not initialise investment amount is not deposited to the contract", async function () {
        // test only the initialise function
        const LendMCRT = await ethers.getContractFactory("LendMCRT");
        const lendMCRT = await LendMCRT.deploy();
        await expect(lendMCRT.connect(owner).initialize(mcrt.address, gameWallet.address, investor.address, wallets, investmentAmount, timePeriod, investorPercentage)).to.be.revertedWith('initialize: insufficient contract balance');
    });

    // CLAIM
    it("Should NOT claim if the claim period is not started yet", async function () {
        timePeriod = 60 * 60 * 24 * 7; // one week in seconds
        const LendMCRT = await ethers.getContractFactory("LendMCRT");
        const lendMCRT = await LendMCRT.deploy();
        await mcrt.connect(owner).transfer(lendMCRT.address, investmentAmount);
        await lendMCRT.connect(owner).initialize(mcrt.address, gameWallet.address, investor.address, wallets, investmentAmount, timePeriod, investorPercentage);
        await expect(lendMCRT.connect(investor).claim()).to.be.revertedWith('claim: Claim period not started yet');
    });

    it("Should NOT claim if the sender is not the investor and is not one of the wallets", async function () {
        await expect(lendMCRT.connect(owner).claim()).to.be.revertedWith('claim: Caller not authorized to claim');
    });

    it("Should NOT claim if the sender is the investor and there are no remaing amounts", async function () {
        const investorBalance = +(await mcrt.balanceOf(investor.address));

        const expectedClaimAmount = investorBalance + investmentAmount;
        await expect(lendMCRT.connect(investor).claim()).to.emit(lendMCRT, 'Claim');

        expect(+(await mcrt.balanceOf(investor.address))).to.be.equal(expectedClaimAmount);
        expect(+(await gameWallet.pBalance(lendMCRT.address))).to.be.equal(0);

        // TRY TO CLAIM AGAIN
        await expect(lendMCRT.connect(investor).claim()).to.be.revertedWith('claim: game wallet balance is 0');
    });

    it("Should claim if the sender is the investor and there are no wins and no losses", async function () {
        // INVESTMENT = 5000000000
        // The investor will be able to reclaim his whole invested amount
        const investorBalance = +(await mcrt.balanceOf(investor.address));

        const expectedClaimAmount = investorBalance + investmentAmount;
        await expect(lendMCRT.connect(investor).claim()).to.emit(lendMCRT, 'Claim');

        expect(+(await mcrt.balanceOf(investor.address))).to.be.equal(expectedClaimAmount);
        expect(+(await gameWallet.pBalance(lendMCRT.address))).to.be.equal(0);
        expect(+(await mcrt.balanceOf(lendMCRT.address))).to.be.equal(0);
    });

    it("Should claim for one participant and the investor when there are wins", async function () {
        // INVESTMENT = 5000000000
        // The investor will be able to reclaim his whole invested amount PLUS 10% of the wins

        // WIN PRIZE 
        const entryFee = 10 * 1e9;

        // SENDS SOME FUNDS TO ANOTHER USER TO JOIN IN THE GAME VS LendMCRT CONTRACT
        await mcrt.connect(owner).transfer(player5.address, entryFee);
        await mcrt.connect(player5).approve(gameWallet.address, entryFee);
        await gameWallet.connect(player5).manageBalance(true, entryFee);

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
                    account: player5.address,
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
        let remaining = gameWalletBalance - investmentAmount;

        // CALCULATE THE INVESTOR CLAIM AMOUNT
        let investorRemainingPercentage = remaining * investorPercentage / 100;
        remaining = remaining - investorRemainingPercentage;
        const investorbBalance = +(await mcrt.balanceOf(investor.address));
        const expectedInvestorBalance = investorbBalance + investorRemainingPercentage + investmentAmount;

        // CALCULATE THE PARTICIPANT CLAIM AMOUNT
        const bobBalance = +(await mcrt.balanceOf(player1.address));
        const expectedParticipantBalance = bobBalance + (remaining / wallets.length);

        // A WALLET CLAIMS ITS PART
        await expect(lendMCRT.connect(player1).claim()).to.emit(lendMCRT, 'Claim');
        expect(+(await mcrt.balanceOf(player1.address))).to.be.equal(expectedParticipantBalance);
        expect(+(await mcrt.balanceOf(investor.address))).to.be.equal(expectedInvestorBalance);
        expect(+(await mcrt.balanceOf(lendMCRT.address))).to.be.equal(0);


        // PLAYER 1 TRIES TO CLAIM AGAIN
        await expect(lendMCRT.connect(player1).claim()).to.be.revertedWith('claim: game wallet balance is 0');
    });

    it("Should claim for one participant and the investor when there are wins and gamewallet is re-filled", async function () {
        // INVESTMENT = 5000000000
        // The investor will be able to reclaim his whole invested amount PLUS 10% of the wins and another 10% of the second winning

        // WIN PRIZE 
        let entryFee = 10 * 1e9;

        // SENDS SOME FUNDS TO ANOTHER USER TO JOIN IN THE GAME VS LendMCRT CONTRACT
        await mcrt.connect(owner).transfer(player5.address, entryFee);
        await mcrt.connect(player5).approve(gameWallet.address, entryFee);
        await gameWallet.connect(player5).manageBalance(true, entryFee);

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
                    account: player5.address,
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
        let remaining = gameWalletBalance - investmentAmount;

        // CALCULATE THE INVESTOR CLAIM AMOUNT
        let investorRemainingPercentage = remaining * investorPercentage / 100;
        remaining = remaining - investorRemainingPercentage;
        let investorbBalance = +(await mcrt.balanceOf(investor.address));
        let expectedInvestorBalance = investorbBalance + investorRemainingPercentage + investmentAmount;

        // CALCULATE THE PARTICIPANT CLAIM AMOUNT
        let bobBalance = +(await mcrt.balanceOf(player1.address));
        let expectedParticipantBalance = bobBalance + (remaining / wallets.length);

        // A WALLET CLAIMS ITS PART

        await expect(lendMCRT.connect(player1).claim()).to.emit(lendMCRT, 'Claim');
        expect(+(await mcrt.balanceOf(player1.address))).to.be.equal(expectedParticipantBalance);
        expect(+(await mcrt.balanceOf(player4.address))).to.be.equal(expectedParticipantBalance);
        expect(+(await mcrt.balanceOf(player3.address))).to.be.equal(expectedParticipantBalance);
        expect(+(await mcrt.balanceOf(player4.address))).to.be.equal(expectedParticipantBalance);
        expect(+(await mcrt.balanceOf(investor.address))).to.be.equal(expectedInvestorBalance);
        expect(+(await mcrt.balanceOf(lendMCRT.address))).to.be.equal(0);

        // PLAYER 1 TRIES TO CLAIM AGAIN
        await expect(lendMCRT.connect(player1).claim()).to.be.revertedWith('claim: game wallet balance is 0');

        // WIN PRIZE 
        entryFee = 5 * 1e9;

        // SENDS SOME FUNDS TO ANOTHER USER TO JOIN IN THE GAME VS LendMCRT CONTRACT
        await mcrt.connect(owner).transfer(player5.address, entryFee);
        await mcrt.connect(player5).approve(gameWallet.address, entryFee);
        await gameWallet.connect(player5).manageBalance(true, entryFee);

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
                    account: player5.address,
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
        remaining = gameWalletBalance;

        // CALCULATE THE INVESTOR CLAIM AMOUNT
        investorRemainingPercentage = remaining * investorPercentage / 100;
        remaining = remaining - investorRemainingPercentage;
        investorbBalance = +(await mcrt.balanceOf(investor.address));
        expectedInvestorBalance = investorbBalance + investorRemainingPercentage;

        // CALCULATE THE PARTICIPANT CLAIM AMOUNT
        bobBalance = +(await mcrt.balanceOf(player1.address));
        expectedParticipantBalance = bobBalance + (remaining / wallets.length);

        // THW INVESTOR CLAIMS ITS PART
        await expect(lendMCRT.connect(investor).claim()).to.emit(lendMCRT, 'Claim');
        expect(+(await mcrt.balanceOf(investor.address))).to.be.equal(expectedInvestorBalance);
        expect(+(await mcrt.balanceOf(player1.address))).to.be.equal(expectedParticipantBalance);
        expect(+(await mcrt.balanceOf(player4.address))).to.be.equal(expectedParticipantBalance);
        expect(+(await mcrt.balanceOf(player3.address))).to.be.equal(expectedParticipantBalance);
        expect(+(await mcrt.balanceOf(player4.address))).to.be.equal(expectedParticipantBalance);
        expect(+(await mcrt.balanceOf(lendMCRT.address))).to.be.equal(0);
    });


});
