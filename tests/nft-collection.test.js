const {expectRevert} = require("@openzeppelin/test-helpers");
const {expect} = require("chai");
const hre = require("hardhat");
const MCRTNFTArt = hre.artifacts.require("MagicNFT");

describe("MCRTNFT Contract", function () {
  before("Deploy contract", async function () {
    const [owner, alice, bob, carol] = await web3.eth.getAccounts();
    this.Max_Supply = 10000;
    this.owner = owner;
    this.alice = alice;
    this.bob = bob;
    this.carol = carol;
    this.MCRTNFT = await MCRTNFTArt.new();
    await this.MCRTNFT.initialize("MCRT NFT", "MCRTNFT", this.Max_Supply, this.owner, this.owner);

    await this.MCRTNFT.setBaseURI("baseuri-string");

    await this.MCRTNFT.ownerMint(3);
    await this.MCRTNFT.safeTransferFrom(this.owner, this.alice, 1, {from: this.owner});
    await this.MCRTNFT.safeTransferFrom(this.owner, this.bob, 2, {from: this.owner});
  });

  beforeEach(async function () {});

  describe("should set correct state variables", function () {
    it("(1) check name variable", async function () {
      expect((await this.MCRTNFT.name()).toString()).to.eq("MCRT NFT");
    });

    it("(2) check symbol variable", async function () {
      expect((await this.MCRTNFT.symbol()).toString()).to.eq("MCRTNFT");
    });

    it("(3) check baseURI variable", async function () {
      expect((await this.MCRTNFT.baseTokenURI()).toString()).to.eq("baseuri-string");
    });
  });

  describe("transfer function workflows", function () {
    it("transfer items successfully", async function () {
      await this.MCRTNFT.safeTransferFrom(this.alice, this.carol, 1, {from: this.alice});
      await this.MCRTNFT.safeTransferFrom(this.bob, this.carol, 2, {from: this.bob});
      expect((await this.MCRTNFT.balanceOf(this.carol)).toString()).to.eq("2");
    });
  });
});
