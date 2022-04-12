const {expectRevert} = require("@openzeppelin/test-helpers");
const {expect} = require("chai");
const hre = require("hardhat");
const MCRTNFTArt = hre.artifacts.require("MCRTNFT");

describe("MCRTNFT Contract", function () {
  before("Deploy contract", async function () {
    const [owner, alice, bob, carol] = await web3.eth.getAccounts();
    this.Max_Supply = 10000;
    this.owner = owner;
    this.alice = alice;
    this.bob = bob;
    this.carol = carol;
    this.MCRTNFT = await MCRTNFTArt.new("MCRT NFT", "MCRTNFT", this.Max_Supply);

    await this.MCRTNFT.setBaseURI("baseuri-string");
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
      expect((await this.MCRTNFT.baseURI()).toString()).to.eq("baseuri-string");
    });
  });

  describe("check mint function workflows", function () {
    it("test adminMint", async function () {
      await this.MCRTNFT.adminMint(1, this.alice);

      expect((await this.MCRTNFT.balanceOf(this.alice)).toString()).to.eq("1");
    });

    it("test multiMint", async function () {
      await this.MCRTNFT.multiMint([this.bob, this.carol]);

      expect((await this.MCRTNFT.balanceOf(this.bob)).toString()).to.eq("1");
      expect((await this.MCRTNFT.balanceOf(this.carol)).toString()).to.eq("1");
    });

    it("revert adminMint from not owner", async function () {
      await expectRevert(this.MCRTNFT.adminMint(1, this.alice, {from: this.bob}), "Ownable: caller is not the owner");
    });

    it("revert multiMint from not owner", async function () {
      await expectRevert(
        this.MCRTNFT.multiMint([this.alice, this.bob], {from: this.bob}),
        "Ownable: caller is not the owner"
      );
    });

    it("revert multiMint from not minter", async function () {
      await expectRevert(this.MCRTNFT.mint(1, this.alice, {from: this.bob}), "NFT: Invalid minter");
    });
  });

  describe("transfer function workflows", function () {
    it("transfer items successfully", async function () {
      await this.MCRTNFT.safeTransferFrom(this.alice, this.carol, 1, {from: this.alice});
      await this.MCRTNFT.safeTransferFrom(this.bob, this.carol, 2, {from: this.bob});
      expect((await this.MCRTNFT.balanceOf(this.carol)).toString()).to.eq("3");
    });
  });
});
