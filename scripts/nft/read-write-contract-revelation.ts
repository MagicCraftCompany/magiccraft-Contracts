import hre, { ethers, upgrades } from "hardhat";

// Revelation, ticker RVL
const treasureAddress = "0xe422fcfb60d213a8d555511e82e9a8b0d728c9f0";
const signerAddress = "0x200d913ba74f3f7b9d9f13745b3cd3692ba77e3a";
const ownerAddress = "0x236E37E910F771811bE34746046C7Af5D12A8d39"; // multisig wallet gnosis
const collectionName = "MagicCraft Revelation Characters";
const symbol = "RVL";
const supply = 9999;

async function main() {
  const Revelation = await ethers.getContractFactory("Revelation");
  const owner = ethers.provider.getSigner();

  const contractAddress = process.env.REVELATION_NFT_CONTRACT_ADDRESS || "";
  const contract = Revelation.attach(contractAddress); // The deployed contract address);

  // SET MINTER
  console.log("SETTING MINTER...");
  let tx = await contract.connect(owner).setMinter(contract.address, true);
  await tx.wait();
  await new Promise((resolve) => setTimeout(resolve, 2000));
  console.log("MINTER SET");

  //TRANSFER OWNERSHIP
  console.log("TRANSFERRING OWNERSHIP...");
  tx = await contract.connect(owner).transferOwnership(ownerAddress);
  await tx.wait();
  console.log("Owner", await contract.owner());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
