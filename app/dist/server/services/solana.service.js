"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.solanaService = exports.SolanaService = void 0;
const web3_js_1 = require("@solana/web3.js");
const spl_token_1 = require("@solana/spl-token");
const config_1 = __importDefault(require("../config"));
class SolanaService {
    constructor() {
        Object.defineProperty(this, "connection", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "platformWallet", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: null
        });
        Object.defineProperty(this, "usdcMint", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        this.connection = new web3_js_1.Connection(config_1.default.solana.rpcUrl, 'confirmed');
        this.usdcMint = new web3_js_1.PublicKey(config_1.default.solana.usdcMintAddress);
        // Initialize platform wallet if private key is provided
        if (config_1.default.solana.platformWalletPrivateKey) {
            try {
                const secretKey = Uint8Array.from(JSON.parse(config_1.default.solana.platformWalletPrivateKey));
                this.platformWallet = web3_js_1.Keypair.fromSecretKey(secretKey);
            }
            catch (error) {
                console.error('Failed to initialize platform wallet:', error);
            }
        }
    }
    /**
     * Get platform wallet address
     */
    getPlatformWalletAddress() {
        if (!this.platformWallet) {
            throw new Error('Platform wallet not initialized');
        }
        return this.platformWallet.publicKey.toBase58();
    }
    /**
     * Verify a USDC payment transaction on Solana
     */
    async verifyPayment(signature, expectedAmount, recipientAddress) {
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
                const preBalance = preBalances.find((pb) => pb.accountIndex === postBalance.accountIndex);
                if (postBalance.mint === this.usdcMint.toBase58() &&
                    postBalance.owner === recipientAddress) {
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
        }
        catch (error) {
            console.error('Error verifying payment:', error);
            return false;
        }
    }
    /**
     * Split payment between creator and platform
     * This is called by the AI Agent after verifying the payment
     */
    async splitPayment(sourceWallet, creatorWallet, totalAmount) {
        const creatorAmount = (totalAmount * config_1.default.fees.creatorPercentage) / 100;
        const platformAmount = (totalAmount * config_1.default.fees.platformPercentage) / 100;
        try {
            // In a real implementation, this would create a transaction to split the funds
            // For now, we'll just calculate the split amounts
            console.log(`Payment split calculated:
        Total: ${totalAmount} USDC
        Creator (${config_1.default.fees.creatorPercentage}%): ${creatorAmount} USDC → ${creatorWallet}
        Platform (${config_1.default.fees.platformPercentage}%): ${platformAmount} USDC
      `);
            return {
                creatorAmount,
                platformAmount,
                success: true,
            };
        }
        catch (error) {
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
    async getUsdcBalance(walletAddress) {
        try {
            const publicKey = new web3_js_1.PublicKey(walletAddress);
            const tokenAccount = await (0, spl_token_1.getAssociatedTokenAddress)(this.usdcMint, publicKey);
            const accountInfo = await (0, spl_token_1.getAccount)(this.connection, tokenAccount);
            return Number(accountInfo.amount) / 1000000; // USDC has 6 decimals
        }
        catch (error) {
            console.error('Error getting USDC balance:', error);
            return 0;
        }
    }
    /**
     * Get transaction details
     */
    async getTransaction(signature) {
        try {
            return await this.connection.getTransaction(signature, {
                maxSupportedTransactionVersion: 0,
            });
        }
        catch (error) {
            console.error('Error getting transaction:', error);
            return null;
        }
    }
}
exports.SolanaService = SolanaService;
exports.solanaService = new SolanaService();
