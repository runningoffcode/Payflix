import { usePrivy, useWallets } from '@privy-io/react-auth';
import {
  PublicKey,
  Transaction,
  Connection,
  LAMPORTS_PER_SOL
} from '@solana/web3.js';
import {
  getAssociatedTokenAddress,
  createTransferInstruction,
  TOKEN_PROGRAM_ID,
} from '@solana/spl-token';
import { queueRPCRequest, RPC_PRIORITY } from '../services/rpc-queue.service';

/**
 * Custom hook for Solana wallet operations
 * Wraps Privy with convenient methods for Solana operations
 */
export function useSolanaWallet() {
  const { user: privyUser, login, logout, authenticated, ready } = usePrivy();
  const { wallets } = useWallets();
  // Using Helius RPC for better performance
  const connection = new Connection('https://devnet.helius-rpc.com/?api-key=84db05e3-e9ad-479e-923e-80be54938a18', 'confirmed');

  // Get Solana wallet from Privy (connected wallet OR embedded wallet)
  const getWalletAddress = (): string | null => {
    if (!privyUser) return null;

    const solanaWallets = wallets?.filter((w: any) => w.walletClientType === 'solana' || w.chainType === 'solana');
    if (solanaWallets && solanaWallets.length > 0) {
      return solanaWallets[0].address;
    }

    const embeddedWallet = privyUser.linkedAccounts?.find(
      (acc: any) => acc.type === 'wallet' && acc.chainType === 'solana'
    );
    if (embeddedWallet) {
      return embeddedWallet.address;
    }

    return null;
  };

  const walletAddress = getWalletAddress();
  const publicKey = walletAddress ? new PublicKey(walletAddress) : null;
  const connected = authenticated && !!walletAddress;
  const connecting = !ready;

  /**
   * Connect wallet (opens Privy modal)
   */
  const connect = () => {
    login();
  };

  /**
   * Get wallet address as string
   */
  const getAddress = (): string | null => {
    return publicKey?.toBase58() || null;
  };

  /**
   * Get SOL balance (queued to prevent rate limiting)
   */
  const getSolBalance = async (): Promise<number> => {
    if (!publicKey) return 0;

    try {
      const balance = await queueRPCRequest(
        () => connection.getBalance(publicKey),
        RPC_PRIORITY.MEDIUM
      );
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
    if (!walletAddress) {
      throw new Error('Wallet not connected');
    }

    try {
      // With Privy, message signing is handled through the wallet provider
      // This is a simplified version - for production, use Privy's signMessage
      console.warn('Message signing with Privy requires additional setup');
      throw new Error('Message signing not yet implemented with Privy');
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
    walletName: 'Privy',

    // Actions
    connect,
    disconnect: logout,

    // Balance
    getSolBalance,

    // Transactions
    sendUSDC,
    signMessage,
    getTransaction,

    // Low-level
    connection,
    // Note: signTransaction and signAllTransactions require Privy wallet provider integration
    signTransaction: undefined,
    signAllTransactions: undefined,
  };
}
