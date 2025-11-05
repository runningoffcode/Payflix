import { PublicKey } from '@solana/web3.js';

const DEFAULT_DEVNET_USDC = '9zB1qKtTs7A1rbDpj15fsVrN1MrFxFSyRgBF8hd2fDX2';
const DEFAULT_MAINNET_USDC = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';

export const SOLANA_CLUSTER =
  (import.meta.env.VITE_SOLANA_CLUSTER as string) ||
  (import.meta.env.VITE_SOLANA_NETWORK as string) ||
  'devnet';

const legacyMint = import.meta.env.VITE_USDC_MINT_ADDRESS as string | undefined;

const DEVNET_MINT =
  (import.meta.env.VITE_USDC_MINT_DEVNET as string | undefined) ||
  legacyMint ||
  DEFAULT_DEVNET_USDC;

const MAINNET_MINT =
  (import.meta.env.VITE_USDC_MINT_MAINNET as string | undefined) ||
  legacyMint ||
  DEFAULT_MAINNET_USDC;

export const USDC_MINT_ADDRESS =
  SOLANA_CLUSTER === 'mainnet-beta' ? MAINNET_MINT : DEVNET_MINT;

export const usdcMintPublicKey = () => new PublicKey(USDC_MINT_ADDRESS);
