// scripts/upgrade_box.js
import hre, { ethers, upgrades } from "hardhat";

async function main() {
  if (!process.env.REVELATION_NFT_CONTRACT_ADDRESS) {
    throw new Error("missing REVELATION_NFT_CONTRACT_ADDRESS in env");
  }
  const RevelationUpgraded = await ethers.getContractFactory("Revelation");
  console.log("Upgrading Revelation...");
  await upgrades.upgradeProxy(
    process.env.REVELATION_NFT_CONTRACT_ADDRESS,
    RevelationUpgraded
  );
  console.log("Revelation upgraded");

  await hre.run("verify:verify", {
    address: process.env.REVELATION_NFT_CONTRACT_ADDRESS,
    constructorArguments: [],
  });
  console.log("CONTRACT VERIFIED");
}

main();
