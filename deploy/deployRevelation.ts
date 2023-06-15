import { ethers, upgrades } from "hardhat";
// Revelation, ticker RVL
async function main() {
  const Revelation = await ethers.getContractFactory("Revelation");
  const owner = ethers.provider.getSigner();

  // DEPLOY
  let contract = await Revelation.connect(owner).deploy();

  contract = await contract.deployed();
  await new Promise((resolve) => setTimeout(resolve, 2000));
  console.log(`Contract deployed to ${contract.address}`);

  // INITIALISE
  let tx = await contract
    .connect(owner)
    .initialize(
      "MagicCraft Revelation Characters",
      "RVL",
      9999,
      "0xe422fcfb60d213a8d555511e82e9a8b0d728c9f0",
      "0x200d913ba74f3f7b9d9f13745b3cd3692ba77e3a"
    );
  await tx.wait();
  await new Promise((resolve) => setTimeout(resolve, 2000));
  console.log("Contract initialized");

  // const contract = Revelation.attach(
  //   "0x88Bb5450e0940a8e2D7c0Fd703d62944F9679DD9" // The deployed contract address
  // );
  console.log("Owner", await contract.owner());

  // SET MINTER
  tx = await contract
    .connect(owner)
    .setMinter("0x236E37E910F771811bE34746046C7Af5D12A8d39", true);
  await tx.wait();
  await new Promise((resolve) => setTimeout(resolve, 2000));
  console.log("Minter set");

  // SET BASE URI
  tx = await contract
    .connect(owner)
    .setBaseURI(
      "https://magiccraft.mypinata.cloud/ipfs/QmduyB25MpRRWFpQNNsf8sHR412znDXZQpSZYq2YZpauA4"
    );

  await tx.wait();
  await new Promise((resolve) => setTimeout(resolve, 2000));

  console.log("Transfer Ownership.");
  // TRANSFER OWNERSHIP
  tx = await contract
    .connect(owner)
    .transferOwnership("0x236E37E910F771811bE34746046C7Af5D12A8d39");
  await tx.wait();
  console.log("Done.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
