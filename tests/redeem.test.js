const {expectRevert} = require("@openzeppelin/test-helpers");
const {expect} = require("chai");
const hre = require("hardhat");
const {ethers} = require("hardhat");

const unlockAccount = async (address) => {
  await hre.network.provider.send("hardhat_impersonateAccount", [address]);
  return hre.ethers.provider.getSigner(address);
};

const forkNetwork = async () => {
  await hre.network.provider.request({
    method: "hardhat_reset",
    params: [
      {
        forking: {
          jsonRpcUrl: "https://rpc.ankr.com/bsc",
        },
      },
    ],
  });
};

describe("MCRTNFT & Point Redeem Test", function () {
  before("Deploy contract", async function () {
    await forkNetwork();
    const [owner, alice, bob, tom, treasury] = await ethers.getSigners();

    this.pointOwner = await unlockAccount("0x360da270f5301be24232ee6ca551ed33b94cf7a2");
    this.whaleWallet = await unlockAccount("0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c");
    this.nftOwner = await unlockAccount("0xe422FcFB60D213A8d555511E82E9A8B0D728c9F0");

    const CT_NFT = "0xBF4D4886554a5FDEFFf07aeA90EC37d24260E7A7";
    const CT_POINT = "0xB54Ed53e436991CBf572339B245Bd1cdc8Dc2eAd";

    this.magicNFT = await ethers.getContractAt("MagicNFT", CT_NFT);
    this.point = await ethers.getContractAt("Points", CT_POINT);

    const NFTRedeem = await ethers.getContractFactory("NFTRedeem");
    this.nftRedeem = await NFTRedeem.deploy();
    await this.nftRedeem.initialize(CT_POINT, CT_NFT);

    // Send ehter to pointOwner
    await this.whaleWallet.sendTransaction({
      to: this.pointOwner._address,
      value: ethers.utils.parseEther("10"), // Sends exactly 1.0 ether
    });

    await this.whaleWallet.sendTransaction({
      to: this.nftOwner._address,
      value: ethers.utils.parseEther("10"), // Sends exactly 1.0 ether
    });

    // approve points
    await this.point.connect(this.pointOwner).approvePoints(this.nftRedeem.address, 0, 1, 0);

    // set minter
    await this.magicNFT.connect(this.nftOwner).setMinter(this.nftRedeem.address, true);

    // Final
    await this.nftRedeem.connect(this.pointOwner).redeem(1);
  });

  describe("should set correct state variables", function () {
    it("Check redeem feature", async function () {});
  });
});
