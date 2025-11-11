"use strict";
/**
 * Custodial Payment Service (X402 Kora Pattern)
 * Handles seamless payments where facilitator signs on behalf of users
 * No wallet popups - instant, frictionless payments
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.custodialPaymentService = exports.CustodialPaymentService = void 0;
const web3_js_1 = require("@solana/web3.js");
const spl_token_1 = require("@solana/spl-token");
const index_1 = __importDefault(require("../config/index"));
class CustodialPaymentService {
    constructor() {
        Object.defineProperty(this, "connection", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "facilitatorWallet", {
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
        Object.defineProperty(this, "platformFeeWallet", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        this.connection = new web3_js_1.Connection(index_1.default.solana.rpcUrl, 'confirmed');
        this.usdcMint = new web3_js_1.PublicKey(index_1.default.solana.usdcMintAddress);
        this.platformFeeWallet = new web3_js_1.PublicKey(index_1.default.solana.platformFeeWallet);
        // Initialize facilitator wallet (Kora)
        this.initializeFacilitator();
    }
    initializeFacilitator() {
        try {
            if (index_1.default.solana.platformWalletPrivateKey &&
                index_1.default.solana.platformWalletPrivateKey !== 'your_platform_wallet_private_key_here') {
                const keyData = JSON.parse(index_1.default.solana.platformWalletPrivateKey);
                this.facilitatorWallet = web3_js_1.Keypair.fromSecretKey(new Uint8Array(keyData));
                console.log('✅ Custodial facilitator initialized:', this.facilitatorWallet.publicKey.toBase58());
            }
            else {
                console.warn('⚠️  Custodial facilitator: No wallet configured');
            }
        }
        catch (error) {
            console.error('❌ Failed to initialize custodial facilitator:', error);
        }
    }
    /**
     * Process a seamless payment on behalf of user
     * Facilitator creates, signs, and sends the transaction
     * No user interaction required!
     */
    async processSeamlessPayment(request) {
        try {
            console.log('\n💸 Processing seamless custodial payment...');
            console.log(`   User: ${request.userWallet}`);
            console.log(`   Amount: ${request.amount} USDC`);
            console.log(`   Creator: ${request.creatorWallet}`);
            if (!this.facilitatorWallet) {
                return {
                    success: false,
                    error: 'Facilitator wallet not configured',
                };
            }
            // STEP 1: Check if user has enough USDC balance
            console.log(`   🔍 Checking user's USDC balance...`);
            const userPublicKey = new web3_js_1.PublicKey(request.userWallet);
            const userUsdcAccount = await (0, spl_token_1.getAssociatedTokenAddress)(this.usdcMint, userPublicKey);
            try {
                const userBalance = await this.connection.getTokenAccountBalance(userUsdcAccount);
                const userBalanceUsdc = parseFloat(userBalance.value.uiAmountString || '0');
                console.log(`   💰 User balance: ${userBalanceUsdc} USDC`);
                console.log(`   💵 Required: ${request.amount} USDC`);
                if (userBalanceUsdc < request.amount) {
                    console.log(`   ❌ Insufficient funds!`);
                    return {
                        success: false,
                        error: `Insufficient USDC balance. You have ${userBalanceUsdc} USDC but need ${request.amount} USDC.`,
                    };
                }
                console.log(`   ✅ User has sufficient funds!`);
            }
            catch (error) {
                console.log(`   ❌ User doesn't have a USDC account or has 0 balance`);
                return {
                    success: false,
                    error: 'You need USDC in your wallet to watch videos. Please add USDC to your wallet first.',
                };
            }
            // Calculate revenue split
            const totalLamports = Math.floor(request.amount * 1000000); // USDC has 6 decimals
            const platformFeePercent = 2.85;
            const platformAmount = Math.floor(totalLamports * (platformFeePercent / 100));
            const creatorAmount = totalLamports - platformAmount;
            console.log(`   Creator gets: ${(creatorAmount / 1000000).toFixed(6)} USDC`);
            console.log(`   Platform fee: ${(platformAmount / 1000000).toFixed(6)} USDC`);
            // Get creator public key
            const creatorPublicKey = new web3_js_1.PublicKey(request.creatorWallet);
            // Get token accounts
            const facilitatorTokenAccount = await (0, spl_token_1.getAssociatedTokenAddress)(this.usdcMint, this.facilitatorWallet.publicKey);
            const creatorTokenAccount = await (0, spl_token_1.getAssociatedTokenAddress)(this.usdcMint, creatorPublicKey);
            const platformTokenAccount = await (0, spl_token_1.getAssociatedTokenAddress)(this.usdcMint, this.platformFeeWallet);
            // Build transaction
            const transaction = new web3_js_1.Transaction();
            // Check and create creator token account if needed
            const creatorAccountInfo = await this.connection.getAccountInfo(creatorTokenAccount);
            if (!creatorAccountInfo) {
                console.log('   📝 Creating creator token account...');
                transaction.add((0, spl_token_1.createAssociatedTokenAccountInstruction)(this.facilitatorWallet.publicKey, // payer
                creatorTokenAccount, creatorPublicKey, this.usdcMint));
            }
            // Check and create platform token account if needed
            const platformAccountInfo = await this.connection.getAccountInfo(platformTokenAccount);
            if (!platformAccountInfo) {
                console.log('   📝 Creating platform token account...');
                transaction.add((0, spl_token_1.createAssociatedTokenAccountInstruction)(this.facilitatorWallet.publicKey, // payer
                platformTokenAccount, this.platformFeeWallet, this.usdcMint));
            }
            // Transfer to creator
            transaction.add((0, spl_token_1.createTransferInstruction)(facilitatorTokenAccount, // from facilitator's USDC account
            creatorTokenAccount, this.facilitatorWallet.publicKey, creatorAmount, [], spl_token_1.TOKEN_PROGRAM_ID));
            // Transfer platform fee
            transaction.add((0, spl_token_1.createTransferInstruction)(facilitatorTokenAccount, // from facilitator's USDC account
            platformTokenAccount, this.facilitatorWallet.publicKey, platformAmount, [], spl_token_1.TOKEN_PROGRAM_ID));
            // Send and confirm
            console.log('   📡 Broadcasting transaction...');
            const signature = await (0, web3_js_1.sendAndConfirmTransaction)(this.connection, transaction, [this.facilitatorWallet], {
                commitment: 'confirmed',
            });
            console.log('   ✅ Payment settled!');
            console.log(`   Signature: ${signature}\n`);
            return {
                success: true,
                signature,
            };
        }
        catch (error) {
            console.error('   ❌ Payment failed:', error.message);
            return {
                success: false,
                error: error.message || 'Payment processing failed',
            };
        }
    }
    /**
     * Check facilitator USDC balance
     */
    async getFacilitatorBalance() {
        if (!this.facilitatorWallet) {
            return 0;
        }
        try {
            const tokenAccount = await (0, spl_token_1.getAssociatedTokenAddress)(this.usdcMint, this.facilitatorWallet.publicKey);
            const accountInfo = await this.connection.getTokenAccountBalance(tokenAccount);
            return parseFloat(accountInfo.value.uiAmount?.toString() || '0');
        }
        catch {
            return 0;
        }
    }
}
exports.CustodialPaymentService = CustodialPaymentService;
// Export singleton instance
exports.custodialPaymentService = new CustodialPaymentService();
