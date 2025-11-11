/**
 * Airdrop SOL to Wallet 2 for transaction fees
 */

import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';

const WALLET_2 = '7GjoGMVuup81ihWRvboTpwiXPgu5vPnmzCEZ66uWN5yu';
const RPC_URL = 'https://api.devnet.solana.com';

async function airdropSol() {
  console.log('\n💰 Airdropping SOL to Wallet 2\n');
  console.log('═'.repeat(70));
  console.log(`Wallet: ${WALLET_2}`);
  console.log('═'.repeat(70));

  const connection = new Connection(RPC_URL, 'confirmed');
  const publicKey = new PublicKey(WALLET_2);

  try {
    // Check current balance
    const balanceBefore = await connection.getBalance(publicKey);
    console.log(`\n💵 Current balance: ${balanceBefore / LAMPORTS_PER_SOL} SOL`);

    // Request airdrop
    console.log('\n📡 Requesting airdrop of 1 SOL...');
    const signature = await connection.requestAirdrop(publicKey, LAMPORTS_PER_SOL);

    console.log(`   Transaction: ${signature}`);
    console.log('   Waiting for confirmation...');

    // Wait for confirmation
    await connection.confirmTransaction(signature, 'confirmed');

    // Check new balance
    const balanceAfter = await connection.getBalance(publicKey);
    console.log(`\n✅ Airdrop successful!`);
    console.log(`   New balance: ${balanceAfter / LAMPORTS_PER_SOL} SOL`);
    console.log(`   Received: ${(balanceAfter - balanceBefore) / LAMPORTS_PER_SOL} SOL`);

    console.log('\n💡 Wallet 2 now has SOL for transaction fees!');
    console.log('   Try creating a session or making a payment again.');
    console.log('\n' + '═'.repeat(70));

  } catch (error: any) {
    console.error('\n❌ Error:', error.message);

    if (error.message.includes('airdrop request failed')) {
      console.log('\n💡 The devnet faucet may be rate-limited.');
      console.log('   Try again in a few seconds, or use the web faucet:');
      console.log('   https://faucet.solana.com/');
    }
  }
}

// Run
airdropSol();
