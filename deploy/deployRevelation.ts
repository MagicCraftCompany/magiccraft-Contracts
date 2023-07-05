import hre, { ethers } from "hardhat";

// Revelation, ticker RVL
const treasureAddress = "0xa09f6c306718e9654931A661B04BbA53Fc3C06f4";
const signerAddress = "0xa09f6c306718e9654931A661B04BbA53Fc3C06f4";
const ownerAddress = "0xa09f6c306718e9654931A661B04BbA53Fc3C06f4"; // multisig wallet gnosis safe
const collectionName = "HEROES FROGS NFT COLLECTION";
const symbol = "HFROGS";
const supply = 9999;

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
    .initialize(collectionName, symbol, supply, treasureAddress, signerAddress);
  await tx.wait();
  await new Promise((resolve) => setTimeout(resolve, 2000));
  console.log("Contract initialized");

  // const contract = Revelation.attach(
  //   "0x88Bb5450e0940a8e2D7c0Fd703d62944F9679DD9" // The deployed contract address
  // );

  // SET MINTER
  tx = await contract.connect(owner).setMinter(ownerAddress, true);
  await tx.wait();
  await new Promise((resolve) => setTimeout(resolve, 2000));
  console.log("Minter set");

  // SET BASE URI
  tx = await contract
    .connect(owner)
    .setBaseURI(process.env.REVELATION_NFT_BASE_URI);

  await tx.wait();
  await new Promise((resolve) => setTimeout(resolve, 2000));

  await hre.run("verify:verify", {
    address: contract.address,
    constructorArguments: [],
  });
  console.log("CONTRACT VERIFIED");

  console.log("Transfer Ownership.");
  // TRANSFER OWNERSHIP
  tx = await contract.connect(owner).transferOwnership(ownerAddress);
  await tx.wait();
  console.log("Owner", await contract.owner());
  console.log("Done.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
