import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import {
  PublicKey,
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL
} from '@solana/web3.js';
import {
  getAssociatedTokenAddress,
  createTransferInstruction,
  TOKEN_PROGRAM_ID,
} from '@solana/spl-token';

/**
 * Custom hook for Solana wallet operations
 * Wraps the wallet adapter with convenient methods
 */
export function useSolanaWallet() {
  const {
    publicKey,
    connected,
    connecting,
    disconnect,
    signTransaction,
    signAllTransactions,
    wallet,
  } = useWallet();

  const { connection } = useConnection();
  const { setVisible } = useWalletModal();

  /**
   * Connect wallet (opens modal)
   */
  const connect = () => {
    setVisible(true);
  };

  /**
   * Get wallet address as string
   */
  const getAddress = (): string | null => {
    return publicKey?.toBase58() || null;
  };

  /**
   * Get SOL balance
   */
  const getSolBalance = async (): Promise<number> => {
    if (!publicKey) return 0;

    try {
      const balance = await connection.getBalance(publicKey);
      return balance / LAMPORTS_PER_SOL;
    } catch (error) {
      console.error('Error getting SOL balance:', error);
      return 0;
    }
  };

  /**
   * Send USDC to another wallet
   */
  const sendUSDC = async (
    toAddress: string,
    amount: number,
    usdcMintAddress: string
  ): Promise<string> => {
    if (!publicKey || !signTransaction) {
      throw new Error('Wallet not connected');
    }

    try {
      const toPubkey = new PublicKey(toAddress);
      const usdcMint = new PublicKey(usdcMintAddress);

      // Get associated token accounts
      const fromTokenAccount = await getAssociatedTokenAddress(
        usdcMint,
        publicKey
      );

      const toTokenAccount = await getAssociatedTokenAddress(
        usdcMint,
        toPubkey
      );

      // Create transfer instruction
      // Amount needs to be multiplied by 10^6 for USDC (6 decimals)
      const amountInSmallestUnit = Math.floor(amount * 1_000_000);

      const transferInstruction = createTransferInstruction(
        fromTokenAccount,
        toTokenAccount,
        publicKey,
        amountInSmallestUnit,
        [],
        TOKEN_PROGRAM_ID
      );

      // Create and send transaction
      const transaction = new Transaction().add(transferInstruction);
      transaction.feePayer = publicKey;

      const { blockhash } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;

      // Sign transaction
      const signed = await signTransaction(transaction);

      // Send transaction
      const signature = await connection.sendRawTransaction(signed.serialize());

      // Wait for confirmation
      await connection.confirmTransaction(signature);

      console.log('✅ USDC transfer successful:', signature);
      return signature;
    } catch (error) {
      console.error('❌ USDC transfer failed:', error);
      throw error;
    }
  };

  /**
   * Sign a message for authentication
   */
  const signMessage = async (message: string): Promise<string> => {
    if (!publicKey || !wallet?.adapter.signMessage) {
      throw new Error('Wallet does not support message signing');
    }

    try {
      const encodedMessage = new TextEncoder().encode(message);
      const signature = await wallet.adapter.signMessage(encodedMessage);

      // Convert to base58
      return btoa(String.fromCharCode(...signature));
    } catch (error) {
      console.error('Error signing message:', error);
      throw error;
    }
  };

  /**
   * Get transaction details
   */
  const getTransaction = async (signature: string) => {
    try {
      return await connection.getTransaction(signature, {
        maxSupportedTransactionVersion: 0,
      });
    } catch (error) {
      console.error('Error getting transaction:', error);
      return null;
    }
  };

  return {
    // Wallet state
    publicKey,
    address: getAddress(),
    connected,
    connecting,
    walletName: wallet?.adapter.name,

    // Actions
    connect,
    disconnect,

    // Balance
    getSolBalance,

    // Transactions
    sendUSDC,
    signMessage,
    getTransaction,

    // Low-level
    connection,
    signTransaction,
    signAllTransactions,
  };
}
