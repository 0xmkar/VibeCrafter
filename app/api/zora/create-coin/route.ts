import { NextRequest, NextResponse } from "next/server"
import { createCoin, createMetadataBuilder, createZoraUploaderForCreator, DeployCurrency, setApiKey, ValidMetadataURI } from "@zoralabs/coins-sdk"
import { createWalletClient, createPublicClient, http, Address, Hex } from "viem"
import { baseSepolia } from "viem/chains"
import { privateKeyToAccount } from "viem/accounts"

// Set API key
if (process.env.NEXT_PUBLIC_ZORA_API_KEY) {
  setApiKey(process.env.NEXT_PUBLIC_ZORA_API_KEY)
}

export async function POST(request: NextRequest) {
  try {
    const { submissionTitle, submissionContent, submissionType, submissionAuthor, challengeTitle, challengeDescription } = await request.json()

    if (!submissionTitle || !submissionAuthor) {
      return NextResponse.json(
        { error: "Missing required fields: submissionTitle and submissionAuthor are required" },
        { status: 400 }
      )
    }

    // Check for private key
    const privateKey = process.env.PRIVATE_KEY
    if (!privateKey) {
      console.error("PRIVATE_KEY environment variable not found")
      // Return mock data for development
      return NextResponse.json({
        success: true,
        address: `0x${Math.random().toString(16).substr(2, 40)}`,
        transactionHash: `0x${Math.random().toString(16).substr(2, 64)}`,
        isMock: true
      })
    }

    // Set up wallet and public clients
    const creatorAddress = submissionAuthor.startsWith('0x') 
      ? submissionAuthor as Address 
      : "0xb4130438D4E66807b69b4DC6b6c67c34e084ddAC" as Address

    const walletClient = createWalletClient({
      account: privateKeyToAccount(privateKey as Hex),
      chain: baseSepolia,
      transport: http("https://sepolia.base.org"),
    })

    const publicClient = createPublicClient({
      chain: baseSepolia,
      transport: http("https://sepolia.base.org"),
    })

    // Create metadata
    let metadataUri: string
    try {
      // Create a simple image file for the metadata
      const imageContent = submissionType === 'image' && submissionContent 
        ? submissionContent 
        : `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect width="200" height="200" fill="%23ff6b6b"/><text x="100" y="100" text-anchor="middle" fill="white" font-size="20">${submissionTitle.slice(0, 10)}</text></svg>`
      
      const imageFile = new File([imageContent], "winner.png", { type: "image/png" })

      const { createMetadataParameters } = await createMetadataBuilder()
        .withName(submissionTitle)
        .withSymbol(submissionTitle.toUpperCase().replace(/\s+/g, "").slice(0, 8))
        .withDescription(`Winner of "${challengeTitle}" challenge. ${challengeDescription || submissionContent}`)
        .withImage(imageFile)
        .upload(createZoraUploaderForCreator(creatorAddress))

      metadataUri = createMetadataParameters.uri
    } catch (metadataError) {
      console.error("Metadata creation failed, using fallback:", metadataError)
      // Use a fallback IPFS URI
      metadataUri = "ipfs://bafybeigoxzqzbnxsn35vq7lls3ljxdcwjafxvbvkivprsodzrptpiguysy"
    }

    // Create the coin
    const createCoinArgs = {
      name: submissionTitle,
      symbol: submissionTitle.toUpperCase().replace(/\s+/g, "").slice(0, 8),
      uri: metadataUri as ValidMetadataURI,
      payoutRecipient: creatorAddress,
      currency: DeployCurrency.ETH,
    }

    console.log("🎨 Creating Zora Coin with args:", {
      name: createCoinArgs.name,
      symbol: createCoinArgs.symbol,
      payoutRecipient: createCoinArgs.payoutRecipient
    })

    const result = await createCoin(createCoinArgs, walletClient, publicClient)

    console.log("✅ Zora Coin created successfully:", {
      address: result.address,
      hash: result.hash
    })

    return NextResponse.json({
      success: true,
      address: result.address,
      transactionHash: result.hash,
      deployment: result.deployment,
      isMock: false
    })

  } catch (error) {
    console.error("Zora Coin creation failed:", error)
    
    // Return mock data if real creation fails
    return NextResponse.json({
      success: true,
      address: `0x${Math.random().toString(16).substr(2, 40)}`,
      transactionHash: `0x${Math.random().toString(16).substr(2, 64)}`,
      error: error instanceof Error ? error.message : "Unknown error",
      isMock: true
    })
  }
} 