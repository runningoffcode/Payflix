/**
 * Session Creation Modal
 * Prompts users to create a payment session on wallet connection
 * This enables seamless payments without popups for 24 hours
 */

import { useState, useEffect, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Connection, Transaction } from '@solana/web3.js';
import { getAssociatedTokenAddress } from '@solana/spl-token';
import { GradientButton } from './ui/GradientButton';
import UsdcIcon from './icons/UsdcIcon';
import { queueRPCRequest, RPC_PRIORITY } from '../services/rpc-queue.service';
import { usdcMintPublicKey } from '../config/solana';

interface SessionCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSessionCreated: () => void;
  hasExistingSession?: boolean;
}

export default function SessionCreationModal({
  isOpen,
  onClose,
  onSessionCreated,
  hasExistingSession = false,
}: SessionCreationModalProps) {
  const { publicKey, signTransaction, sendTransaction } = useWallet();
  const [approvedAmount, setApprovedAmount] = useState<number>(10);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<'setup' | 'signing' | 'success'>('setup');
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [fetchingBalance, setFetchingBalance] = useState(false);
  const [sessionBalance, setSessionBalance] = useState<number>(0);
  const [fetchingSessionBalance, setFetchingSessionBalance] = useState(false);

  const quickAmounts = [5, 10, 20, 50, 100];

  const getMaxAllowableDeposit = useCallback(() => {
    if (walletBalance === null) return 0;
    const existingCredits = hasExistingSession ? sessionBalance : 0;
    return Math.max(walletBalance - existingCredits, 0);
  }, [walletBalance, hasExistingSession, sessionBalance]);

  const fetchWalletBalance = useCallback(async () => {
    if (!isOpen || !publicKey) {
      console.log('⚠️ Modal not open or no wallet connected');
      return;
    }

    setFetchingBalance(true);
    console.log(`🔍 Fetching wallet balance for MAX button (HIGH priority)...`);

    try {
      const rpcUrl = import.meta.env.VITE_SOLANA_RPC_URL || 'https://api.devnet.solana.com';
      const connection = new Connection(rpcUrl, 'confirmed');

      const USDC_MINT = usdcMintPublicKey();

      // Get user's USDC token account
      const userUsdcAccount = await getAssociatedTokenAddress(
        USDC_MINT,
        publicKey
      );

      console.log('   📍 User USDC account:', userUsdcAccount.toBase58());

      // Queue account info fetch with HIGH priority (user is waiting for MAX button)
      const accountInfo = await queueRPCRequest(
        () => connection.getAccountInfo(userUsdcAccount),
        RPC_PRIORITY.HIGH
      );

      if (!accountInfo) {
        console.log('   ⚠️ No USDC account found - balance is 0');
        setWalletBalance(0);
        setFetchingBalance(false);
        return;
      }

      // Queue balance fetch with HIGH priority
      const balance = await queueRPCRequest(
        () => connection.getTokenAccountBalance(userUsdcAccount),
        RPC_PRIORITY.HIGH
      );
      const usdcBalance = parseFloat(balance.value.uiAmountString || '0');

      console.log(`   ✅ Wallet balance fetched: ${usdcBalance} USDC`);
      setWalletBalance(usdcBalance);
      setFetchingBalance(false);
    } catch (error: any) {
      console.error('   ❌ Error fetching wallet balance:', error?.message || error);
      setWalletBalance(null);
      setFetchingBalance(false);
    }
  }, [isOpen, publicKey]);

  const fetchSessionBalance = useCallback(async () => {
    if (!isOpen || !publicKey || !hasExistingSession) {
      setSessionBalance(0);
      return;
    }

    try {
      setFetchingSessionBalance(true);
      const response = await fetch(`/api/payments/session/balance?userWallet=${publicKey.toBase58()}`);

      if (response.ok) {
        const data = await response.json();
        setSessionBalance(data.remainingAmount || 0);
      } else {
        setSessionBalance(0);
      }
    } catch (fetchError) {
      console.error('❌ Error fetching session balance for clamp:', fetchError);
      setSessionBalance(0);
    } finally {
      setFetchingSessionBalance(false);
    }
  }, [hasExistingSession, isOpen, publicKey]);

  // Fetch wallet balance when modal opens
  useEffect(() => {
    fetchWalletBalance();
    fetchSessionBalance();
  }, [fetchWalletBalance, fetchSessionBalance]);

  // Function to set max deposit
  const handleMaxDeposit = () => {
    console.log('🔘 MAX button clicked!');
    console.log('   Current wallet balance:', walletBalance);
    console.log('   Fetching balance:', fetchingBalance);
    console.log('   Public key:', publicKey?.toBase58());

    if (!publicKey) {
      setError('Please connect your wallet first');
      return;
    }
    if (fetchingBalance) {
      setError('Loading balance... Please wait');
      setTimeout(() => setError(null), 2000);
      return;
    }
    if (walletBalance !== null && walletBalance > 0) {
      const maxAllowable = getMaxAllowableDeposit();
      const maxAmount = Math.floor(maxAllowable * 100) / 100;
      console.log(`   ✅ Setting approved amount to: ${maxAmount}`);
      setApprovedAmount(maxAmount);
    } else if (walletBalance === 0) {
      setError('Your USDC balance is 0. Please add funds to your wallet.');
      setTimeout(() => setError(null), 3000);
    } else {
      setError('Unable to fetch wallet balance. Please try again.');
      setTimeout(() => setError(null), 3000);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    if (walletBalance === null) return;

    const maxAllowable = getMaxAllowableDeposit();
    if (approvedAmount > maxAllowable) {
      setApprovedAmount(Math.floor(maxAllowable * 100) / 100);
    }
  }, [approvedAmount, getMaxAllowableDeposit, isOpen, walletBalance]);

  // Reset modal state when it opens
  useEffect(() => {
    if (isOpen) {
      setStep('setup');
      setApprovedAmount(10);
      setError(null);
      setLoading(false);
    }
  }, [isOpen]);

  const resolveSignerFns = useCallback(async () => {
    console.log('🔐 Wallet signer availability check...');
    console.log('   signTransaction:', !!signTransaction);
    console.log('   sendTransaction:', !!sendTransaction);

    if (typeof signTransaction === 'function' || typeof sendTransaction === 'function') {
      console.log('✅ Using wallet adapter signer');
      return {
        signTransaction,
        sendTransaction,
      };
    }

    console.error('❌ No signer available');
    return null;
  }, [sendTransaction, signTransaction]);

  if (!isOpen) return null;

  const handleCreateSession = async () => {
    if (!publicKey) {
      setError('Wallet not connected');
      return;
    }

    let signerFns: {
      signTransaction?: (tx: Transaction) => Promise<Transaction>;
      sendTransaction?: (tx: Transaction, options?: any) => Promise<string>;
    } | null = null;

    try {
      signerFns = await resolveSignerFns();
    } catch (error) {
      console.error('❌ Failed to connect external signer:', error);
      setError('Wallet connection was canceled. Please approve in Phantom and try again.');
      setTimeout(() => setError(null), 4000);
      return;
    }

    if (!signerFns || (!signerFns.signTransaction && !signerFns.sendTransaction)) {
      setError('Wallet not ready. Try: 1) Refresh page 2) Reconnect Phantom 3) Retry deposit');
      setTimeout(() => setError(null), 5000);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setStep('signing');

      // Step 1: Create session and get approval transaction
      console.log('📝 Creating session...');
      const createResponse = await fetch('/api/sessions/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userWallet: publicKey.toBase58(),
          approvedAmount,
          expiresIn: 24, // 24 hours
        }),
      });

      if (!createResponse.ok) {
        let errorMessage = 'Failed to create session';
        try {
          const errorData = await createResponse.json();
          errorMessage = errorData.message || errorData.error || 'Failed to create session';
        } catch (parseError) {
          // If response body is empty or not JSON, use status text
          errorMessage = `Server error (${createResponse.status}): ${createResponse.statusText || 'Please try again'}`;
        }
        throw new Error(errorMessage);
      }

      const { sessionId, approvalTransaction, sessionPublicKey, expiresAt } =
        await createResponse.json();

      console.log(`✅ Session created: ${sessionId}`);
      console.log(`   Session key: ${sessionPublicKey}`);
      console.log(`   Expires: ${expiresAt}`);

      // Step 2: Decode and sign the approval transaction
      console.log('✍️  Please sign the approval transaction...');
      const transactionBuffer = Buffer.from(approvalTransaction, 'base64');
      const transaction = Transaction.from(transactionBuffer);

      let signedTransactionBase64: string | null = null;
      let transactionSignature: string | null = null;

      if (signerFns.signTransaction) {
        const signedTransaction = await signerFns.signTransaction(transaction);
        signedTransactionBase64 = signedTransaction.serialize().toString('base64');
        transactionSignature = signedTransaction.signature?.toString('base64') || null;
      } else if (signerFns.sendTransaction) {
        console.log('✍️  Signing via signAndSendTransaction...');
        transactionSignature = await signerFns.sendTransaction(transaction, { skipPreflight: false });
        signedTransactionBase64 = null; // wallet already broadcasted the transaction
      }

      if (!signedTransactionBase64 && !transactionSignature) {
        throw new Error('Failed to sign approval transaction');
      }

      // Step 3: Confirm session with signature
      console.log('✅ Confirming session...');
      const confirmResponse = await fetch('/api/sessions/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          approvalTransaction: signedTransactionBase64,
          transactionSignature,
        }),
      });

      if (!confirmResponse.ok) {
        let errorMessage = 'Failed to confirm session';
        try {
          const errorData = await confirmResponse.json();
          errorMessage = errorData.message || errorData.error || 'Failed to confirm session';
        } catch (parseError) {
          // If response body is empty or not JSON, use status text
          errorMessage = `Server error (${confirmResponse.status}): ${confirmResponse.statusText || 'Please try again'}`;
        }
        throw new Error(errorMessage);
      }

      console.log('🎉 Session confirmed! Seamless payments enabled.');
      setStep('success');

      window.dispatchEvent(new Event('sessionUpdated'));
      await fetchWalletBalance();

      // Close modal after showing success message
      setTimeout(() => {
        onSessionCreated();
        onClose();
        // Reset state for next time
        setStep('setup');
        setApprovedAmount(10);
        setError(null);
      }, 2000);
    } catch (err: any) {
      console.error('❌ Session creation failed:', err);
      setError(err.message || 'Failed to create session');
      setStep('setup');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="relative bg-gradient-to-br from-neutral-900 to-neutral-800 rounded-2xl p-8 max-w-md w-full mx-4 border border-neutral-700 shadow-2xl">
        {/* Close button */}
        {step === 'setup' && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-neutral-400 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}

        {/* Setup Step */}
        {step === 'setup' && (
          <>
            <div className="text-center mb-6">
              <div className="relative w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <div className="absolute inset-0 rounded-full bg-[#C56BCE] opacity-70 blur-xl" />
                <div className="relative w-full h-full rounded-full bg-gradient-to-br from-[#C56BCE] to-[#9F4BC4] flex items-center justify-center shadow-[0_0_30px_rgba(197,107,206,0.45)]">
                  <svg
                    className="w-9 h-9 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2.6}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">
                Add Credits
              </h2>
              <p className="text-neutral-400 text-sm">
                Tap. Pay. Play. It&apos;s that easy.
              </p>
            </div>

            <div className="bg-neutral-800/50 rounded-xl p-4 mb-6 border border-neutral-700">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-6 h-6 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg className="w-4 h-4 text-purple-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <p className="text-white font-medium text-sm">Choose your deposit amount</p>
                  <p className="text-neutral-400 text-xs">Add as little as $0.01 or as much as you want</p>
                </div>
              </div>
              <div className="flex items-start gap-3 mb-3">
                <div className="w-6 h-6 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg className="w-4 h-4 text-purple-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <p className="text-white font-medium text-sm">Seamless payments</p>
                  <p className="text-neutral-400 text-xs">Just tap to watch after deposit—no wallet prompts</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg className="w-4 h-4 text-purple-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <p className="text-white font-medium text-sm">Secure & automatic</p>
                  <p className="text-neutral-400 text-xs">Funds stay in your wallet, session expires in 24h</p>
                </div>
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-neutral-300 mb-3">
                How much USDC would you like to deposit?
              </label>

              {/* Quick Select Buttons */}
              <div className="grid grid-cols-5 gap-2 mb-3">
                {quickAmounts.map((amount) => {
                  const maxAllowable = getMaxAllowableDeposit();
                  const safeAmount = Math.min(amount, maxAllowable);
                  const isDisabled = safeAmount <= 0;
                  return (
                    <button
                      key={amount}
                      onClick={() => setApprovedAmount(Math.floor(safeAmount * 100) / 100)}
                      disabled={isDisabled}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                        approvedAmount === Math.floor(safeAmount * 100) / 100
                          ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/30'
                          : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700 border border-neutral-600'
                      } ${isDisabled ? 'opacity-40 cursor-not-allowed' : ''}`}
                    >
                      ${amount}
                    </button>
                  );
                })}
              </div>

              {/* Custom Amount Input */}
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 font-medium">
                  $
                </span>
                <input
                  type="number"
                  value={approvedAmount}
                  onChange={(e) => {
                    const entered = parseFloat(e.target.value) || 0;
                    const maxAllowable = getMaxAllowableDeposit();
                    const clamped = Math.min(entered, maxAllowable);
                    setApprovedAmount(clamped);
                  }}
                  min="0.01"
                  max="1000"
                  step="0.01"
                  className="w-full bg-neutral-800 border border-neutral-600 rounded-lg pl-8 pr-24 py-3 text-white text-lg font-medium focus:outline-none focus:border-purple-500 transition-colors [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  placeholder="Custom amount"
                  style={{ MozAppearance: 'textfield' }}
                />
                <button
                  onClick={handleMaxDeposit}
                  disabled={fetchingBalance || walletBalance === null || walletBalance === 0}
                  className="absolute right-16 top-1/2 -translate-y-1/2 px-2 py-1 rounded bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 text-xs font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title={
                    walletBalance !== null
                      ? `Max: $${getMaxAllowableDeposit().toFixed(2)} USDC`
                      : 'Fetching balance...'
                  }
                >
                  {fetchingBalance ? '...' : 'MAX'}
                </button>
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-400 font-medium text-sm">
                  USDC
                </span>
              </div>
              <div className="flex items-center justify-between mt-2">
                <p className="text-xs text-neutral-500">
                  💡 Most videos cost $0.01-0.50 • $10 gets you 20-1000 videos!
                </p>
                {walletBalance !== null && (
                  <p className="text-xs text-neutral-400 flex gap-2">
                    <span>
                      Wallet:{' '}
                      <span className="text-purple-400 font-medium">${walletBalance.toFixed(2)}</span>
                    </span>
                    {hasExistingSession && (
                      <span>
                        Credits:{' '}
                        <span className="text-purple-400 font-medium">
                          {fetchingSessionBalance ? '...' : `$${sessionBalance.toFixed(2)}`}
                        </span>
                      </span>
                    )}
                  </p>
                )}
              </div>
            </div>

            {error && (
              <div className="mb-6 p-3 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400 text-sm">
                {error}
              </div>
            )}

            <GradientButton
              onClick={handleCreateSession}
              disabled={loading || approvedAmount <= 0}
              className="w-full text-lg py-4"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <UsdcIcon size={18} />
                  <span className="font-semibold">Deposit ${approvedAmount.toFixed(2)} USDC</span>
                </span>
              )}
            </GradientButton>

            <button
              onClick={onClose}
              className="w-full mt-3 py-3 text-neutral-400 hover:text-white transition-colors text-sm font-medium"
            >
              Maybe later
            </button>
          </>
        )}

        {/* Signing Step */}
        {step === 'signing' && (
          <div className="text-center py-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center animate-pulse">
              <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">
              Sign Approval Transaction
            </h3>
            <p className="text-neutral-400 text-sm">
              Check your wallet to approve the session...
            </p>
          </div>
        )}

        {/* Success Step */}
        {step === 'success' && (
          <div className="text-center py-8">
            <div className="relative w-14 h-14 mx-auto mb-4 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full bg-[#C56BCE] opacity-70 blur-lg" />
              <div className="relative rounded-full w-full h-full bg-gradient-to-br from-[#C56BCE] to-[#9F4BC4] flex items-center justify-center shadow-[0_0_25px_rgba(197,107,206,0.45)]">
                <svg
                  className="w-8 h-8 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.4}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
            <p className="text-neutral-100 text-sm font-medium">
              Tap. Pay. Play. It's that easy.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
