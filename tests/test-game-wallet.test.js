const {expect} = require("chai");
const {ethers} = require("hardhat");
const {expectRevert} = require("@openzeppelin/test-helpers");

const {advanceTime, currentTimestamp} = require("./utils/utils");
const {WhiteList} = require("./utils/sinature");

describe("Starting the test suite", () => {
  let owner, alice, bob, gameWallet, mcrt, treasury;
  before(async () => {
    [owner, alice, bob, treasury] = await ethers.getSigners();

    const MCRTToken = await ethers.getContractFactory("MCRTToken");
    mcrt = await MCRTToken.deploy("MCRT", "MCRT", 9);

    const GameWallet = await ethers.getContractFactory("GameWallet");
    gameWallet = await GameWallet.deploy();
    await gameWallet.initialize(mcrt.address);

    await mcrt.connect(owner).transfer(alice.address, "1000000000000"); // 1000 MCRT
    await mcrt.connect(owner).transfer(bob.address, "1000000000000"); // 1000 MCRT

    await gameWallet.setTreasury(treasury.address);
    await gameWallet.setPrizeFee(1000);

    console.log("MCRT: ", mcrt.address);
    console.log("GameWallet: ", gameWallet.address);
  });

  it("Test: Deposit", async function () {
    await mcrt.connect(alice).approve(gameWallet.address, "100000000000000");
    await mcrt.connect(bob).approve(gameWallet.address, "100000000000000");

    await gameWallet.connect(alice).deposit("1000000000000");
    await gameWallet.connect(bob).deposit("1000000000000");

    expect(await gameWallet.pBalance(alice.address)).to.eq("1000000000000") &&
      expect(await gameWallet.pBalance(bob.address)).to.eq("1000000000000");
  });

  it("Test: WinPrize", async function () {
    await gameWallet
      .connect(owner)
      .winPrize([alice.address, bob.address], ["10000000000", "10000000000"], [alice.address]);

    expect(await gameWallet.pBalance(treasury.address)).to.eq("2000000000") &&
      expect(await gameWallet.pBalance(alice.address)).to.eq("1008000000000") &&
      expect(await gameWallet.pBalance(bob.address)).to.eq("990000000000");
  });

  it("Test: Withdraw when locked", async function () {
    await gameWallet.connect(owner).lockAccounts([bob.address], [true]);

    await expectRevert(gameWallet.connect(bob).withdraw(0), "Account locked for withdraw");
  });

  it("Test: Withdraw when balance is not enough", async function () {
    await expectRevert(gameWallet.connect(alice).withdraw("90000000000000"), "Not enough token deposited");
  });

  it("Test: Withdraw", async function () {
    await gameWallet.connect(alice).withdraw("90000000000");

    expect(await gameWallet.pBalance(alice.address)).to.eq("918000000000");
  });
});
