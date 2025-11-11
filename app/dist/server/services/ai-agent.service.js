"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.aiAgentService = exports.AIAgentService = void 0;
const solana_service_1 = require("./solana.service");
const config_1 = __importDefault(require("../config"));
/**
 * AI Agent Service
 *
 * This service acts as an intelligent payment verification and revenue splitting agent.
 * Flow:
 * 1. Receives payment transaction signature
 * 2. Verifies the payment on Solana blockchain
 * 3. Validates payment amount matches video price
 * 4. Automatically splits revenue (97.15% creator / 2.85% platform)
 * 5. Updates payment status and video access
 */
class AIAgentService {
    /**
     * Verify payment and execute automatic revenue split
     */
    async verifyAndSplitPayment(transactionSignature, video, userWallet) {
        try {
            console.log(`[AI Agent] Starting payment verification for video: ${video.title}`);
            console.log(`[AI Agent] Transaction: ${transactionSignature}`);
            console.log(`[AI Agent] Expected amount: ${video.priceUsdc} USDC`);
            // Step 1: Verify the payment transaction on Solana blockchain
            const isValid = await solana_service_1.solanaService.verifyPayment(transactionSignature, video.priceUsdc, video.creatorWallet);
            if (!isValid) {
                console.log('[AI Agent] Payment verification failed');
                return {
                    verified: false,
                    payment: null,
                    error: 'Payment verification failed',
                };
            }
            console.log('[AI Agent] Payment verified successfully');
            // Step 2: Calculate revenue split
            const split = await solana_service_1.solanaService.splitPayment(userWallet, video.creatorWallet, video.priceUsdc);
            if (!split.success) {
                console.log('[AI Agent] Revenue split calculation failed');
                return {
                    verified: false,
                    payment: null,
                    error: 'Revenue split failed',
                };
            }
            console.log('[AI Agent] Revenue split calculated:');
            console.log(`  - Creator receives: ${split.creatorAmount} USDC (${config_1.default.fees.creatorPercentage}%)`);
            console.log(`  - Platform receives: ${split.platformAmount} USDC (${config_1.default.fees.platformPercentage}%)`);
            // Step 3: Create payment record
            const payment = {
                id: this.generatePaymentId(),
                videoId: video.id,
                userWallet,
                creatorWallet: video.creatorWallet,
                amount: video.priceUsdc,
                creatorAmount: split.creatorAmount,
                platformAmount: split.platformAmount,
                transactionSignature,
                status: 'verified',
                verifiedAt: new Date(),
                createdAt: new Date(),
            };
            console.log('[AI Agent] Payment verification complete');
            console.log('[AI Agent] User can now access the video');
            return {
                verified: true,
                payment,
            };
        }
        catch (error) {
            console.error('[AI Agent] Error during verification:', error);
            return {
                verified: false,
                payment: null,
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    }
    /**
     * Real-time payment monitoring
     * The AI Agent continuously monitors for new payments
     */
    async monitorPayment(transactionSignature, maxAttempts = 30, intervalMs = 2000) {
        console.log(`[AI Agent] Starting payment monitoring for tx: ${transactionSignature}`);
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                const tx = await solana_service_1.solanaService.getTransaction(transactionSignature);
                if (tx && !tx.meta?.err) {
                    console.log(`[AI Agent] Payment confirmed after ${attempt} attempts`);
                    return true;
                }
                if (tx && tx.meta?.err) {
                    console.log('[AI Agent] Payment transaction failed');
                    return false;
                }
                // Wait before next attempt
                await new Promise((resolve) => setTimeout(resolve, intervalMs));
            }
            catch (error) {
                console.error(`[AI Agent] Error in attempt ${attempt}:`, error);
            }
        }
        console.log('[AI Agent] Payment monitoring timed out');
        return false;
    }
    /**
     * Calculate platform analytics
     */
    async calculatePlatformMetrics(payments) {
        const totalRevenue = payments.reduce((sum, p) => sum + p.amount, 0);
        const platformRevenue = payments.reduce((sum, p) => sum + p.platformAmount, 0);
        const creatorRevenue = payments.reduce((sum, p) => sum + p.creatorAmount, 0);
        return {
            totalRevenue,
            platformRevenue,
            creatorRevenue,
            totalTransactions: payments.length,
        };
    }
    generatePaymentId() {
        return `pay_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    /**
     * Fraud detection using AI patterns
     */
    async detectFraud(userWallet, transactionSignature) {
        // In a real implementation, this would use ML models to detect fraud
        // For now, we'll implement basic checks
        try {
            const tx = await solana_service_1.solanaService.getTransaction(transactionSignature);
            if (!tx) {
                return {
                    isFraud: true,
                    confidence: 0.95,
                    reason: 'Transaction not found',
                };
            }
            // Check for common fraud patterns
            // Example: Multiple rapid transactions from same wallet
            // Example: Suspicious transaction amounts
            // Example: Known malicious addresses
            return {
                isFraud: false,
                confidence: 0.99,
            };
        }
        catch (error) {
            return {
                isFraud: true,
                confidence: 0.8,
                reason: 'Error verifying transaction',
            };
        }
    }
}
exports.AIAgentService = AIAgentService;
exports.aiAgentService = new AIAgentService();
