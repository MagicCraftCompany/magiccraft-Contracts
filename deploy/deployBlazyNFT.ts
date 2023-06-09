import { ethers, upgrades } from "hardhat";

async function main() {
  const BlazyNFT = await ethers.getContractFactory("BlazyNFT");
  const owner = ethers.provider.getSigner();

  // DEPLOY
  let contract = await BlazyNFT.connect(owner).deploy();

  contract = await contract.deployed();
  console.log(`Contract deployed to ${contract.address}`);

  await new Promise((resolve) => setTimeout(resolve, 2000));

  // INITIALISE
  await contract
    .connect(owner)
    .initialize(
      "Blazy",
      "BlazyNFT",
      9999,
      "0xe422fcfb60d213a8d555511e82e9a8b0d728c9f0",
      "0x200d913ba74f3f7b9d9f13745b3cd3692ba77e3a"
    );

  console.log("Contract initialized");

  // SET BASE URI
  await contract
    .connect(owner)
    .setBaseURI(
      "https://magiccraft.mypinata.cloud/ipfs/QmduyB25MpRRWFpQNNsf8sHR412znDXZQpSZYq2YZpauA4"
    );

  console.log("Done.");
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
