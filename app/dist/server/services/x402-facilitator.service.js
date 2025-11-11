"use strict";
/**
 * X402 Facilitator Service
 * Handles payment verification and settlement using the X402 protocol
 * Acts as an intermediary between the API server and Solana blockchain
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.x402Facilitator = exports.X402FacilitatorService = void 0;
const web3_js_1 = require("@solana/web3.js");
const bs58_1 = __importDefault(require("bs58"));
const index_1 = __importDefault(require("../config/index"));
class X402FacilitatorService {
    constructor() {
        Object.defineProperty(this, "connection", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "feePayer", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: null
        });
        // Initialize Solana connection
        this.connection = new web3_js_1.Connection(index_1.default.solana.rpcUrl, 'confirmed');
        // Initialize fee payer if private key is configured
        this.initializeFeePayer();
    }
    initializeFeePayer() {
        try {
            if (index_1.default.solana.platformWalletPrivateKey &&
                index_1.default.solana.platformWalletPrivateKey !== 'your_platform_wallet_private_key_here') {
                // Try to parse as JSON array first
                try {
                    const keyData = JSON.parse(index_1.default.solana.platformWalletPrivateKey);
                    this.feePayer = web3_js_1.Keypair.fromSecretKey(new Uint8Array(keyData));
                    console.log('✅ X402 Facilitator fee payer initialized:', this.feePayer.publicKey.toBase58());
                }
                catch {
                    // Try as base58 string
                    const decoded = bs58_1.default.decode(index_1.default.solana.platformWalletPrivateKey);
                    this.feePayer = web3_js_1.Keypair.fromSecretKey(decoded);
                    console.log('✅ X402 Facilitator fee payer initialized:', this.feePayer.publicKey.toBase58());
                }
            }
            else {
                console.warn('⚠️  X402 Facilitator: No fee payer configured - transactions will fail');
            }
        }
        catch (error) {
            console.error('❌ Failed to initialize X402 fee payer:', error);
        }
    }
    /**
     * Verify a payment transaction without broadcasting it
     * This validates the transaction structure and parameters
     */
    async verifyPayment(payload) {
        try {
            console.log('🔍 Verifying X402 payment...');
            // Decode the transaction
            const transactionBuffer = bs58_1.default.decode(payload.transaction);
            let transaction;
            try {
                // Try as versioned transaction first
                transaction = web3_js_1.VersionedTransaction.deserialize(transactionBuffer);
            }
            catch {
                // Fall back to legacy transaction
                transaction = web3_js_1.Transaction.from(transactionBuffer);
            }
            // Validate network matches
            if (payload.network !== index_1.default.solana.network) {
                return {
                    valid: false,
                    reason: `Network mismatch: expected ${index_1.default.solana.network}, got ${payload.network}`,
                };
            }
            // Validate token is USDC
            if (payload.token !== index_1.default.solana.usdcMintAddress) {
                return {
                    valid: false,
                    reason: `Unsupported token: expected USDC (${index_1.default.solana.usdcMintAddress})`,
                };
            }
            // Validate recipient
            try {
                new web3_js_1.PublicKey(payload.recipient);
            }
            catch {
                return {
                    valid: false,
                    reason: 'Invalid recipient address',
                };
            }
            // Simulate the transaction to ensure it would succeed
            if (transaction instanceof web3_js_1.Transaction) {
                const recentBlockhash = await this.connection.getLatestBlockhash();
                transaction.recentBlockhash = recentBlockhash.blockhash;
                transaction.feePayer = this.feePayer?.publicKey || transaction.feePayer;
                try {
                    const simulation = await this.connection.simulateTransaction(transaction);
                    if (simulation.value.err) {
                        return {
                            valid: false,
                            reason: 'Transaction simulation failed',
                            details: simulation.value.err,
                        };
                    }
                }
                catch (simError) {
                    return {
                        valid: false,
                        reason: 'Transaction simulation error',
                        details: simError.message,
                    };
                }
            }
            console.log('✅ X402 payment verification successful');
            return {
                valid: true,
                details: {
                    amount: payload.amount,
                    recipient: payload.recipient,
                    token: payload.token,
                },
            };
        }
        catch (error) {
            console.error('❌ X402 payment verification failed:', error);
            return {
                valid: false,
                reason: 'Verification error',
                details: error.message,
            };
        }
    }
    /**
     * Settle a payment by signing and broadcasting it to the blockchain
     * This actually executes the transaction on-chain
     */
    async settlePayment(payload) {
        try {
            console.log('💸 Settling X402 payment on-chain...');
            if (!this.feePayer) {
                throw new Error('Fee payer not configured - cannot settle transactions');
            }
            // First verify the payment
            const verification = await this.verifyPayment(payload);
            if (!verification.valid) {
                return {
                    success: false,
                    error: `Verification failed: ${verification.reason}`,
                };
            }
            // Decode the signed transaction
            const transactionBuffer = bs58_1.default.decode(payload.transaction);
            let transaction;
            try {
                // Deserialize the already-signed transaction
                transaction = web3_js_1.Transaction.from(transactionBuffer);
            }
            catch (error) {
                return {
                    success: false,
                    error: 'Failed to deserialize transaction',
                };
            }
            // The transaction is already fully signed by the user
            // Just broadcast it to the network
            console.log('📡 Broadcasting signed transaction to Solana...');
            const signature = await this.connection.sendRawTransaction(transactionBuffer, {
                skipPreflight: false,
                preflightCommitment: 'confirmed',
            });
            // Wait for confirmation
            console.log('⏳ Waiting for transaction confirmation...');
            const confirmation = await this.connection.confirmTransaction(signature, 'confirmed');
            if (confirmation.value.err) {
                return {
                    success: false,
                    error: `Transaction failed: ${JSON.stringify(confirmation.value.err)}`,
                };
            }
            console.log('✅ X402 payment settled successfully:', signature);
            return {
                success: true,
                signature,
            };
        }
        catch (error) {
            console.error('❌ X402 payment settlement failed:', error);
            return {
                success: false,
                error: error.message || 'Settlement failed',
            };
        }
    }
    /**
     * Get facilitator capabilities and configuration
     */
    getSupportedConfig() {
        return {
            version: '0.1.0',
            x402_version: '1.0',
            scheme: 'solana-spl',
            network: index_1.default.solana.network,
            feePayer: this.feePayer?.publicKey.toBase58() || null,
            supportedTokens: [
                {
                    mint: index_1.default.solana.usdcMintAddress,
                    symbol: 'USDC',
                    decimals: 6,
                },
            ],
            endpoints: {
                verify: '/api/facilitator/verify',
                settle: '/api/facilitator/settle',
                supported: '/api/facilitator/supported',
            },
        };
    }
    /**
     * Parse X-PAYMENT header from request
     */
    parsePaymentHeader(header) {
        try {
            // X-PAYMENT format: "x402 <base64-encoded-json>"
            const parts = header.split(' ');
            if (parts[0] !== 'x402' || parts.length < 2) {
                return null;
            }
            const payloadJson = Buffer.from(parts[1], 'base64').toString('utf-8');
            const payload = JSON.parse(payloadJson);
            return payload;
        }
        catch (error) {
            console.error('Failed to parse X-PAYMENT header:', error);
            return null;
        }
    }
    /**
     * Create X-PAYMENT-REQUIRED response headers
     */
    createPaymentRequiredHeaders(amount, recipient, resource) {
        const paymentInfo = {
            amount,
            token: index_1.default.solana.usdcMintAddress,
            recipient,
            network: index_1.default.solana.network,
            resource,
            facilitator: `http://localhost:${index_1.default.port}/api/facilitator`,
        };
        return {
            'X-PAYMENT-REQUIRED': `x402 ${Buffer.from(JSON.stringify(paymentInfo)).toString('base64')}`,
            'X-PAYMENT-FACILITATOR': `http://localhost:${index_1.default.port}/api/facilitator`,
        };
    }
}
exports.X402FacilitatorService = X402FacilitatorService;
// Singleton instance
exports.x402Facilitator = new X402FacilitatorService();
