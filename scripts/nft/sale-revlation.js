const { ethers } = require('hardhat');
const { Chain, OpenSeaSDK } = require('opensea-js');
const HDWalletProvider = require("@truffle/hdwallet-provider");

const logger = (message) => {
    console.log('RESULT', message)
}

async function main() {
    const providerUrl = process.env.PROVIDER_URL
    const contractAddress = process.env.REVELATION_NFT_CONTRACT_ADDRESS;
    const accountAddress = process.env.NFT_ACCOUNT_ADDRESS;
    const provider = new ethers.providers.JsonRpcProvider(providerUrl);

    const providerEngine = new HDWalletProvider({
        mnemonic: {
            phrase: process.env.MNEMONIC
        },
        providerOrUrl: providerUrl,
    });

    // Set up your wallet private key
    const privateKey = process.env.MAINNET_PRIVKEY;
    const wallet = new ethers.Wallet(privateKey, provider);

    // connect the wallet to the provider
    const signer = wallet.connect(provider);

    // Set up OpenSea SDK
    const sdk = new OpenSeaSDK(providerEngine, { chain: Chain.Goerli }, logger, wallet);

    // Set up NFT collection details
    const nftArtifact = await artifacts.readArtifact("Revelation");
    const nftContract = new ethers.Contract(contractAddress, nftArtifact.abi, signer);

    // let tx = await nftContract
    //     .connect(signer)
    //     .setBaseURI(
    //         process.env.REVELATION_NFT_BASE_URI
    //     );
    // await tx.wait()
    // console.log('BASE URI SET!');

    // //MINTING(OPTIONAL)
    // const transaction = await nftContract.ownerMint(1)
    // tx = await transaction.wait()
    // console.log('MINTING COMPLETED.')

    const totalSupply = await nftContract.totalSupply();
    console.log('totalSupply', totalSupply);
    console.log(`CREATING AUCTIONS FOR ${totalSupply} ITEMS...`);

    // SET UP SELLING DETAILS
    const expirationTime = Math.round(Date.now() / 1000 + 60 * 60 * 24);
    const amount = 0.026496;//eth = 200$;

    //Publish the NFT collection
    for (let i = 0; i < totalSupply; i++) {
        const tokenId = i + 1
        try {
            await sdk.createSellOrder({
                asset: {
                    tokenId: tokenId.toString(),
                    tokenAddress: contractAddress,
                },
                schemaName: 'ERC721',
                accountAddress,
                startAmount: amount,
                // If `endAmount` is specified, the order will decline in value to that amount until `expirationTime`. Otherwise, it's a fixed-price order:
                //endAmount: 0.1,
                expirationTime,
            });
            console.log('ORDER CREATED FOR TOKEN ID', tokenId)
        } catch (err) {
            console.log('err', err)
        }
    }

    const tokenURI = await nftContract.tokenURI(1);
    console.log('tokenURI', tokenURI)
}

// Run the main function
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
