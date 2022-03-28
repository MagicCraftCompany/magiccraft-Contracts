const {expectRevert, time, BN, snapshot, expectEvent} = require("@openzeppelin/test-helpers");
const {equal, expect} = require("chai");
const {BigNumber} = require("ethers");
const hre = require("hardhat");
const {web3: any} = require("hardhat");
const PointArt = hre.artifacts.require("Points");
const MCRTStakeArt = hre.artifacts.require("MCRTStake");
const MCRTTokenArt = hre.artifacts.require("MCRTToken");

const toBN = (n) => new BN(n);
const E18 = toBN(10).pow(toBN(18));

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
    this.MCRTStake = await MCRTStakeArt.new(this.MCRTToken.address, this.Point.address);

    // Transfer rewards tokens to staking contract
    this.totalReward = 20000;
    await this.MCRTToken.approve(this.MCRTStake.address, this.totalReward);
    await this.MCRTStake.ADDFUNDS(this.totalReward);

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
    it("(1) check totalAmountForReward variable", async function () {
      expect((await this.MCRTStake.totalAmountForReward()).toString()).to.eq(String(this.totalReward));
    });

    it("(2) check MCRTStake contract address", async function () {
      expect(await this.MCRTStake.MCRT()).to.equal(this.MCRTToken.address);
    });

    it("(3) check Points contract address", async function () {
      expect(await this.MCRTStake.Points()).to.equal(this.Point.address);
    });

    // it("(4) check MCRTPrice variable", async function () {
    //   expect((await this.MCRTStake.MCRTPrice()).toString()).to.equal("5");
    // });

    // it("(5) check MCRTDecimals variable", async function () {
    //   expect((await this.MCRTStake.MCRTDecimals()).toString()).to.equal("18");
    // });

    // it("(6) check PointPrice variable", async function () {
    //   expect((await this.MCRTStake.PointPrice()).toString()).to.equal("2");
    // });

    // it("(7) check PointDecimals variable", async function () {
    //   expect((await this.MCRTStake.PointDecimals()).toString()).to.equal("18");
    // });
  });

  describe("should claim & withdraw the correct reward amount", function () {
    it("test claim workflow for 30 days", async function () {
      await this.MCRTStake.STAKE(this.alice, toBN(1000).mul(E18).toString(), 30, 0, {from: this.alice});
      await time.increase(30 * 3600 * 24);

      await this.MCRTStake.ClaimRewardPerPeriod(30, 0, {from: this.alice});

      expect((await this.MCRTToken.balanceOf(this.alice)).toString()).to.equal(
        toBN(250).mul(E18).mul(30).div(365).toString()
      );
    });

    it("test withdraw (alice) amount", async function () {
      await this.MCRTStake.WithdrawForStakingPerPeriod(30, 0, {from: this.alice});

      expect((await this.MCRTToken.balanceOf(this.alice)).toString()).to.equal(
        toBN(250).mul(E18).mul(30).div(365).toString()
      );
    });

    it("test claim function for 90, 180 days pools", async function () {
      await this.MCRTStake.STAKE(this.bob, toBN(1000).mul(E18).toString(), 90, 0, {from: this.bob});
      await this.MCRTStake.STAKE(this.carol, toBN(1000).mul(E18).toString(), 180, 0, {from: this.carol});

      // after 90 days
      await time.increase(90 * 3600 * 24);
      await this.MCRTStake.ClaimRewardPerPeriod(90, 0, {from: this.bob});

      // after 180 days
      await time.increase(90 * 3600 * 24);

      await this.MCRTStake.ClaimRewardPerPeriod(30, 0, {from: this.bob});
      await this.MCRTStake.ClaimRewardPerPeriod(90, 0, {from: this.bob});

      expect((await this.MCRTToken.balanceOf(this.bob)).toString()).to.equal(
        toBN(1000 * 180)
          .mul(E18)
          .div(toBN(365))
          .toString()
      ) &&
        expect((await this.MCRTToken.balanceOf(this.carol)).toString()).to.equal(
          toBN(750 * 180)
            .mul(E18)
            .div(toBN(365))
            .toString()
        );
    });

    it("test withdraw (bob) amounts", async function () {
      const withdraw = await this.MCRTStake.WithdrawForStakingPerPeriod(90, 0, {from: this.bob});

      expectEvent(withdraw, "UNSTAKED", {
        staker: this.bob,
        LockingPeriod: 90,
        tokens: toBN(1000).mul(E18),
      });
    });

    it("test withdraw (carol) amounts", async function () {
      const widthraw = await this.MCRTStake.WithdrawForStakingPerPeriod(180, 0, {from: this.carol});

      expectEvent(widthraw, "UNSTAKED", {
        staker: this.carol,
        LockingPeriod: 180,
        tokens: toBN(1000).mul(E18),
      });
    });
  });
});
