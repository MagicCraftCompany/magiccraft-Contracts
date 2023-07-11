import hre from "hardhat";

async function main() {
  await hre.run("verify:verify", {
    address: process.env.REVELATION_NFT_CONTRACT_ADDRESS,
    constructorArguments: [],
  });
  console.log("CONTRACT VERIFIED");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
