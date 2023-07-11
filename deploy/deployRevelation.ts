import hre, { ethers } from "hardhat";

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

  // DEPLOY
  console.log("START DEPLOY...");
  let contract = await Revelation.connect(owner).deploy();
  contract = await contract.deployed();
  await new Promise((resolve) => setTimeout(resolve, 2000));
  console.log(`Contract deployed to ${contract.address}`);

  // INITIALISE
  console.log("INITIALIZING CONTRACT...");
  let tx = await contract
    .connect(owner)
    .initialize(collectionName, symbol, supply, treasureAddress, signerAddress);
  await tx.wait();
  await new Promise((resolve) => setTimeout(resolve, 2000));
  console.log("CONTRACT INITIALIZED.");

  // const contractAddress = process.env.REVELATION_NFT_CONTRACT_ADDRESS || "";
  // const contract = Revelation.attach(contractAddress); // The deployed contract address);

  // SET MINTER
  console.log("SETTING MINTER...");
  tx = await contract.connect(owner).setMinter(ownerAddress, true);
  await tx.wait();
  await new Promise((resolve) => setTimeout(resolve, 2000));
  console.log("MINTER SET");

  // SET BASE URI
  console.log("SET BASE TOKEN URI...");
  tx = await contract
    .connect(owner)
    .setBaseURI(process.env.REVELATION_NFT_BASE_URI);

  await tx.wait();
  await new Promise((resolve) => setTimeout(resolve, 2000));
  console.log("TOKEN URI SET.");

  // VERIFICATION
  console.log("START VERIFICATION...");
  await hre.run("verify:verify", {
    address: contract.address,
    constructorArguments: [],
  });
  console.log("CONTRACT VERIFIED");

  //TRANSFER OWNERSHIP
  console.log("TRANSFERRING OWNERSHIP...");
  tx = await contract.connect(owner).transferOwnership(ownerAddress);
  await tx.wait();
  console.log("Owner", await contract.owner());
  console.log("Done.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
