import { BigNumber, Contract, ContractFactory } from "ethers";
// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
// When running the script with `hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
import hre, { ethers } from "hardhat";

async function deploy() {
  // Deploy Point
  const Point: ContractFactory = await ethers.getContractFactory("Points");
  const point: Contract = await Point.deploy();
  console.log("Point was deployed to: ", point.address);

  // Deploy MCRT
  const MCRTToken: ContractFactory = await ethers.getContractFactory(
    "MCRTToken"
  );
  const mcrt: Contract = await MCRTToken.deploy();
  console.log("MCRTToken was deployed to: ", mcrt.address);

  // Deploy MCRTStaking
  const MCRTStaking: ContractFactory = await ethers.getContractFactory(
    "MCRTStaking"
  );
  const mcrtStaking: Contract = await MCRTStaking.deploy();
  console.log("MCRTStaking was deployed to: ", mcrtStaking.address);

  // Approve contracts
  await hre.run("verify:verify", {
    address: point.address,
    constructorArguments: [],
  });
  await hre.run("verify:verify", {
    address: mcrt.address,
    constructorArguments: [],
  });
  await hre.run("verify:verify", {
    address: mcrtStaking.address,
    constructorArguments: [],
  });

  // Set Parameters
  const dayTime = 3600 * 24;
  const totalReward = 20000000;
  await mcrtStaking.initialize(
    "0x6c139f04A9382b7FB394834Dd75a609F64d8AC3b",
    "0xe3557d084B835F4eb8C558d95E81aE6e7E56C069",
    1e17
  );
  await mcrtStaking.addTokenRewards(
    BigNumber.from(totalReward).mul(BigNumber.from(10).pow(18)).toString()
  );
  await mcrtStaking.setBonusMultiplier(
    [
      30 * dayTime,
      90 * dayTime,
      180 * dayTime,
      365 * dayTime,
      365 * 3 * dayTime,
      365 * 5 * dayTime,
    ],
    [
      BigNumber.from(125).mul(BigNumber.from(10).pow(9)).toString(),
      BigNumber.from(150).mul(BigNumber.from(10).pow(9)).toString(),
      BigNumber.from(175).mul(BigNumber.from(10).pow(9)).toString(),
      BigNumber.from(200).mul(BigNumber.from(10).pow(9)).toString(),
      BigNumber.from(250).mul(BigNumber.from(10).pow(9)).toString(),
      BigNumber.from(300).mul(BigNumber.from(10).pow(9)).toString(),
    ]
  );
  await mcrtStaking.setPointReward(180 * dayTime, [1, 0, 0]);
  await mcrtStaking.setPointReward(365 * dayTime, [0, 1, 0]);
  await mcrtStaking.setPointReward(365 * 3 * dayTime, [0, 0, 1]);
  await mcrtStaking.setPointReward(365 * 5 * dayTime, [0, 0, 2]);
  await mcrtStaking.setMinStakeTokensForPoint(
    [180 * dayTime, 365 * dayTime, 365 * 3 * dayTime, 365 * 5 * dayTime],
    [
      BigNumber.from(1000).mul(BigNumber.from(10).pow(18)).toString(),
      BigNumber.from(2000).mul(BigNumber.from(10).pow(18)).toString(),
      BigNumber.from(3000).mul(BigNumber.from(10).pow(18)).toString(),
      BigNumber.from(4000).mul(BigNumber.from(10).pow(18)).toString(),
    ]
  );
}

async function main(): Promise<void> {
  await deploy();
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error: Error) => {
    console.error(error);
    process.exit(1);
  });
