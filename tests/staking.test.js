const {expectRevert, time} = require("@openzeppelin/test-helpers");
const {equal} = require("chai");
const hre = require("hardhat");
const {web3: any} = require("hardhat");
const PointArt = hre.artifacts.require("Points");
const MCRTStakeArt = hre.artifacts.require("MCRTStake");
const MCRTTokenArt = hre.artifacts.require("MCRTToken");

describe("Shop Contract", function () {
  before("Deploy contract", async function () {
    const [owner, alice, bob, carol, rewardHolder] = await web3.eth.getAccounts();
    this.owner = owner;
    this.alice = alice;
    this.bob = bob;
    this.carol = carol;
    this.rewardHolder = rewardHolder;

    this.Point = await PointArt.new();
    this.MCRTToken = await MCRTTokenArt.new();
    this.MCRTStake = await MCRTStakeArt.new(this.MCRTToken.address, this.Point.address);

    await this.MCRTStake.setPointPrice(2, 18);
    await this.MCRTStake.setMCRTPrice(5, 18);

    await this.MCRTToken.transfer(this.alice, 1000);
    await this.MCRTToken.transfer(this.bob, 1000);
    await this.MCRTToken.transfer(this.carol, 1000);
    await this.MCRTToken.approve(this.MCRTStake.address, ethers.constants.MaxUint256, {from: this.alice});
    await this.MCRTToken.approve(this.MCRTStake.address, ethers.constants.MaxUint256, {from: this.bob});
    await this.MCRTToken.approve(this.MCRTStake.address, ethers.constants.MaxUint256, {from: this.carol});
  });

  beforeEach(async function () {
    //
  });

  it("should set correct state variables", async function () {
    expect(await this.MCRTStake.MCRT()).to.equal(this.MCRTToken.address);
  });

  it("test claimable calculation function", async function () {
    await this.MCRTStake.STAKE(this.alice, 100, 30, 0, {from: this.alice});
    console.log(await this.MCRTStake.stakers(this.alice, 30));
    await time.increase(30 * 3600 * 24);

    await this.MCRTStake.STAKE(this.alice, 100, 30, 0, {from: this.alice});
    console.log(await this.MCRTStake.stakers(this.alice, 30));
  });

  //   it("test updateItem functions", async function () {
  //     await this.Shop.updateItemPrice(this.Orb.address, 10, 200, {
  //       from: this.alice,
  //     });
  //     await this.Shop.updateItemAmount(this.Orb.address, 10, 4, {
  //       from: this.alice,
  //     });
  //     await this.Shop.updateItemLimit(this.Orb.address, 10, 2, {
  //       from: this.alice,
  //     });

  //     const itemInfo = await this.Shop.getItem(this.Orb.address, 10);
  //     expect(itemInfo._initialized).to.equal(true);
  //     expect(itemInfo._owner).to.equal(this.alice);
  //     expect(itemInfo._amount.toString()).to.equal("4");
  //     expect(itemInfo._limit.toString()).to.equal("2");
  //     expect(itemInfo._price.toString()).to.equal("200");
  //   });

  //   it("test updateRewardAddress", async function () {
  //     await expectRevert(
  //       this.Shop.updateRewardAddress(this.bob, {
  //         from: this.bob,
  //       }),
  //       "Ownable: caller is not the owner"
  //     );
  //   });

  //   it("test updateStartTime", async function () {
  //     await expectRevert(
  //       this.Shop.updateStartTime(1000, {
  //         from: this.bob,
  //       }),
  //       "Ownable: caller is not the owner"
  //     );
  //     await expectRevert(
  //       this.Shop.updateStartTime(1000, {
  //         from: this.alice,
  //       }),
  //       "invalid start time"
  //     );
  //   });

  //   it("test purchase workflow", async function () {
  //     await this.TCP.transfer(this.carol, 2000);
  //     await this.TCP.approve(this.Shop.address, 2000, {from: this.carol});
  //     const itemInfo = await this.Shop.getItem(this.Orb.address, 10);
  //     await this.Shop.purchase(this.Orb.address, 10, 2, {from: this.carol});

  //     expect((await this.TCP.balanceOf(this.carol)).toString()).to.equal("1600");
  //     expect((await this.Orb.balanceOf(this.carol, 10)).toString()).to.equal("2");
  //     await expectRevert(
  //       this.Shop.purchase(this.Orb.address, 10, 2, {from: this.carol}),
  //       "purchase: User limit exceeded"
  //     );
  //   });

  //   it("test cancelItem", async function () {
  //     await this.Shop.cancelItem(this.Orb.address, 10);

  //     const itemInfo = await this.Shop.getItem(this.Orb.address, 10);
  //     expect(itemInfo._initialized).to.equal(false);
  //     expect(itemInfo._owner).to.equal("0x0000000000000000000000000000000000000000");
  //     expect(itemInfo._amount.toString()).to.equal("0");
  //     expect(itemInfo._limit.toString()).to.equal("0");
  //     expect(itemInfo._price.toString()).to.equal("0");
  //   });

  //   it("test multiple drops", async function () {
  //     expect((await this.Shop.userLimits(0, this.carol, 10)).toString()).to.equal("2");

  //     await this.Shop.startNewDrop(Math.floor((new Date().getTime() + 100) / 1000));
  //     expect((await this.Shop.dropNo()).toString()).to.equal("1");
  //     expect((await this.Shop.userLimits(1, this.carol, 10)).toString()).to.equal("0");
  //   });

  //   it("test paused", async function () {
  //     await this.Shop.toggleIsPaused();

  //     await expectRevert(this.Shop.purchase(this.Orb.address, 10, 2, {from: this.carol}), "already paused");
  //   });
});
