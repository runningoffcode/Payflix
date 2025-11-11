"use strict";
/**
 * Session Keys Routes
 * Endpoints for creating and managing X402 session keys
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const web3_js_1 = require("@solana/web3.js");
const spl_token_1 = require("@solana/spl-token");
const crypto_1 = __importDefault(require("crypto"));
const db_factory_1 = require("../database/db-factory");
const router = (0, express_1.Router)();
// In-memory storage for pending sessions (before user confirms)
// In production, use Redis or similar distributed cache
const pendingSessions = new Map();
// Encryption settings
const ENCRYPTION_ALGORITHM = 'aes-256-gcm';
function getEncryptionKey() {
    const key = process.env.SESSION_ENCRYPTION_KEY;
    if (!key) {
        throw new Error('SESSION_ENCRYPTION_KEY not configured');
    }
    return Buffer.from(key.substring(0, 64), 'hex');
}
function encryptPrivateKey(privateKey) {
    const iv = crypto_1.default.randomBytes(16);
    const cipher = crypto_1.default.createCipheriv(ENCRYPTION_ALGORITHM, getEncryptionKey(), iv);
    let encrypted = cipher.update(Buffer.from(privateKey));
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    const authTag = cipher.getAuthTag();
    const combined = Buffer.concat([iv, authTag, encrypted]);
    return combined.toString('base64');
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
/**
 * POST /api/sessions/create
 * Create a new session key (returns transaction for user to sign)
 */
