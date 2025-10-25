import {
  Connection,
  PublicKey,
  Keypair,
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js';
import {
  getAssociatedTokenAddress,
  createTransferInstruction,
  TOKEN_PROGRAM_ID,
  getAccount,
} from '@solana/spl-token';
import config from '../config';

export class SolanaService {
  private connection: Connection;
  private platformWallet: Keypair | null = null;
  private usdcMint: PublicKey;

  constructor() {
    this.connection = new Connection(config.solana.rpcUrl, 'confirmed');
    this.usdcMint = new PublicKey(config.solana.usdcMintAddress);

    // Initialize platform wallet if private key is provided
    if (config.solana.platformWalletPrivateKey) {
      try {
        const secretKey = Uint8Array.from(
          JSON.parse(config.solana.platformWalletPrivateKey)
        );
        this.platformWallet = Keypair.fromSecretKey(secretKey);
      } catch (error) {
        console.error('Failed to initialize platform wallet:', error);
      }
    }
  }

  /**
   * Get platform wallet address
   */
  getPlatformWalletAddress(): string {
    if (!this.platformWallet) {
      throw new Error('Platform wallet not initialized');
    }
    return this.platformWallet.publicKey.toBase58();
  }

  /**
   * Verify a USDC payment transaction on Solana
   */
  async verifyPayment(
    signature: string,
    expectedAmount: number,
    recipientAddress: string
  ): Promise<boolean> {
    try {
      const tx = await this.connection.getTransaction(signature, {
        maxSupportedTransactionVersion: 0,
      });

      if (!tx || !tx.meta) {
        console.log('Transaction not found or no metadata');
        return false;
      }

      // Check if transaction was successful
      if (tx.meta.err) {
        console.log('Transaction failed:', tx.meta.err);
        return false;
      }

      // For USDC transfers, we need to check the token balance changes
      const preBalances = tx.meta.preTokenBalances || [];
      const postBalances = tx.meta.postTokenBalances || [];

      // Find the recipient's token account balance change
      let amountTransferred = 0;

      for (const postBalance of postBalances) {
        const preBalance = preBalances.find(
          (pb) => pb.accountIndex === postBalance.accountIndex
        );

        if (
          postBalance.mint === this.usdcMint.toBase58() &&
          postBalance.owner === recipientAddress
        ) {
          const pre = preBalance?.uiTokenAmount.uiAmount || 0;
          const post = postBalance.uiTokenAmount.uiAmount || 0;
          amountTransferred = post - pre;
          break;
        }
      }

      // Check if the amount matches (with small tolerance for floating point)
      const tolerance = 0.000001;
      const amountMatches = Math.abs(amountTransferred - expectedAmount) < tolerance;

      return amountMatches && amountTransferred > 0;
    } catch (error) {
      console.error('Error verifying payment:', error);
      return false;
    }
  }

  /**
   * Split payment between creator and platform
   * This is called by the AI Agent after verifying the payment
   */
  async splitPayment(
    sourceWallet: string,
    creatorWallet: string,
    totalAmount: number
  ): Promise<{ creatorAmount: number; platformAmount: number; success: boolean }> {
    const creatorAmount = (totalAmount * config.fees.creatorPercentage) / 100;
    const platformAmount = (totalAmount * config.fees.platformPercentage) / 100;

    try {
      // In a real implementation, this would create a transaction to split the funds
      // For now, we'll just calculate the split amounts

      console.log(`Payment split calculated:
        Total: ${totalAmount} USDC
        Creator (${config.fees.creatorPercentage}%): ${creatorAmount} USDC → ${creatorWallet}
        Platform (${config.fees.platformPercentage}%): ${platformAmount} USDC
      `);

      return {
        creatorAmount,
        platformAmount,
        success: true,
      };
    } catch (error) {
      console.error('Error splitting payment:', error);
      return {
        creatorAmount: 0,
        platformAmount: 0,
        success: false,
      };
    }
  }

  /**
   * Get USDC balance for a wallet
   */
  async getUsdcBalance(walletAddress: string): Promise<number> {
    try {
      const publicKey = new PublicKey(walletAddress);
      const tokenAccount = await getAssociatedTokenAddress(
        this.usdcMint,
        publicKey
      );

      const accountInfo = await getAccount(this.connection, tokenAccount);
      return Number(accountInfo.amount) / 1_000_000; // USDC has 6 decimals
    } catch (error) {
      console.error('Error getting USDC balance:', error);
      return 0;
    }
  }

  /**
   * Get transaction details
   */
  async getTransaction(signature: string) {
    try {
      return await this.connection.getTransaction(signature, {
        maxSupportedTransactionVersion: 0,
      });
    } catch (error) {
      console.error('Error getting transaction:', error);
      return null;
    }
  }
}

export const solanaService = new SolanaService();
