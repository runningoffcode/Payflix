import { useState } from 'react';
import { GradientButton } from '@/components/ui/GradientButton';
import { Link } from 'react-router-dom';

/**
 * Demo page showcasing the GradientButton component
 * Visit /button-demo to see all variants and usage examples
 */
export default function ButtonDemo() {
  const [loading, setLoading] = useState(false);
  const [disabled, setDisabled] = useState(false);

  const handleClick = () => {
    console.log('Button clicked!');
  };

  const handleAsyncAction = async () => {
    setLoading(true);
    await new Promise(resolve => setTimeout(resolve, 2000));
    setLoading(false);
  };

  return (
    <main className="flex flex-col overflow-y-auto h-full relative z-10">
      <div className="max-w-6xl mx-auto px-4 md:px-8 py-12 w-full">
        {/* Header */}
        <div className="mb-12">
          <Link to="/" className="inline-flex items-center gap-2 text-neutral-400 hover:text-white transition-colors mb-6">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Home
          </Link>
          <h1 className="text-4xl font-bold mb-4">Gradient Button Component</h1>
          <p className="text-neutral-400 text-lg">
            Beautiful gradient buttons with hover effects and variants
          </p>
        </div>

        {/* Basic Usage */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-6">Basic Usage</h2>
          <div className="bg-neutral-800/50 backdrop-blur-sm border border-neutral-700/50 rounded-xl p-8">
            <div className="flex flex-wrap gap-4">
              <GradientButton onClick={handleClick}>
                Default Button
              </GradientButton>

              <GradientButton variant="variant" onClick={handleClick}>
                Variant Button
              </GradientButton>
            </div>

            <div className="mt-8 p-4 bg-neutral-900/50 rounded-lg">
              <code className="text-sm text-neutral-300">
                {`<GradientButton>Default Button</GradientButton>\n<GradientButton variant="variant">Variant Button</GradientButton>`}
              </code>
            </div>
          </div>
        </section>

        {/* With Icons */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-6">With Icons</h2>
          <div className="bg-neutral-800/50 backdrop-blur-sm border border-neutral-700/50 rounded-xl p-8">
            <div className="flex flex-wrap gap-4">
              <GradientButton onClick={handleClick}>
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
                Connect Wallet
              </GradientButton>

              <GradientButton variant="variant" onClick={handleClick}>
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                Upload Video
              </GradientButton>

              <GradientButton onClick={handleClick}>
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                Unlock for $2.99
              </GradientButton>
            </div>
          </div>
        </section>

        {/* States */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-6">Button States</h2>
          <div className="bg-neutral-800/50 backdrop-blur-sm border border-neutral-700/50 rounded-xl p-8">
            <div className="space-y-6">
              {/* Normal */}
              <div>
                <p className="text-sm text-neutral-400 mb-3">Normal State</p>
                <GradientButton onClick={handleClick}>
                  Click Me
                </GradientButton>
              </div>

              {/* Loading */}
              <div>
                <p className="text-sm text-neutral-400 mb-3">Loading State</p>
                <GradientButton onClick={handleAsyncAction} disabled={loading}>
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2" />
                      Processing...
                    </>
                  ) : (
                    'Start Process'
                  )}
                </GradientButton>
              </div>

              {/* Disabled */}
              <div>
                <p className="text-sm text-neutral-400 mb-3">Disabled State</p>
                <div className="flex gap-4 items-center">
                  <GradientButton disabled={disabled}>
                    Disabled Button
                  </GradientButton>
                  <button
                    onClick={() => setDisabled(!disabled)}
                    className="px-4 py-2 bg-neutral-700 hover:bg-neutral-600 rounded-lg text-sm transition-colors"
                  >
                    Toggle Disabled
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Sizes */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-6">Custom Sizes</h2>
          <div className="bg-neutral-800/50 backdrop-blur-sm border border-neutral-700/50 rounded-xl p-8">
            <div className="flex flex-wrap items-center gap-4">
              <GradientButton className="min-w-[100px] px-6 py-2 text-sm">
                Small
              </GradientButton>

              <GradientButton>
                Medium (Default)
              </GradientButton>

              <GradientButton className="min-w-[160px] px-12 py-5 text-lg">
                Large
              </GradientButton>

              <GradientButton className="w-full">
                Full Width
              </GradientButton>
            </div>
          </div>
        </section>

        {/* As Link */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-6">As Link (Slot)</h2>
          <div className="bg-neutral-800/50 backdrop-blur-sm border border-neutral-700/50 rounded-xl p-8">
            <div className="flex flex-wrap gap-4">
              <GradientButton asChild>
                <Link to="/creator-studio">
                  Go to Creator Dashboard
                </Link>
              </GradientButton>

              <GradientButton variant="variant" asChild>
                <a href="https://solana.com" target="_blank" rel="noopener noreferrer">
                  Learn About Solana
                  <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              </GradientButton>
            </div>

            <div className="mt-8 p-4 bg-neutral-900/50 rounded-lg">
              <code className="text-sm text-neutral-300">
                {`<GradientButton asChild>\n  <Link to="/dashboard">Dashboard</Link>\n</GradientButton>`}
              </code>
            </div>
          </div>
        </section>

        {/* Real World Examples */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-6">Real World Examples</h2>
          <div className="bg-neutral-800/50 backdrop-blur-sm border border-neutral-700/50 rounded-xl p-8">
            <div className="space-y-8">
              {/* Hero CTA */}
              <div>
                <p className="text-sm text-neutral-400 mb-4">Hero Section CTAs</p>
                <div className="flex flex-wrap gap-4">
                  <GradientButton className="text-lg px-8 py-5">
                    Start Watching Now
                  </GradientButton>
                  <GradientButton variant="variant" className="text-lg px-8 py-5">
                    Become a Creator
                  </GradientButton>
                </div>
              </div>

              {/* Video Unlock */}
              <div>
                <p className="text-sm text-neutral-400 mb-4">Video Unlock Button</p>
                <GradientButton variant="variant" className="text-lg px-12 py-5">
                  <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  Unlock for $2.99 USDC
                </GradientButton>
              </div>

              {/* Form Submit */}
              <div>
                <p className="text-sm text-neutral-400 mb-4">Form Submit</p>
                <GradientButton className="w-full max-w-md">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Save Changes
                </GradientButton>
              </div>
            </div>
          </div>
        </section>

        {/* Color Reference */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-6">Color Reference</h2>
          <div className="bg-neutral-800/50 backdrop-blur-sm border border-neutral-700/50 rounded-xl p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold mb-4">Default Variant</h3>
                <div className="space-y-2 text-sm">
                  <p className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded bg-purple-500"></span>
                    Purple: <code className="text-purple-400">#A855F7</code>
                  </p>
                  <p className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded bg-pink-500"></span>
                    Pink: <code className="text-pink-400">#EC4899</code>
                  </p>
                  <p className="text-neutral-400 mt-2">
                    Gradient: 135deg, Purple → Pink
                  </p>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-4">Variant (Solana Theme)</h3>
                <div className="space-y-2 text-sm">
                  <p className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded" style={{ backgroundColor: '#14F195' }}></span>
                    Green: <code className="text-green-400">#14F195</code>
                  </p>
                  <p className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded" style={{ backgroundColor: '#9945FF' }}></span>
                    Purple: <code className="text-purple-400">#9945FF</code>
                  </p>
                  <p className="text-neutral-400 mt-2">
                    Gradient: 135deg, Green → Purple
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Documentation Link */}
        <section>
          <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-6 text-center">
            <h3 className="text-xl font-semibold mb-2">Full Documentation</h3>
            <p className="text-neutral-400 mb-4">
              Check out GRADIENT_BUTTON_USAGE.md for complete examples and API reference
            </p>
            <GradientButton onClick={() => window.open('/GRADIENT_BUTTON_USAGE.md', '_blank')}>
              View Documentation
            </GradientButton>
          </div>
        </section>
      </div>
    </main>
  );
}
