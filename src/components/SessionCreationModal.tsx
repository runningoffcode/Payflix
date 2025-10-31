/**
 * Session Creation Modal
 * Prompts users to create a payment session on wallet connection
 * This enables seamless payments without popups for 24 hours
 */

import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Transaction } from '@solana/web3.js';
import { GradientButton } from './ui/GradientButton';

interface SessionCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSessionCreated: () => void;
}

export default function SessionCreationModal({
  isOpen,
  onClose,
  onSessionCreated,
}: SessionCreationModalProps) {
  const { publicKey, signTransaction } = useWallet();
  const [approvedAmount, setApprovedAmount] = useState<number>(10);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<'setup' | 'signing' | 'success'>('setup');

  const quickAmounts = [5, 10, 20, 50, 100];

  if (!isOpen) return null;

  const handleCreateSession = async () => {
    if (!publicKey || !signTransaction) {
      setError('Wallet not connected');
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
        const errorData = await createResponse.json();
        throw new Error(errorData.message || 'Failed to create session');
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

      const signedTransaction = await signTransaction(transaction);
      const signature = signedTransaction.serialize().toString('base64');

      // Step 3: Confirm session with signature
      console.log('✅ Confirming session...');
      const confirmResponse = await fetch('/api/sessions/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          approvalSignature: signature,
        }),
      });

      if (!confirmResponse.ok) {
        const errorData = await confirmResponse.json();
        throw new Error(errorData.message || 'Failed to confirm session');
      }

      console.log('🎉 Session confirmed! Seamless payments enabled.');
      setStep('success');

      // Close modal and notify parent after a brief delay
      setTimeout(() => {
        onSessionCreated();
        onClose();
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
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
                <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">
                💰 Deposit USDC to Enter the Flix!
              </h2>
              <p className="text-neutral-400 text-sm">
                Add credits to your account and watch videos instantly
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
                  <p className="text-neutral-400 text-xs">Add as little as $5 or as much as you want</p>
                </div>
              </div>
              <div className="flex items-start gap-3 mb-3">
                <div className="w-6 h-6 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg className="w-4 h-4 text-purple-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <p className="text-white font-medium text-sm">Zero popups for 24 hours</p>
                  <p className="text-neutral-400 text-xs">Watch unlimited videos instantly after deposit</p>
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
                {quickAmounts.map((amount) => (
                  <button
                    key={amount}
                    onClick={() => setApprovedAmount(amount)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                      approvedAmount === amount
                        ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/30'
                        : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700 border border-neutral-600'
                    }`}
                  >
                    ${amount}
                  </button>
                ))}
              </div>

              {/* Custom Amount Input */}
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 font-medium">
                  $
                </span>
                <input
                  type="number"
                  value={approvedAmount}
                  onChange={(e) => setApprovedAmount(parseFloat(e.target.value) || 0)}
                  min="1"
                  max="1000"
                  step="1"
                  className="w-full bg-neutral-800 border border-neutral-600 rounded-lg pl-8 pr-16 py-3 text-white text-lg font-medium focus:outline-none focus:border-purple-500 transition-colors"
                  placeholder="Custom amount"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-400 font-medium">
                  USDC
                </span>
              </div>
              <p className="text-xs text-neutral-500 mt-2">
                💡 Most videos cost $0.01-0.50 • $10 gets you 20-1000 videos!
              </p>
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
                `💰 Deposit $${approvedAmount} USDC`
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
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500 flex items-center justify-center">
              <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">
              Seamless Payments Enabled!
            </h3>
            <p className="text-neutral-400 text-sm">
              You can now watch videos without popups for 24 hours
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
