/**
 * Mint Test USDC to a wallet
 * Use this to add more test USDC to any wallet after initial setup
 */

import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { getOrCreateAssociatedTokenAccount, mintTo } from '@solana/spl-token';
import dotenv from 'dotenv';

dotenv.config();

const DEVNET_RPC = 'https://api.devnet.solana.com';

async function mintTestUSDC(recipientWallet: string, amount: number) {
  try {
    console.log('💰 Minting Test USDC...');
    console.log(`   Recipient: ${recipientWallet}`);
    console.log(`   Amount: ${amount} USDC\n`);

    const connection = new Connection(DEVNET_RPC, 'confirmed');

    // Load facilitator (mint authority)
    if (!process.env.PLATFORM_WALLET_PRIVATE_KEY) {
      throw new Error('PLATFORM_WALLET_PRIVATE_KEY not found in .env');
    }

    const facilitatorKeyData = JSON.parse(process.env.PLATFORM_WALLET_PRIVATE_KEY);
    const facilitator = Keypair.fromSecretKey(new Uint8Array(facilitatorKeyData));

    // Get USDC mint from env
    const usdcMintAddress = process.env.USDC_MINT_ADDRESS;
    if (!usdcMintAddress) {
      throw new Error('USDC_MINT_ADDRESS not found in .env. Run create-test-usdc.ts first!');
    }

    const mint = new PublicKey(usdcMintAddress);
    const recipient = new PublicKey(recipientWallet);

    console.log(`✅ Using Test USDC Mint: ${mint.toBase58()}`);

    // Get or create token account
    console.log('📝 Getting recipient token account...');
    const recipientTokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      facilitator,
      mint,
      recipient
    );

    console.log(`✅ Token account: ${recipientTokenAccount.address.toBase58()}\n`);

    // Mint tokens
    console.log(`💸 Minting ${amount} Test USDC...`);
    const signature = await mintTo(
      connection,
      facilitator,
      mint,
      recipientTokenAccount.address,
      facilitator,
      amount * 1_000_000
    );

    console.log(`\n✅ Successfully minted ${amount} Test USDC!`);
    console.log(`   Signature: ${signature}`);
    console.log(`   View on Solscan: https://solscan.io/tx/${signature}?cluster=devnet\n`);

  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

const recipientWallet = process.argv[2] || 'J3WmMHUixgfcUtL5ov4Cn6LE65cDybgAg7mc1PWGyVY';
const amount = parseFloat(process.argv[3] || '100');

mintTestUSDC(recipientWallet, amount);
