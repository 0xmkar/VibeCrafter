import 'dotenv/config';
import { DeployCurrency, createCoin, ValidMetadataURI, createMetadataBuilder, createZoraUploaderForCreator } from "@zoralabs/coins-sdk";
import { baseSepolia } from "viem/chains";
import { Hex, createWalletClient, createPublicClient, http, Address } from "viem";
import { privateKeyToAccount } from 'viem/accounts';
import { setApiKey } from "@zoralabs/coins-sdk";
 
// Set up your API key before making any SDK requests
setApiKey(process.env.NEXT_PUBLIC_ZORA_API_KEY as string);

const privateKey = process.env.PRIVATE_KEY;
if (!privateKey) {
  throw new Error("PRIVATE_KEY environment variable is required");
}else{
  console.log("Private key found", privateKey);
};

type _CreateCoinArgs = {
  name: string;             // The name of the coin (e.g., "My Awesome Coin")
  symbol: string;           // The trading symbol for the coin (e.g., "MAC")
  uri: ValidMetadataURI;    // Metadata URI (an IPFS URI is recommended)
  chainId?: number;         // The chain ID (defaults to base mainnet)
  owners?: Address[];       // Optional array of owner addresses, defaults to [payoutRecipient]
  payoutRecipient: Address; // Address that receives creator earnings
  platformReferrer?: Address; // Optional platform referrer address, earns referral fees
  currency?: DeployCurrency.ETH ; // Optional currency for trading (ETH or ZORA)
}
 
const creatorAddress = "0xb4130438D4E66807b69b4DC6b6c67c34e084ddAC" as Address;

const walletClient = createWalletClient({
  account: privateKeyToAccount(privateKey as Hex),
  chain: baseSepolia,
  transport: http("https://sepolia.base.org"),
});

const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http("https://sepolia.base.org"),
});

async function createMyCoin() {
  try {
    // Move the metadata creation inside the async function
    const { createMetadataParameters } = await createMetadataBuilder()
      .withName("Test Base ZORA Coin")
      .withSymbol("TBZC")
      .withDescription("Test Description")
      .withImage(new File(['FILE'], "test.png", { type: "image/png" }))
      .upload(createZoraUploaderForCreator(creatorAddress as Address));
    
    const createCoinArgs = {
      ...createMetadataParameters,
      payoutRecipient: "0xb4130438D4E66807b69b4DC6b6c67c34e084ddAC" as Address,
      currency: DeployCurrency.ETH,
    };

    const result = await createCoin(createCoinArgs, walletClient, publicClient, {
      // gasMultiplier: 120, // Optional: Add 20% buffer to gas (defaults to 100%)
      // account: customAccount, // Optional: Override the wallet client account
    });
    
    console.log("Transaction hash:", result.hash);
    console.log("Coin address:", result.address);
    console.log("Deployment details:", result.deployment);
    
    return result;
  } catch (error) {
    console.error("Error creating coin:", error);
    throw error;
  }
}

// Call the async function properly
createMyCoin().then(result => {
  console.log("Coin created successfully:", result);
}).catch(error => {
  console.error("Failed to create coin:", error);
});