import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useWallet } from '@solana/wallet-adapter-react';

/**
 * PayFlix Landing Page
 * Explains the platform's mission and value proposition
 */

export default function PayFlix() {
  const { connected } = useWallet();

  const features = [
    {
      icon: '/coins-icon.svg',
      title: 'Instant Monetization',
      description: 'Creators earn USDC the moment viewers unlock their content. No waiting for ad revenue or monthly payouts.'
    },
    {
      icon: '/dollar-icon.svg',
      title: 'Pay-Per-View Model',
      description: 'Viewers only pay for content they actually want to watch. No subscriptions, no commitments, just pure value.'
    },
    {
      icon: '/blockchain-icon.svg',
      title: 'Blockchain Powered',
      description: 'Built on Solana for lightning-fast transactions and near-zero fees. Your money moves at the speed of innovation.'
    },
    {
      icon: '/storage-icon.svg',
      title: 'Permanent Storage',
      description: 'Videos stored permanently on Arweave blockchain. Your content lives forever, uncensored and unstoppable.'
    },
    {
      icon: '/creator-support-icon.svg',
      title: 'Direct Creator Support',
      description: 'Only 2.35% platform fee. Creators keep 97.65% of every payment - far better than traditional platforms that take 30-55%.'
    },
    {
      icon: '/privacy-shield-icon.svg',
      title: 'Privacy First',
      description: 'No personal information required. Just connect your wallet and pay to watch. Your privacy is our priority - no emails, no tracking, no data collection.'
    }
  ];

  const howItWorks = [
    {
      step: '1',
      title: 'Connect Your Wallet',
      description: 'Use Phantom, Solflare, or any Solana wallet to get started. No email, no personal data required.',
      color: 'from-purple-500 to-pink-500'
    },
    {
      step: '2',
      title: 'Browse Premium Content',
      description: 'Explore videos from creators worldwide. See pricing upfront in USDC before you unlock.',
      color: 'from-blue-500 to-cyan-500'
    },
    {
      step: '3',
      title: 'Pay & Watch Instantly',
      description: 'One click to unlock. Payment goes directly to the creator. Start watching in milliseconds.',
      color: 'from-green-500 to-emerald-500'
    },
    {
      step: '4',
      title: 'Creators Get Paid',
      description: 'Creators receive 97.65% of the payment instantly to their wallet. Only 2.35% platform fee - no delays, no bureaucracy.',
      color: 'from-orange-500 to-red-500'
    }
  ];

  return (
    <div className="min-h-screen bg-flix-dark">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-20 pb-32">
        {/* Animated Background */}
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-flix-dark to-cyan-900/20"></div>
          <motion.div
            animate={{
              scale: [1, 1.2, 1],
              rotate: [0, 90, 0],
            }}
            transition={{
              duration: 20,
              repeat: Infinity,
              ease: "linear"
            }}
            className="absolute top-1/4 left-1/4 w-96 h-96 bg-flix-cyan/10 rounded-full blur-3xl"
          ></motion.div>
          <motion.div
            animate={{
              scale: [1.2, 1, 1.2],
              rotate: [0, -90, 0],
            }}
            transition={{
              duration: 15,
              repeat: Infinity,
              ease: "linear"
            }}
            className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl"
          ></motion.div>
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center"
          >
            {/* Main Heading */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-6xl md:text-8xl font-bold mb-6"
            >
              <span className="bg-gradient-to-r from-flix-cyan via-purple-400 to-pink-400 text-transparent bg-clip-text">
                PayFlix
              </span>
            </motion.h1>

            {/* Tagline */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-2xl md:text-3xl text-white mb-4 font-semibold"
            >
              The Future of Creator Monetization
            </motion.p>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="text-xl md:text-2xl text-flix-text-secondary mb-12 max-w-4xl mx-auto"
            >
              Pay-per-view video platform powered by blockchain. Instant payments, permanent storage, zero middlemen.
            </motion.p>

            {/* CTA Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              className="flex flex-col sm:flex-row gap-6 justify-center items-center"
            >
              {connected ? (
                <Link
                  to="/"
                  className="px-8 py-4 bg-gradient-to-r from-flix-cyan to-blue-500 text-white text-lg font-bold rounded-full hover:shadow-2xl hover:shadow-cyan-500/50 transition-all transform hover:scale-105"
                >
                  Browse Videos
                </Link>
              ) : (
                <button className="px-8 py-4 bg-gradient-to-r from-flix-cyan to-blue-500 text-white text-lg font-bold rounded-full hover:shadow-2xl hover:shadow-cyan-500/50 transition-all transform hover:scale-105">
                  Connect Wallet to Start
                </button>
              )}
              <Link
                to="/creator"
                className="px-8 py-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-lg font-bold rounded-full hover:shadow-2xl hover:shadow-purple-500/50 transition-all transform hover:scale-105"
              >
                Start Creating
              </Link>
            </motion.div>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-20 max-w-5xl mx-auto"
          >
            <div className="bg-flix-light-gray/50 backdrop-blur-lg rounded-2xl p-8 text-center border border-flix-cyan/20">
              <div className="text-5xl font-bold text-flix-cyan mb-2">2.35%</div>
              <div className="text-flix-text-secondary">Platform Fee</div>
            </div>
            <div className="bg-flix-light-gray/50 backdrop-blur-lg rounded-2xl p-8 text-center border border-purple-500/20">
              <div className="text-5xl font-bold text-purple-400 mb-2">97.65%</div>
              <div className="text-flix-text-secondary">To Creators</div>
            </div>
            <div className="bg-flix-light-gray/50 backdrop-blur-lg rounded-2xl p-8 text-center border border-green-500/20">
              <div className="text-5xl font-bold text-green-400 mb-2">&lt;1s</div>
              <div className="text-flix-text-secondary">Payment Speed</div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Why PayFlix Matters */}
      <section className="py-20 bg-gradient-to-b from-flix-dark to-flix-light-gray/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-5xl font-bold text-white mb-6">
              Why PayFlix <span className="text-flix-cyan">Matters</span>
            </h2>
            <p className="text-xl text-flix-text-secondary max-w-3xl mx-auto">
              Traditional platforms keep 30-50% of creator earnings and delay payments for weeks.
              We believe creators deserve better. PayFlix leverages blockchain technology, AI Agents, and the x402 protocol to create
              a fair, transparent, and instant monetization system that puts power back in the hands of creators.
            </p>
          </motion.div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ scale: 1.05 }}
                className="bg-flix-light-gray rounded-2xl p-8 border border-flix-cyan/10 hover:border-flix-cyan/50 transition-all"
              >
                <div className="mb-4 flex items-center justify-center">
                  {feature.icon.startsWith('/') ? (
                    <img src={feature.icon} alt={feature.title} className="w-16 h-16 object-contain" />
                  ) : (
                    <span className="text-6xl">{feature.icon}</span>
                  )}
                </div>
                <h3 className="text-2xl font-bold text-white mb-3">{feature.title}</h3>
                <p className="text-flix-text-secondary">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 bg-flix-dark">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-5xl font-bold text-white mb-6">
              How It <span className="text-flix-cyan">Works</span>
            </h2>
            <p className="text-xl text-flix-text-secondary max-w-3xl mx-auto">
              Getting started with PayFlix is simple. No complicated setup, no lengthy verification.
              Just connect your wallet and you're ready to go.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {howItWorks.map((item, index) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.2 }}
                className="relative"
              >
                {/* Connector Line */}
                {index < howItWorks.length - 1 && (
                  <div className="hidden lg:block absolute top-16 left-full w-full h-1 bg-gradient-to-r from-flix-cyan to-transparent"></div>
                )}

                <div className="bg-flix-light-gray rounded-2xl p-8 relative">
                  {/* Step Number */}
                  <div className={`absolute -top-6 -left-6 w-16 h-16 bg-gradient-to-br ${item.color} rounded-full flex items-center justify-center text-3xl font-bold text-white shadow-2xl`}>
                    {item.step}
                  </div>

                  <h3 className="text-2xl font-bold text-white mb-4 mt-4">{item.title}</h3>
                  <p className="text-flix-text-secondary">{item.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* The Problem We Solve */}
      <section className="py-20 bg-gradient-to-b from-flix-light-gray/20 to-flix-dark">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-5xl font-bold text-white mb-6">
                The Problem with <span className="text-red-500">Traditional Platforms</span>
              </h2>
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="text-3xl">❌</div>
                  <div>
                    <h4 className="text-xl font-bold text-white mb-2">High Platform Fees</h4>
                    <p className="text-flix-text-secondary">YouTube, Patreon, and others take 30-55% of creator earnings</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="text-3xl">❌</div>
                  <div>
                    <h4 className="text-xl font-bold text-white mb-2">Delayed Payments</h4>
                    <p className="text-flix-text-secondary">Creators wait weeks or months to receive their money</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="text-3xl">❌</div>
                  <div>
                    <h4 className="text-xl font-bold text-white mb-2">Arbitrary Demonetization</h4>
                    <p className="text-flix-text-secondary">Algorithms can remove monetization without warning or reason</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="text-3xl">❌</div>
                  <div>
                    <h4 className="text-xl font-bold text-white mb-2">Content Censorship</h4>
                    <p className="text-flix-text-secondary">Platforms control what content can be monetized</p>
                  </div>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-5xl font-bold text-white mb-6">
                The <span className="text-flix-cyan">PayFlix</span> Solution
              </h2>
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="text-3xl">✅</div>
                  <div>
                    <h4 className="text-xl font-bold text-white mb-2">Minimal Platform Fee (2.35%)</h4>
                    <p className="text-flix-text-secondary">97.65% goes directly to creators - far better than traditional platforms that take 30-55%</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="text-3xl">✅</div>
                  <div>
                    <h4 className="text-xl font-bold text-white mb-2">Instant Settlement</h4>
                    <p className="text-flix-text-secondary">Creators receive USDC in their wallet within seconds</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="text-3xl">✅</div>
                  <div>
                    <h4 className="text-xl font-bold text-white mb-2">Guaranteed Monetization</h4>
                    <p className="text-flix-text-secondary">If viewers pay, creators earn. No arbitrary rules or algorithms</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="text-3xl">✅</div>
                  <div>
                    <h4 className="text-xl font-bold text-white mb-2">Censorship Resistant</h4>
                    <p className="text-flix-text-secondary">Content stored permanently on Arweave blockchain</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-32 bg-gradient-to-r from-purple-900/50 via-flix-dark to-cyan-900/50">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center"
        >
          <h2 className="text-6xl font-bold text-white mb-6">
            Ready to Join the Revolution?
          </h2>
          <p className="text-2xl text-flix-text-secondary mb-12">
            Be part of the movement that's putting creators first. No middlemen. No delays. Just value.
          </p>
          <div className="flex flex-col sm:flex-row gap-6 justify-center">
            {connected ? (
              <>
                <Link
                  to="/"
                  className="px-10 py-5 bg-gradient-to-r from-flix-cyan to-blue-500 text-white text-xl font-bold rounded-full hover:shadow-2xl hover:shadow-cyan-500/50 transition-all transform hover:scale-105"
                >
                  Start Watching
                </Link>
                <Link
                  to="/creator"
                  className="px-10 py-5 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xl font-bold rounded-full hover:shadow-2xl hover:shadow-purple-500/50 transition-all transform hover:scale-105"
                >
                  Upload Your First Video
                </Link>
              </>
            ) : (
              <button className="px-10 py-5 bg-gradient-to-r from-flix-cyan to-blue-500 text-white text-xl font-bold rounded-full hover:shadow-2xl hover:shadow-cyan-500/50 transition-all transform hover:scale-105">
                Connect Wallet to Get Started
              </button>
            )}
          </div>
        </motion.div>
      </section>
    </div>
  );
}
