const { expectRevert } = require("@openzeppelin/test-helpers");
const { expect } = require("chai");
const { BigNumber } = require("ethers");
const hre = require("hardhat");


describe("Revelation Contract", function () {
  before("Deploy contract", async function () {
    const [owner, alice, bob, carol] = await ethers.getSigners();
    const Revelation = await ethers.getContractFactory("Revelation");
    let contract = await Revelation.connect(owner).deploy();
    this.contract = await contract.deployed();
    this.Max_Supply = 9999;
    this.owner = owner;
    this.alice = alice;
    this.bob = bob;
    this.carol = carol;

    this.symbol = "RVL";
    this.name = "MagicCraft Revelation Characters";
    this.baseTokenURI = "baseuri-string";
    await this.contract.initialize(this.name, this.symbol, this.Max_Supply, this.owner.address, this.owner.address);

    // set minter
    await this.contract.setMinter(this.owner.address, true);

    await this.contract.setBaseURI(this.baseTokenURI);

    // set public sale info
    await this.contract.setPublicSale(true);
    await this.contract.setMaxPublicMintForEach(100);

    // set vc sale info
    await this.contract.setVCInfo(this.carol.address, 100);

    await this.contract.ownerMint(3);
    //console.log('contract', contract);
    await this.contract.transferFrom(this.owner.address, this.alice.address, 1, { from: this.owner.address });
    await this.contract.transferFrom(this.owner.address, this.bob.address, 2, { from: this.owner.address });
  });

  beforeEach(async function () { });

  describe("should set correct state variables", function () {
    it("(1) check name variable", async function () {
      expect((await this.contract.name()).toString()).to.eq(this.name);
    });

    it("(2) check symbol variable", async function () {
      expect((await this.contract.symbol()).toString()).to.eq(this.symbol);
    });

    it("(3) check baseURI variable", async function () {
      expect((await this.contract.baseTokenURI()).toString()).to.eq(this.baseTokenURI);
    });
  });

  describe("transfer function workflows", function () {
    it("transfer items successfully", async function () {
      await this.contract.connect(this.alice).transferFrom(this.alice.address, this.carol.address, 1);
      await this.contract.connect(this.bob).transferFrom(this.bob.address, this.carol.address, 2);
      expect((await this.contract.balanceOf(this.carol.address)).toString()).to.eq("2");
    });
  });

  describe("test public sale discount feature", function () {
    it("transfer items successfully", async function () {
      await this.contract.connect(this.carol).publicMint(109, {
        value: BigNumber.from("750000000000000000").mul(85).div(100).mul(100),
      });
      expect((await this.contract.balanceOf(this.carol.address)).toString()).to.eq("102");
    });

    it("transfer items successfully", async function () {
      await this.contract.connect(this.bob).publicMint(77, {
        value: BigNumber.from("750000000000000000").mul(77),
      });
      expect((await this.contract.balanceOf(this.bob.address)).toString()).to.eq("84");
    });
  });
});
