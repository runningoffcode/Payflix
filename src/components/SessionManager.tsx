/**
 * Session Manager
 * Monitors wallet connection and manages payment session lifecycle
 * Automatically prompts users to create sessions for seamless payments
 */

import { useEffect, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import SessionCreationModal from './SessionCreationModal';

export default function SessionManager() {
  const { connected, publicKey } = useWallet();
  const [showModal, setShowModal] = useState(false);
  const [hasActiveSession, setHasActiveSession] = useState(false);
  const [checking, setChecking] = useState(false);

  // Check for active session when wallet connects
  useEffect(() => {
    const checkSession = async () => {
      if (!connected || !publicKey) {
        setHasActiveSession(false);
        return;
      }

      // Don't check multiple times
      if (checking) return;

      try {
        setChecking(true);
        console.log('🔍 Checking for active session...');

        const response = await fetch(
          `/api/sessions/active?userWallet=${publicKey.toBase58()}`
        );

        if (response.ok) {
          const data = await response.json();

          if (data.hasActiveSession) {
            console.log('✅ Active session found');
            console.log(`   Remaining: ${data.session.remaining_amount} USDC`);
            setHasActiveSession(true);
          } else {
            console.log('ℹ️  No active session found');
            setHasActiveSession(false);

            // Show modal after a brief delay to allow wallet connection to complete
            setTimeout(() => {
              setShowModal(true);
            }, 1000);
          }
        }
      } catch (error) {
        console.error('Error checking session:', error);
      } finally {
        setChecking(false);
      }
    };

    checkSession();
  }, [connected, publicKey]);

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
