// scripts/upgrade_box.js
const { ethers, upgrades } = require("hardhat");

async function main() {
  const RevelationUpgraded = await ethers.getContractFactory("Revelation");
  console.log("Upgrading Revelation...");
  await upgrades.upgradeProxy(
    process.env.REVELATION_NFT_CONTRACT_ADDRESS,
    RevelationUpgraded
  );
  console.log("Revelation upgraded");
}

main();
