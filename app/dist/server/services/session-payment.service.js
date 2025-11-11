"use strict";
/**
 * Session-Based Payment Service
 * Processes X402 payments using session keys (seamless, no popups!)
 * User funds come from their own wallet via delegated session key
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sessionPaymentService = exports.SessionPaymentService = void 0;
const web3_js_1 = require("@solana/web3.js");
const spl_token_1 = require("@solana/spl-token");
const crypto_1 = __importDefault(require("crypto"));
const db_factory_1 = require("../database/db-factory");
// Encryption settings
const ENCRYPTION_ALGORITHM = 'aes-256-gcm';
function getEncryptionKey() {
    const key = process.env.SESSION_ENCRYPTION_KEY;
    if (!key) {
        throw new Error('SESSION_ENCRYPTION_KEY not configured');
    }
    return Buffer.from(key.substring(0, 64), 'hex');
}
function decryptPrivateKey(encryptedData) {
    const combined = Buffer.from(encryptedData, 'base64');
    const iv = combined.subarray(0, 16);
    const authTag = combined.subarray(16, 32);
    const encrypted = combined.subarray(32);
    const decipher = crypto_1.default.createDecipheriv(ENCRYPTION_ALGORITHM, getEncryptionKey(), iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encrypted);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return new Uint8Array(decrypted);
}
class SessionPaymentService {
    constructor() {
        Object.defineProperty(this, "connection", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
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
        Object.defineProperty(this, "facilitatorWallet", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: null
        });
        this.connection = new web3_js_1.Connection(process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com', 'confirmed');
        this.usdcMint = new web3_js_1.PublicKey(process.env.USDC_MINT_ADDRESS || '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU');
        this.platformFeeWallet = new web3_js_1.PublicKey(process.env.PLATFORM_FEE_WALLET || '81qpJ8kP4kb1Vf7kgubyEUcJ726dHEEqpFRP4wTFsr1o');
        // Initialize facilitator wallet (pays for transaction fees)
        try {
            if (process.env.PLATFORM_WALLET_PRIVATE_KEY) {
                const keyData = JSON.parse(process.env.PLATFORM_WALLET_PRIVATE_KEY);
                this.facilitatorWallet = web3_js_1.Keypair.fromSecretKey(new Uint8Array(keyData));
                console.log('💳 Session Payment Service initialized');
                console.log(`   USDC Mint: ${this.usdcMint.toBase58()}`);
                console.log(`   Platform fee wallet: ${this.platformFeeWallet.toBase58()}`);
                console.log(`   Facilitator (gas payer): ${this.facilitatorWallet.publicKey.toBase58()}`);
            }
            else {
                console.warn('⚠️  No facilitator wallet configured - session payments will fail');
            }
        }
        catch (error) {
            console.error('❌ Failed to initialize facilitator wallet:', error);
        }
    }
    /**
     * Process seamless payment using session key
     * Funds come from USER'S wallet (not platform's wallet!)
     */
    async processSessionPayment(request) {
        try {
            console.log(`\n💸 Processing session-based payment...`);
            console.log(`   User: ${request.userWallet}`);
            console.log(`   Amount: ${request.amount} USDC`);
            console.log(`   Creator: ${request.creatorWallet}`);
            // Check if facilitator wallet is configured
            if (!this.facilitatorWallet) {
                return {
                    success: false,
                    error: 'Facilitator wallet not configured. Cannot process payment.',
                };
            }
            // Get active session for user
            const sessionData = await db_factory_1.db.getActiveSession(request.userWallet);
            if (!sessionData) {
                return {
                    success: false,
                    error: 'No active session found. Please create a session first.',
                };
            }
            // Check if session has enough remaining balance
            const remainingAmount = parseFloat(sessionData.remaining_amount);
            if (remainingAmount < request.amount) {
                return {
                    success: false,
                    error: `Insufficient session balance. Remaining: ${remainingAmount} USDC, Required: ${request.amount} USDC`,
                };
            }
            // Decrypt session keypair
            const sessionPrivateKey = decryptPrivateKey(sessionData.session_private_key_encrypted);
            const sessionKeypair = web3_js_1.Keypair.fromSecretKey(sessionPrivateKey);
            console.log(`   Session key: ${sessionKeypair.publicKey.toBase58()}`);
            // Check if user has enough USDC in their wallet
            const userPublicKey = new web3_js_1.PublicKey(request.userWallet);
            const userUsdcAccount = await (0, spl_token_1.getAssociatedTokenAddress)(this.usdcMint, userPublicKey);
            try {
                const userAccountInfo = await this.connection.getAccountInfo(userUsdcAccount);
                if (!userAccountInfo) {
                    return {
                        success: false,
                        error: `You don't have a USDC account. Please add USDC to your wallet first on Solana Devnet.`,
                    };
                }
                const userBalance = await this.connection.getTokenAccountBalance(userUsdcAccount);
                const userBalanceUsdc = parseFloat(userBalance.value.uiAmountString || '0');
                console.log(`   User USDC balance: ${userBalanceUsdc} USDC`);
                if (userBalanceUsdc < request.amount) {
                    return {
                        success: false,
                        error: `Insufficient USDC in wallet. You have ${userBalanceUsdc} USDC but need ${request.amount} USDC. Please add more USDC to your wallet.`,
                    };
                }
            }
            catch (error) {
                return {
                    success: false,
                    error: `Unable to check wallet balance. Please ensure you have USDC in your wallet.`,
                };
            }
            // Calculate revenue split (97.15% creator / 2.85% platform)
            const totalLamports = Math.floor(request.amount * 1000000);
            const platformAmount = Math.floor(totalLamports * 0.0285);
            const creatorAmount = totalLamports - platformAmount;
            console.log(`   Creator gets: ${(creatorAmount / 1000000).toFixed(6)} USDC`);
            console.log(`   Platform fee: ${(platformAmount / 1000000).toFixed(6)} USDC`);
            // Get creator token account
            const creatorPublicKey = new web3_js_1.PublicKey(request.creatorWallet);
            const creatorUsdcAccount = await (0, spl_token_1.getAssociatedTokenAddress)(this.usdcMint, creatorPublicKey);
            const platformUsdcAccount = await (0, spl_token_1.getAssociatedTokenAddress)(this.usdcMint, this.platformFeeWallet);
            // Build transaction
            const transaction = new web3_js_1.Transaction();
            // Check if creator's USDC account exists
            const creatorAccountInfo = await this.connection.getAccountInfo(creatorUsdcAccount);
            if (!creatorAccountInfo) {
                console.log('   Creating creator USDC account...');
                transaction.add((0, spl_token_1.createAssociatedTokenAccountInstruction)(this.facilitatorWallet.publicKey, // Facilitator pays for account creation
                creatorUsdcAccount, creatorPublicKey, this.usdcMint));
            }
            // Check if platform's USDC account exists
            const platformAccountInfo = await this.connection.getAccountInfo(platformUsdcAccount);
            if (!platformAccountInfo) {
                console.log('   Creating platform USDC account...');
                transaction.add((0, spl_token_1.createAssociatedTokenAccountInstruction)(this.facilitatorWallet.publicKey, // Facilitator pays for account creation
                platformUsdcAccount, this.platformFeeWallet, this.usdcMint));
            }
            // Transfer from user to creator (session key signs as delegate)
            transaction.add((0, spl_token_1.createTransferInstruction)(userUsdcAccount, // FROM: User's USDC account
            creatorUsdcAccount, // TO: Creator's USDC account
            sessionKeypair.publicKey, // AUTHORITY: Session keypair (delegate)
            creatorAmount // 97.15%
            ));
            // Transfer from user to platform (session key signs as delegate)
            transaction.add((0, spl_token_1.createTransferInstruction)(userUsdcAccount, // FROM: User's USDC account
            platformUsdcAccount, // TO: Platform's USDC account
            sessionKeypair.publicKey, // AUTHORITY: Session keypair (delegate)
            platformAmount // 2.85%
            ));
            // Get recent blockhash
            const { blockhash } = await this.connection.getLatestBlockhash('confirmed');
            transaction.recentBlockhash = blockhash;
            transaction.feePayer = this.facilitatorWallet.publicKey; // Facilitator pays for gas
            console.log(`   📡 Broadcasting transaction...`);
            // Both facilitator (for fees) and session key (for delegation) sign
            const signature = await (0, web3_js_1.sendAndConfirmTransaction)(this.connection, transaction, [this.facilitatorWallet, sessionKeypair], // Both sign!
            { commitment: 'confirmed' });
            console.log(`   ✅ Payment settled!`);
            console.log(`   Signature: ${signature}`);
            // Update session spending
            await db_factory_1.db.updateSessionSpending(sessionData.id, request.amount);
            return {
                success: true,
                signature,
            };
        }
        catch (error) {
            console.error(`   ❌ Payment failed:`, error.message);
            // Log full error details for debugging
            if (error.logs) {
                console.error(`   📋 Transaction logs:`, error.logs);
            }
            if (error.cause) {
                console.error(`   🔍 Error cause:`, error.cause);
            }
            console.error(`   📊 Full error:`, error);
            return {
                success: false,
                error: error.message,
            };
        }
    }
    /**
     * Check if user has an active session
     */
    async hasActiveSession(userWallet) {
        const session = await db_factory_1.db.getActiveSession(userWallet);
        return session !== null;
    }
    /**
     * Get session balance info
     */
    async getSessionBalance(userWallet) {
        const session = await db_factory_1.db.getActiveSession(userWallet);
        if (!session) {
            return { hasSession: false };
        }
        return {
            hasSession: true,
            approvedAmount: parseFloat(session.approved_amount),
            spentAmount: parseFloat(session.spent_amount),
            remainingAmount: parseFloat(session.remaining_amount),
        };
    }
}
exports.SessionPaymentService = SessionPaymentService;
exports.sessionPaymentService = new SessionPaymentService();
