/**
 * Session Manager
 * Monitors wallet connection and manages payment session lifecycle
 * Automatically prompts users to create sessions for seamless payments
 */

import { useEffect, useState, useRef } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import SessionCreationModal from './SessionCreationModal';

export default function SessionManager() {
  const { connected, publicKey } = useWallet();

  // Derive wallet address from publicKey
  const walletAddress = publicKey?.toBase58();
  const [showModal, setShowModal] = useState(false);
  const [hasActiveSession, setHasActiveSession] = useState(false);
  const [checking, setChecking] = useState(false);
  const lastCheckedWalletRef = useRef<string | null>(null);

  // Check for active session when wallet connects
  useEffect(() => {
    const checkSession = async () => {
      if (!connected || !walletAddress) {
        setHasActiveSession(false);
        lastCheckedWalletRef.current = null;
        return;
      }

      const currentWallet = walletAddress;

      // Don't check multiple times for the same wallet
      if (checking || lastCheckedWalletRef.current === currentWallet) {
        return;
      }

      try {
        setChecking(true);
        lastCheckedWalletRef.current = currentWallet;
        console.log('🔍 Checking for existing X402 session...');

        const response = await fetch(
          `/api/payments/session/balance?userWallet=${currentWallet}`
        );

        if (response.ok) {
          const data = await response.json();

          if (data.hasSession) {
            console.log('✅ Found existing session!');
            console.log(`   Balance: $${data.remainingAmount} USDC`);
            console.log(`   Total approved: $${data.approvedAmount} USDC`);
            console.log(`   Spent: $${data.spentAmount} USDC`);
            console.log('🎬 Seamless payments enabled - no popups needed!');
            setHasActiveSession(true);
          } else {
            console.log('ℹ️  No session found - will prompt for deposit');
            setHasActiveSession(false);

            // Show deposit modal after a brief delay
            // This is the ONE-TIME popup that enables seamless payments
            setTimeout(() => {
              setShowModal(true);
            }, 1000);
          }
        }
      } catch (error) {
        console.error('❌ Error checking session:', error);
        lastCheckedWalletRef.current = null; // Allow retry on error
      } finally {
        setChecking(false);
      }
    };

    checkSession();
  }, [connected, walletAddress]);

  const handleSessionCreated = () => {
    setHasActiveSession(true);
    setShowModal(false);
  };

  const handleClose = () => {
    setShowModal(false);
  };

  return (
    <SessionCreationModal
      isOpen={showModal}
      onClose={handleClose}
      onSessionCreated={handleSessionCreated}
    />
  );
}
