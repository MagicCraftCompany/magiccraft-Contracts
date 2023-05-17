import { ethers, upgrades } from "hardhat";

async function main() {
  const GameWallet = await ethers.getContractFactory("GameWallet");

  let gameWallet = await GameWallet.connect(
    ethers.provider.getSigner()
  ).deploy();

  gameWallet = await gameWallet.deployed();

  gameWallet = gameWallet.connect(ethers.provider.getSigner());

  console.log(`Game wallet deployed to ${gameWallet.address}`);

  await new Promise((resolve) => setTimeout(resolve, 2000));

  await gameWallet.functions.initialize(
    "0x4b8285aB433D8f69CB48d5Ad62b415ed1a221e4f"
  );
  // await gameWallet.functions.setPrizeFee(1000);
  // await gameWallet.setLockDuration(600);
  // await gameWallet.setTreasury(await ethers.provider.getSigner().getAddress());

  console.log("Game wallet initialized");
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
