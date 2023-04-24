import { resolve } from "path";
require("dotenv").config();

import "@nomiclabs/hardhat-waffle";
import "@nomiclabs/hardhat-etherscan";
import "@nomiclabs/hardhat-truffle5";
import "@openzeppelin/hardhat-upgrades";
import "hardhat-typechain";
import "solidity-coverage";
import "hardhat-contract-sizer";

//if (!process.env.MNEMONICS) throw new Error("MNEMONICS missing from .env file");
if (!process.env.MAINNET_PRIVKEY)
  throw new Error("MAINNET_PRIVKEY missing from .env file");

//const mnemonics = process.env.MNEMONICS;

const config = {
  defaultNetwork: "hardhat",
  networks: {
    hardhat: {
      allowUnlimitedContractSize: true,
      blockGasLimit: 100000000,
      gas: 100000000,
    },
    bsc: {
      url: `https://bsc-dataseed.binance.org/`,
      accounts: [process.env.MAINNET_PRIVKEY],
    },
    testnet: {
      url: `https://data-seed-prebsc-1-s1.binance.org:8545/`,
      accounts: [process.env.MAINNET_PRIVKEY],
    },
  },
  etherscan: {
    apiKey: process.env.BSCSCAN_API,
  },
  paths: {
    artifacts: "./artifacts",
    cache: "./cache",
    sources: "./contracts",
    tests: "./tests",
  },
  solidity: {
    compilers: [
      {
        version: "0.6.6",
      },
      {
        version: "0.6.12",
      },
      {
        version: "0.7.4",
        settings: {},
      },
      {
        version: "0.8.0",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
      {
        version: "0.8.7",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
    ],
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  mocha: {
    timeout: 2000000000,
  },
  typechain: {
    outDir: "types/contracts",
    target: "truffle-v5",
  },
};

export default config;