router.post('/create', async (req, res) => {
    try {
        const { userWallet, approvedAmount, expiresIn } = req.body;
        if (!userWallet || !approvedAmount) {
            return res.status(400).json({
                error: 'Missing required fields',
                message: 'userWallet and approvedAmount are required',
            });
        }
        console.log(`\n🔐 Creating/updating session for wallet: ${userWallet}`);
        console.log(`   Requested amount: ${approvedAmount} USDC`);
        // Get or create user
        let user = await db_factory_1.db.getUserByWallet(userWallet);
        if (!user) {
            console.log(`   Creating new user for wallet: ${userWallet}`);
            user = await db_factory_1.db.createUser({
                walletAddress: userWallet,
                username: `User ${userWallet.substring(0, 8)}`,
                email: null,
                profilePicture: null,
            });
        }
        // Check if user already has an active session
        const existingSession = await db_factory_1.db.getActiveSession(userWallet);
        let sessionKeypair;
        let sessionId;
        let totalApprovedAmount;
        let isTopUp = false;
        if (existingSession) {
            // TOP UP existing session
            console.log(`   ✅ Found existing session - adding to balance`);
            console.log(`   Current remaining: ${existingSession.remaining_amount} USDC`);
            // Decrypt existing session keypair
            const encryptedKey = existingSession.session_private_key_encrypted;
            const decryptedKey = decryptPrivateKey(encryptedKey);
            sessionKeypair = web3_js_1.Keypair.fromSecretKey(decryptedKey);
            sessionId = existingSession.id;
            // Calculate new total approval amount (current remaining + new deposit)
            totalApprovedAmount = parseFloat(existingSession.remaining_amount) + approvedAmount;
            isTopUp = true;
            console.log(`   New total approval: ${totalApprovedAmount} USDC`);
            console.log(`   Reusing session key: ${sessionKeypair.publicKey.toBase58()}`);
        }
        else {
            // CREATE new session
            console.log(`   Creating new session`);
            sessionKeypair = web3_js_1.Keypair.generate();
            sessionId = crypto_1.default.randomUUID();
            totalApprovedAmount = approvedAmount;
            console.log(`   Session ID: ${sessionId}`);
            console.log(`   Session public key: ${sessionKeypair.publicKey.toBase58()}`);
        }
        // Setup Solana connection
        const connection = new web3_js_1.Connection(process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com', 'confirmed');
        const usdcMint = new web3_js_1.PublicKey(process.env.USDC_MINT_ADDRESS || '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU');
        console.log(`   🪙 USDC Mint: ${usdcMint.toBase58()}`);
        // Get user's USDC account
        const userPublicKey = new web3_js_1.PublicKey(userWallet);
        const userUsdcAccount = await (0, spl_token_1.getAssociatedTokenAddress)(usdcMint, userPublicKey);
        console.log(`   💳 User USDC Account: ${userUsdcAccount.toBase58()}`);
        // CRITICAL: Verify user has enough USDC before allowing approval
        let userBalanceUsdc = 0;
        try {
            const userAccountInfo = await connection.getAccountInfo(userUsdcAccount);
            if (!userAccountInfo) {
                console.log(`   ❌ User has no USDC account`);
                return res.status(400).json({
                    error: 'No USDC Account',
                    message: `You don't have a USDC account. Please add USDC to your wallet first on Solana Devnet.`,
                });
            }
            const userBalance = await connection.getTokenAccountBalance(userUsdcAccount);
            userBalanceUsdc = parseFloat(userBalance.value.uiAmountString || '0');
            console.log(`   💰 User's wallet balance: ${userBalanceUsdc} USDC`);
            console.log(`   💵 Requested deposit: ${approvedAmount} USDC`);
            // For new sessions, check if user has enough for the full deposit
            // For top-ups, check if user has enough for the NEW deposit amount
            const depositAmount = isTopUp ? approvedAmount : approvedAmount;
            if (userBalanceUsdc < depositAmount) {
                console.log(`   ❌ Insufficient wallet balance`);
                return res.status(400).json({
                    error: 'Insufficient Balance',
                    message: `You only have ${userBalanceUsdc} USDC in your wallet but are trying to deposit ${depositAmount} USDC. Please reduce your deposit amount or add more USDC to your wallet.`,
                    walletBalance: userBalanceUsdc,
                    requestedAmount: depositAmount,
                });
            }
            console.log(`   ✅ Balance check passed`);
        }
        catch (error) {
            console.error(`   ❌ Error checking wallet balance:`, error);
            return res.status(500).json({
                error: 'Balance Check Failed',
                message: 'Unable to verify your wallet balance. Please try again.',
            });
        }
        // Create approval transaction (for total amount - this replaces any existing approval)
        const transaction = new web3_js_1.Transaction();
        transaction.add((0, spl_token_1.createApproveInstruction)(userUsdcAccount, sessionKeypair.publicKey, userPublicKey, Math.floor(totalApprovedAmount * 1000000) // Total amount, not just new deposit
        ));
        // Ensure total approved amount never exceeds wallet balance
        const roundedWalletBalance = Math.floor(userBalanceUsdc * 100) / 100;
        const roundedTotalApproved = Math.round(totalApprovedAmount * 100) / 100;
        if (roundedTotalApproved > roundedWalletBalance + 0.0001) {
            console.log(`   ❌ Total approval (${roundedTotalApproved}) exceeds wallet balance (${roundedWalletBalance})`);
            return res.status(400).json({
                error: 'Approval Exceeds Balance',
                message: `You can approve up to $${roundedWalletBalance.toFixed(2)} USDC based on your wallet balance.`,
                walletBalance: roundedWalletBalance,
                attemptedApproval: roundedTotalApproved,
            });
        }
        // Get recent blockhash
        const { blockhash } = await connection.getLatestBlockhash('confirmed');
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = userPublicKey;
        // Serialize transaction for user to sign
        const serialized = transaction.serialize({
            requireAllSignatures: false,
            verifySignatures: false,
        });
        // Calculate expiration
        const expirationHours = expiresIn || 24;
        const expiresAt = new Date(Date.now() + expirationHours * 60 * 60 * 1000);
        // Encrypt and temporarily store session keypair (will be saved after user signs)
        const encryptedPrivateKey = encryptPrivateKey(sessionKeypair.secretKey);
        // Store pending session data in memory cache
        pendingSessions.set(sessionId, {
            sessionKeypair,
            encryptedPrivateKey,
            userId: user.id,
            userWallet,
            approvedAmount: totalApprovedAmount,
            expiresAt,
            isTopUp,
            newDepositAmount: approvedAmount, // Track how much is being added
            existingSessionData: existingSession || undefined,
        });
        console.log(`   Expires at: ${expiresAt.toISOString()}`);
        console.log(`   ✅ Session prepared (awaiting user signature)`);
        return res.json({
            success: true,
            sessionId,
            sessionPublicKey: sessionKeypair.publicKey.toBase58(),
            approvalTransaction: serialized.toString('base64'),
            expiresAt: expiresAt.toISOString(),
            message: 'Please sign the approval transaction with your wallet',
        });
    }
    catch (error) {
        console.error('❌ Error creating session:', error);
        return res.status(500).json({
            error: 'Session Creation Failed',
            message: error.message,
        });
    }
});
/**
 * POST /api/sessions/confirm
 * Confirm session after user signs approval transaction
 */
router.post('/confirm', async (req, res) => {
    try {
        const { sessionId, approvalTransaction, transactionSignature } = req.body;
        if (!sessionId ||
            (!approvalTransaction && !transactionSignature)) {
            return res.status(400).json({
                error: 'Missing required fields',
                message: 'sessionId and either approvalTransaction or transactionSignature are required',
            });
        }
        // Get pending session
        const pendingSession = pendingSessions.get(sessionId);
        if (!pendingSession) {
            return res.status(404).json({
                error: 'Session not found',
                message: 'Session expired or does not exist',
            });
        }
        console.log(`\n✅ Confirming session: ${sessionId}`);
        // Setup Solana connection
        const connection = new web3_js_1.Connection(process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com', 'confirmed');
        // CRITICAL FIX: Broadcast the signed transaction!
        // The frontend sends us the serialized signed transaction, not the signature
        let finalizedSignature = transactionSignature;
        // If the frontend provided the serialized transaction, broadcast it and confirm
        if (approvalTransaction) {
            try {
                console.log('📡 Broadcasting approval transaction to blockchain...');
                const transactionBuffer = Buffer.from(approvalTransaction, 'base64');
                const transaction = web3_js_1.Transaction.from(transactionBuffer);
                finalizedSignature = await connection.sendRawTransaction(transaction.serialize(), {
                    skipPreflight: false,
                    preflightCommitment: 'confirmed',
                    maxRetries: 3,
                });
                console.log(`   Transaction sent: ${finalizedSignature}`);
                console.log('⏳ Waiting for confirmation...');
                const confirmation = await connection.confirmTransaction(finalizedSignature, 'confirmed');
                if (confirmation.value.err) {
                    throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
                }
                console.log('✅ Transaction confirmed on blockchain!');
                console.log(`   Delegate approval is now active`);
            }
            catch (error) {
                console.error('❌ Failed to broadcast transaction:', error);
                if (error.message && error.message.includes('already been processed')) {
                    console.log('⚠️  Transaction was already processed - checking on-chain status...');
                    return res.status(400).json({
                        error: 'Transaction Already Processed',
                        message: 'This transaction was already completed. Please refresh the page and try again if needed.',
                    });
                }
                if (error.message && (error.message.includes('Blockhash not found') || error.message.includes('block height exceeded'))) {
                    console.log('⚠️  Transaction blockhash expired - user took too long to sign');
                    return res.status(400).json({
                        error: 'Transaction Expired',
                        message: 'Transaction expired. Please try again and sign more quickly after clicking \"Add Credits\".',
                    });
                }
                return res.status(400).json({
                    error: 'Transaction Failed',
                    message: error.message || 'Failed to broadcast approval transaction',
                });
            }
        }
        else if (finalizedSignature) {
            // Otherwise confirm the signature that was already broadcast client-side
            console.log(`📡 Confirming previously broadcast transaction: ${finalizedSignature}`);
            const confirmation = await connection.confirmTransaction(finalizedSignature, 'confirmed');
            if (confirmation.value.err) {
                console.error('❌ Transaction confirmation failed:', confirmation.value.err);
                return res.status(400).json({
                    error: 'Transaction Failed',
                    message: `Transaction failed: ${JSON.stringify(confirmation.value.err)}`,
                });
            }
            console.log('✅ Transaction confirmed on blockchain!');
        }
        if (!finalizedSignature) {
            throw new Error('Missing transaction signature after confirmation');
        }
        // Save or update session in database
        if (pendingSession.isTopUp && pendingSession.existingSessionData) {
            // UPDATE existing session - add to balance
            const existingSession = pendingSession.existingSessionData;
            const newApprovedAmount = parseFloat(existingSession.approved_amount) + pendingSession.newDepositAmount;
            const newRemainingAmount = parseFloat(existingSession.remaining_amount) + pendingSession.newDepositAmount;
            console.log(`   💰 Updating session balance:`);
            console.log(`      Previous approved: ${existingSession.approved_amount} USDC`);
            console.log(`      New deposit: ${pendingSession.newDepositAmount} USDC`);
            console.log(`      New total approved: ${newApprovedAmount} USDC`);
            console.log(`      New remaining: ${newRemainingAmount} USDC`);
            // Update the session in database (use actual blockchain transaction signature)
            await db_factory_1.db.updateSessionBalance(sessionId, newApprovedAmount, newRemainingAmount, finalizedSignature, pendingSession.expiresAt);
            console.log(`   ✅ Session balance updated!`);
        }
        else {
            // CREATE new session (use actual blockchain transaction signature)
            await db_factory_1.db.createSession({
                id: sessionId,
                userId: pendingSession.userId,
                userWallet: pendingSession.userWallet,
                sessionPublicKey: pendingSession.sessionKeypair.publicKey.toBase58(),
                sessionPrivateKeyEncrypted: pendingSession.encryptedPrivateKey,
                approvedAmount: pendingSession.approvedAmount,
                approvalSignature: finalizedSignature,
                expiresAt: pendingSession.expiresAt,
            });
            console.log(`   ✅ Session activated!`);
        }
        // Clean up pending session
        pendingSessions.delete(sessionId);
        return res.json({
            success: true,
            session: {
                id: sessionId,
                approvedAmount: pendingSession.approvedAmount,
                remainingAmount: pendingSession.approvedAmount,
                expiresAt: pendingSession.expiresAt.toISOString(),
            },
            message: 'Session activated! You can now make seamless payments.',
        });
    }
    catch (error) {
        console.error('❌ Error confirming session:', error);
        return res.status(500).json({
            error: 'Session Confirmation Failed',
            message: error.message,
        });
    }
});
/**
 * GET /api/sessions/active
 * Get active session for user
 */
router.get('/active', async (req, res) => {
    try {
        const { userWallet } = req.query;
        if (!userWallet) {
            return res.status(400).json({
                error: 'Missing userWallet parameter',
            });
        }
        const session = await db_factory_1.db.getActiveSession(userWallet);
        if (!session) {
            return res.json({
                hasActiveSession: false,
                message: 'No active session found',
            });
        }
        return res.json({
            hasActiveSession: true,
            session: {
                id: session.id,
                approvedAmount: parseFloat(session.approved_amount),
                spentAmount: parseFloat(session.spent_amount),
                remainingAmount: parseFloat(session.remaining_amount),
                expiresAt: session.expires_at,
                status: session.status,
            },
        });
    }
    catch (error) {
        console.error('❌ Error fetching active session:', error);
        return res.status(500).json({
            error: 'Failed to fetch session',
            message: error.message,
        });
    }
});
/**
 * POST /api/sessions/revoke
 * Revoke an active session
 */
router.post('/revoke', async (req, res) => {
    try {
        const { sessionId } = req.body;
        if (!sessionId) {
            return res.status(400).json({
                error: 'Missing sessionId',
            });
        }
        const success = await db_factory_1.db.revokeSession(sessionId);
        if (!success) {
            return res.status(500).json({
                error: 'Failed to revoke session',
            });
        }
        console.log(`🚫 Session revoked: ${sessionId}`);
        return res.json({
            success: true,
            message: 'Session revoked successfully',
        });
    }
    catch (error) {
        console.error('❌ Error revoking session:', error);
        return res.status(500).json({
            error: 'Failed to revoke session',
            message: error.message,
        });
    }
});
/**
 * POST /api/sessions/withdraw
 * Withdraw credits (partial or full)
 * If amount specified: partial withdrawal, session stays active with reduced balance
 * If no amount or amount equals remaining: close session entirely
 */
router.post('/withdraw', async (req, res) => {
    try {
        const { userWallet, amount } = req.body;
        if (!userWallet) {
            return res.status(400).json({
                error: 'Missing userWallet',
            });
        }
        console.log(`\n💸 ========================================`);
        console.log(`💸 WITHDRAW REQUEST`);
        console.log(`💸 ========================================`);
        console.log(`   Wallet: ${userWallet}`);
        console.log(`   Requested: ${amount !== undefined ? amount + ' USDC' : 'ALL'}`);
        // Get active session
        const session = await db_factory_1.db.getActiveSession(userWallet);
        if (!session) {
            console.log(`   ❌ No active session found`);
            return res.status(404).json({
                error: 'No active session found',
            });
        }
        console.log(`\n📊 DATABASE VALUES:`);
        console.log(`   session.approved_amount: ${session.approved_amount}`);
        console.log(`   session.spent_amount: ${session.spent_amount}`);
        console.log(`   session.remaining_amount: ${session.remaining_amount}`);
        // Calculate remaining amount
        const approvedAmount = parseFloat(session.approved_amount);
        const spentAmount = parseFloat(session.spent_amount);
        const storedRemaining = parseFloat(session.remaining_amount);
        const calculatedRemaining = approvedAmount - spentAmount;
        console.log(`\n🔢 PARSED VALUES:`);
        console.log(`   approvedAmount: ${approvedAmount}`);
        console.log(`   spentAmount: ${spentAmount}`);
        console.log(`   storedRemaining: ${storedRemaining}`);
        console.log(`   calculatedRemaining: ${calculatedRemaining}`);
        // Check for inconsistency
        const diff = Math.abs(storedRemaining - calculatedRemaining);
        if (diff > 0.01) {
            console.log(`\n⚠️  DB INCONSISTENCY DETECTED!`);
            console.log(`   Difference: ${diff.toFixed(6)}`);
        }
        // Use calculated remaining for accuracy
        const remainingAmount = calculatedRemaining;
        if (remainingAmount <= 0) {
            console.log(`   ❌ No remaining credits (${remainingAmount})`);
            return res.status(400).json({
                error: 'No remaining credits to withdraw',
            });
        }
        // Determine withdrawal amount and round to 2 decimal places to avoid floating point issues
        const withdrawAmount = amount !== undefined ? Math.round(parseFloat(amount) * 100) / 100 : Math.round(remainingAmount * 100) / 100;
        const roundedRemainingAmount = Math.round(remainingAmount * 100) / 100;
        console.log(`\n💰 WITHDRAWAL CALCULATION:`);
        console.log(`   withdrawAmount (rounded): ${withdrawAmount}`);
        console.log(`   roundedRemainingAmount: ${roundedRemainingAmount}`);
        // Validate withdrawal amount
        if (withdrawAmount <= 0) {
            return res.status(400).json({
                error: 'Withdrawal amount must be greater than 0',
            });
        }
        if (withdrawAmount > roundedRemainingAmount) {
            return res.status(400).json({
                error: `Insufficient balance. You have ${roundedRemainingAmount.toFixed(2)} USDC remaining`,
            });
        }
        // If withdrawing all remaining credits, revoke the session
        if (withdrawAmount >= roundedRemainingAmount) {
            console.log(`\n💰 FULL WITHDRAWAL (CLOSING SESSION):`);
            console.log(`   Withdrawing entire balance: ${roundedRemainingAmount} USDC`);
            console.log(`   Revoking session ID: ${session.id}`);
            const success = await db_factory_1.db.revokeSession(session.id);
            if (!success) {
                console.log(`   ❌ Failed to revoke session`);
                return res.status(500).json({
                    error: 'Failed to close session',
                });
            }
            console.log(`\n✅ SESSION CLOSED`);
            console.log(`   💰 ${roundedRemainingAmount} USDC withdrawn`);
            console.log(`   🔒 Session revoked`);
            console.log(`💸 ========================================\n`);
            return res.json({
                success: true,
                message: 'All credits withdrawn successfully',
                withdrawnAmount: roundedRemainingAmount,
                sessionId: session.id,
                sessionClosed: true,
            });
        }
        // Partial withdrawal: reduce approved amount, recalculate remaining
        const newApprovedAmount = Math.round((approvedAmount - withdrawAmount) * 100) / 100;
        const newRemainingAmount = Math.round((newApprovedAmount - spentAmount) * 100) / 100; // Remaining = approved - spent
        // Safety check: ensure new amounts are valid
        if (newApprovedAmount < 0 || newRemainingAmount < 0) {
            console.error(`   ❌ Invalid calculation detected:`);
            console.error(`      withdrawAmount: ${withdrawAmount}`);
            console.error(`      approvedAmount: ${approvedAmount}`);
            console.error(`      spentAmount: ${spentAmount}`);
            console.error(`      newApprovedAmount: ${newApprovedAmount}`);
            console.error(`      newRemainingAmount: ${newRemainingAmount}`);
            return res.status(500).json({
                error: 'Internal calculation error - please contact support',
            });
        }
        console.log(`\n💰 PARTIAL WITHDRAWAL:`);
        console.log(`   Withdrawing: ${withdrawAmount} USDC`);
        console.log(`   Old approved: ${approvedAmount} -> New approved: ${newApprovedAmount}`);
        console.log(`   Spent stays: ${spentAmount} (unchanged)`);
        console.log(`   Old remaining: ${roundedRemainingAmount} -> New remaining: ${newRemainingAmount}`);
        console.log(`\n📝 UPDATING DATABASE:`);
        console.log(`   approved_amount: ${approvedAmount} -> ${newApprovedAmount}`);
        console.log(`   spent_amount: ${spentAmount} (unchanged)`);
        console.log(`   remaining_amount: ${storedRemaining} -> ${newRemainingAmount}`);
        // Update session balance using direct database query
        // We use the existing updateSessionBalance but keep the same signature and expiry
        await db_factory_1.db.updateSessionBalance(session.id, newApprovedAmount, newRemainingAmount, session.approval_signature, new Date(session.expires_at));
        console.log(`\n✅ DATABASE UPDATE COMPLETE`);
        console.log(`   💰 ${withdrawAmount} USDC withdrawn`);
        console.log(`   📊 New balance: ${newRemainingAmount} USDC`);
        console.log(`💸 ========================================\n`);
        return res.json({
            success: true,
            message: 'Partial withdrawal successful',
            withdrawnAmount: withdrawAmount,
            sessionId: session.id,
            sessionClosed: false,
            newRemainingBalance: newRemainingAmount,
        });
    }
    catch (error) {
        console.error('❌ Error withdrawing credits:', error);
        return res.status(500).json({
            error: 'Failed to withdraw credits',
            message: error.message,
        });
    }
});
exports.default = router;
