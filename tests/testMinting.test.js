const {expect} = require("chai");
const {ethers} = require("hardhat");
const {expectRevert} = require("@openzeppelin/test-helpers");

const {advanceTime, currentTimestamp} = require("./utils/utils");
const {WhiteList} = require("./utils/sinature");

describe("Starting the test suite", () => {
  let alice, bob, nft;
  before(async () => {
    [alice, bob] = await ethers.getSigners();
    const MagicNFT = await ethers.getContractFactory("MagicNFT");
    nft = await MagicNFT.deploy();

    await nft.initialize("MagicCraft", "MCNFT", 500, alice.address, bob.address);
  });

  it("Test: Mint Success", async function () {
    const whitelist = new WhiteList({contract: nft, signer: bob});
    const whitelisted = await whitelist.createWhiteList(bob.address);
    console.log(whitelisted);

    await nft.connect(bob).whiteListMint(whitelisted, 1, {value: ethers.utils.parseEther("0.75")});

    const owner = await nft.ownerOf(1);
    expect(owner).to.equal(bob.address);
  });

  it("Test: Discount", async function () {
    const startTime = Math.floor(new Date().getTime() / 1000);

    await nft.setPublicSale(true);
    await nft.setMaxPublicMintForEach(10);
    await nft.setDiscountMaxDivider();
    await nft.setDiscountPercent(9000);
    await nft.setDiscountStartTime(startTime + 3600);
    await nft.setDiscountDuration(1);

    await advanceTime(7200);
    await nft.connect(bob).publicMint(1, {value: ethers.utils.parseEther("0.675")});

    const owner = await nft.ownerOf(2);
    expect(owner).to.equal(bob.address);

    await advanceTime(3600 * 23);

    await expectRevert(nft.connect(bob).publicMint(1, {value: ethers.utils.parseEther("0.675")}), "Pay Exact Amount");
  });
});
