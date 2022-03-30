const {expectRevert, time, BN, snapshot, expectEvent} = require("@openzeppelin/test-helpers");
const {equal, expect} = require("chai");
const {BigNumber} = require("ethers");
const hre = require("hardhat");
const {web3: any} = require("hardhat");
const PointArt = hre.artifacts.require("Points");
const MCRTStakeArt = hre.artifacts.require("MCRTStaking");
const MCRTTokenArt = hre.artifacts.require("MCRTToken");

const toBN = (n) => new BN(n);
const E18 = toBN(10).pow(toBN(18));
const E11 = toBN(10).pow(toBN(11));
const E9 = toBN(10).pow(toBN(9));

describe("MCRT Staking Contract", function () {
  before("Deploy contract", async function () {
    const [owner, alice, bob, carol, rewardHolder, user1, user2, user3] = await web3.eth.getAccounts();
    this.owner = owner;
    this.alice = alice;
    this.bob = bob;
    this.carol = carol;
    this.user1 = user1;
    this.user2 = user2;
    this.user3 = user3;
    this.rewardHolder = rewardHolder;

    this.Point = await PointArt.new();
    this.MCRTToken = await MCRTTokenArt.new();
    this.MCRTStake = await MCRTStakeArt.new();
    await this.MCRTStake.initialize(this.MCRTToken.address, this.Point.address, toBN(1).mul(E18).toString());

    // Transfer rewards tokens to staking contract
    // 30 days  : 25%
    // 90 days  : 50%
    // 180 days : 75%
    // 1 year   : 100%
    // 3 years  : 150%
    // 5 years  : 200%
    this.dayTime = 3600 * 24;

    this.totalReward = 20000000;
    await this.MCRTToken.approve(this.MCRTStake.address, toBN(this.totalReward).mul(E18).toString());
    await this.MCRTStake.addTokenRewards(toBN(this.totalReward).mul(E18).toString());
    await this.MCRTStake.setBonusMultiplier(
      [
        30 * this.dayTime,
        90 * this.dayTime,
        180 * this.dayTime,
        365 * this.dayTime,
        365 * 3 * this.dayTime,
        365 * 5 * this.dayTime,
      ],
      [
        toBN(125).mul(E9).toString(),
        toBN(150).mul(E9).toString(),
        toBN(175).mul(E9).toString(),
        toBN(200).mul(E9).toString(),
        toBN(250).mul(E9).toString(),
        toBN(300).mul(E9).toString(),
      ]
    );
    await this.MCRTStake.setPointReward(180 * this.dayTime, [1, 0, 0]);
    await this.MCRTStake.setPointReward(365 * this.dayTime, [0, 1, 0]);
    await this.MCRTStake.setPointReward(365 * 3 * this.dayTime, [0, 0, 1]);
    await this.MCRTStake.setPointReward(365 * 5 * this.dayTime, [0, 0, 2]);

    await this.MCRTStake.setMinStakeTokensForPoint(
      [180 * this.dayTime, 365 * this.dayTime, 365 * 3 * this.dayTime, 365 * 5 * this.dayTime],
      [
        toBN(175).mul(E18).toString(),
        toBN(200).mul(E18).toString(),
        toBN(250).mul(E18).toString(),
        toBN(300).mul(E18).toString(),
      ]
    );

    // Transfer & Approve tokens
    await this.MCRTToken.transfer(this.alice, toBN(1000).mul(E18).toString());
    await this.MCRTToken.transfer(this.bob, toBN(1000).mul(E18).toString());
    await this.MCRTToken.transfer(this.carol, toBN(1000).mul(E18).toString());
    await this.MCRTToken.approve(this.MCRTStake.address, ethers.constants.MaxUint256, {from: this.alice});
    await this.MCRTToken.approve(this.MCRTStake.address, ethers.constants.MaxUint256, {from: this.bob});
    await this.MCRTToken.approve(this.MCRTStake.address, ethers.constants.MaxUint256, {from: this.carol});

    // Make snapshot for current timestamp
    this.shStart = await snapshot();
  });

  beforeEach(async function () {});

  describe("should set correct state variables", function () {
    it("(1) check totalRewardsLeft variable", async function () {
      expect((await this.MCRTStake.totalRewardsLeft()).toString()).to.eq(toBN(this.totalReward).mul(E18).toString());
    });

    it("(2) check MCRTStake contract address", async function () {
      expect(await this.MCRTStake.stakingToken()).to.equal(this.MCRTToken.address);
    });

    it("(3) check Points contract address", async function () {
      expect(await this.MCRTStake.pointAddress()).to.equal(this.Point.address);
    });

    it("(4) check bonusTokenMultiplier variable", async function () {
      expect((await this.MCRTStake.bonusTokenMultiplier(30 * this.dayTime)).toString()).to.equal(
        toBN(125).mul(E9).toString()
      ) &&
        expect((await this.MCRTStake.bonusTokenMultiplier(90 * this.dayTime)).toString()).to.equal(
          toBN(150).mul(E9).toString()
        ) &&
        expect((await this.MCRTStake.bonusTokenMultiplier(180 * this.dayTime)).toString()).to.equal(
          toBN(175).mul(E9).toString()
        ) &&
        expect((await this.MCRTStake.bonusTokenMultiplier(365 * this.dayTime)).toString()).to.equal(
          toBN(200).mul(E9).toString()
        ) &&
        expect((await this.MCRTStake.bonusTokenMultiplier(365 * 3 * this.dayTime)).toString()).to.equal(
          toBN(250).mul(E9).toString()
        ) &&
        expect((await this.MCRTStake.bonusTokenMultiplier(365 * 5 * this.dayTime)).toString()).to.equal(
          toBN(300).mul(E9).toString()
        );
    });

    it("(5) check minStakeTokensForPoint variable", async function () {
      expect((await this.MCRTStake.minStakeTokensForPoint(180 * this.dayTime)).toString()).to.equal(
        toBN(175).mul(E18).toString()
      ) &&
        expect((await this.MCRTStake.minStakeTokensForPoint(365 * this.dayTime)).toString()).to.equal(
          toBN(200).mul(E18).toString()
        ) &&
        expect((await this.MCRTStake.minStakeTokensForPoint(365 * 3 * this.dayTime)).toString()).to.equal(
          toBN(250).mul(E18).toString()
        ) &&
        expect((await this.MCRTStake.minStakeTokensForPoint(365 * 5 * this.dayTime)).toString()).to.equal(
          toBN(300).mul(E18).toString()
        );
    });

    it("(6) check rewardRate variable", async function () {
      expect((await this.MCRTStake.rewardRate()).toString()).to.equal(toBN(1).mul(E18).toString());
    });

    it("(7) check stakingEnabled variable", async function () {
      expect(await this.MCRTStake.stakingEnabled()).to.equal(true);
    });
  });

  describe("should calculate the correct rewards & unstake after locktime", function () {
    it("test claimable rewards in 30 days staking pool", async function () {
      await this.MCRTStake.stake(toBN(100).mul(E18).toString(), 30 * this.dayTime, 0, {from: this.alice});
      await time.increase(3600 * 24);

      expect((await this.MCRTStake.earned(this.alice, 0)).toString()).to.equal(toBN(86400).mul(E18).toString()) &&
        expect((await this.MCRTStake.totalTokensStakedWithBonusTokens()).toString()).to.equal(
          toBN(125).mul(E18).toString()
        );
    });

    it("test claimable rewards in 180 days staking pool", async function () {
      await this.MCRTStake.stake(toBN(100).mul(E18).toString(), 180 * this.dayTime, 0, {
        from: this.alice,
      });

      await time.increase(3600 * 24);

      expect((await this.MCRTStake.rewards(this.alice, 0)).toString()).to.equal(toBN(86401).mul(E18).toString()) &&
        expect((await this.MCRTStake.rewards(this.alice, 1)).toString()).to.equal(toBN(0).mul(E18).toString()) &&
        expect((await this.MCRTStake.earned(this.alice, 1)).toString()).to.equal(
          toBN(86400).mul(toBN(175)).div(toBN(300)).mul(E18).toString()
        ) &&
        expect((await this.MCRTStake.earned(this.alice, 0)).toString()).to.equal(
          toBN(86400).mul(toBN(125)).div(toBN(300)).mul(E18).add(toBN(86401).mul(E18)).toString()
        ) &&
        expect((await this.MCRTStake.totalTokensStakedWithBonusTokens()).toString()).to.equal(
          toBN(300).mul(E18).toString()
        );
    });

    it("revert unstake before timeToUnlock", async function () {
      await expectRevert(this.MCRTStake.unstake(0, {from: this.alice}), "Not reached to timeToUnlock yet");
      await expectRevert(this.MCRTStake.unstake(1, {from: this.alice}), "Not reached to timeToUnlock yet");
    });

    it("test unstaking after timeToUnlock", async function () {
      await time.increase(3600 * 24 * 28);

      const res = await this.MCRTStake.unstake(0, {from: this.alice});
      expectEvent(res, "Unstake", {stakeId: toBN(0), unstaker: this.alice});
    });
  });
});
