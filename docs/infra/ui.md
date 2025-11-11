# UI & Hybrid Interaction Playbook

Consolidates PayFlix frontend assets (gradient button system, hybrid upload UX) into a single reference. Legacy guides (`GRADIENT_BUTTON_COMPLETE.md`, `GRADIENT_BUTTON_USAGE.md`, `HYBRID_COMPLETE.md`, `HYBRID_SETUP.md`) are preserved in appendices for full detail.

## Gradient Button System
- Component: `src/components/ui/GradientButton.tsx` powered by `class-variance-authority`, `@radix-ui/react-slot`, `clsx`, and `tailwind-merge`.
- Variants: `default` (purple→pink) for general CTAs, `variant` (Solana green→purple) for payment/chain actions.
- Demo: `/button-demo` route shows icon usage, loading/disabled states, and class overrides.
- Usage tips: wrap links with `asChild`, pair with wallet modal triggers, and reuse for unlock/pay buttons.

## Hybrid UX Overview
- Upload journey spans Arweave permanence + Supabase metadata (see `src/services/arweave-storage.service.ts`, `hybrid-video.service.ts`, `useHybridUpload.ts`).
- Flow: user triggers upload → Arweave video upload → optional Arweave thumbnail → Supabase metadata write → stats refresh.
- Benefits: instant querying via Supabase plus immutable storage; ensures creators get analytics while content stays on-chain.

## Troubleshooting
| Area | Symptom | Fix |
| --- | --- | --- |
| Gradient button | Styles missing | Confirm `src/index.css` imports and dependencies installed. |
| Button variants | Colors wrong | Ensure `variant="variant"` passed and Tailwind config includes gradient classes. |
| Hybrid upload | Video saved but no metadata | Confirm Supabase credentials, run verification queries in `docs/infra/supabase.md`. |
| Thumbnail issues | Arweave upload failing | Check AR balance + server logs from `arweave-storage.service`. |

## Roadmap Notes
- Consider adding more `GradientButton` variants (danger, outline) via `cva` config.
- Expand hybrid UX docs with flow charts/screenshots before public repo launch.

---

## Appendices
### Appendix A — GRADIENT_BUTTON_COMPLETE.md (verbatim)
# ✨ Gradient Button Component - Installation Complete!

The beautiful gradient button component has been successfully added to your PayFlix application!

---

## 🎉 What's Been Added

### ✅ Core Files
- **[src/lib/utils.ts](src/lib/utils.ts)** - `cn()` utility for className merging
- **[src/components/ui/GradientButton.tsx](src/components/ui/GradientButton.tsx)** - Main component
- **[src/index.css](src/index.css)** - Gradient button CSS styles

### ✅ Demo Page
- **[src/pages/ButtonDemo.tsx](src/pages/ButtonDemo.tsx)** - Live examples and showcase
- **Route Added:** `/button-demo`

### ✅ Documentation
- **[GRADIENT_BUTTON_USAGE.md](GRADIENT_BUTTON_USAGE.md)** - Complete usage guide

### ✅ Dependencies Installed
- `clsx` - Conditional className handling
- `tailwind-merge` - Tailwind class merging
- `class-variance-authority` - Variant management
- `@radix-ui/react-slot` - Component composition

---

## 🚀 Quick Start

### Import the Component
```tsx
import { GradientButton } from '@/components/ui/GradientButton';
```

### Basic Usage
```tsx
// Default variant (Purple to Pink)
<GradientButton onClick={handleClick}>
  Click Me
</GradientButton>

// Solana variant (Green to Purple)
<GradientButton variant="variant" onClick={handleClick}>
  Solana Style
</GradientButton>
```

### With Icons
```tsx
<GradientButton>
  <svg className="w-5 h-5 mr-2" /* ... */>
    <path d="..." />
  </svg>
  Upload Video
</GradientButton>
```

### As Link
```tsx
<GradientButton asChild>
  <Link to="/creator-studio">Go to Dashboard</Link>
</GradientButton>
```

---

## 🎨 Available Variants

### 1. Default (Purple → Pink)
- **Colors:** #A855F7 → #EC4899
- **Use For:** Primary CTAs, main actions
- **Example:** "Start Watching", "Connect Wallet"

```tsx
<GradientButton>Primary Action</GradientButton>
```

### 2. Variant (Green → Purple - Solana Theme)
- **Colors:** #14F195 → #9945FF
- **Use For:** Solana-specific actions, payments
- **Example:** "Unlock Video", "Pay with USDC"

```tsx
<GradientButton variant="variant">Pay Action</GradientButton>
```

---

## 📱 View the Demo

Start your dev server and visit:

```bash
npm run dev
```

Then navigate to: **http://localhost:3000/button-demo**

The demo page includes:
- All variants and states
- Icon combinations
- Loading states
- Disabled states
- Size examples
- Real-world use cases
- Color reference
- Code examples

---

## 💡 Common Use Cases

### Connect Wallet Button
```tsx
import { useWalletModal } from '@solana/wallet-adapter-react-ui';

function ConnectWallet() {
  const { setVisible } = useWalletModal();

  return (
    <GradientButton onClick={() => setVisible(true)}>
      <svg className="w-5 h-5 mr-2" /* wallet icon */>...</svg>
      Connect Wallet
    </GradientButton>
  );
}
```

### Video Unlock Button
```tsx
<GradientButton
  variant="variant"
  onClick={handlePayment}
  className="text-lg px-12 py-5"
>
  <svg className="w-6 h-6 mr-3" /* lock icon */>...</svg>
  Unlock for ${price} USDC
</GradientButton>
```

### Upload Video Button
```tsx
<GradientButton
  onClick={handleUpload}
  disabled={uploading}
>
  {uploading ? (
    <>
      <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent mr-2" />
      Uploading...
    </>
  ) : (
    <>
      <svg className="w-5 h-5 mr-2" /* upload icon */>...</svg>
      Upload Video
    </>
  )}
</GradientButton>
```

---

## 🎯 Integration Examples

### In Sidebar (Replace Connect Button)
```tsx
// In Sidebar.tsx
import { GradientButton } from '@/components/ui/GradientButton';

<GradientButton
  onClick={handleConnectWallet}
  className="w-full"
>
  {connected ? 'Connected' : 'Connect Wallet'}
</GradientButton>
```

### In Creator Studio (Upload Button)
```tsx
// In CreatorStudio.tsx
<GradientButton
  variant="variant"
  onClick={handleUpload}
  disabled={!video || uploading}
  className="w-full"
>
  Publish Video
</GradientButton>
```

### In Video Player (Unlock Button)
```tsx
// In VideoPlayer.tsx
<GradientButton
  variant="variant"
  onClick={handlePayment}
  disabled={paying}
  className="text-lg px-12 py-5"
>
  {paying ? 'Processing...' : `Unlock for $${price} USDC`}
</GradientButton>
```

---

## 🎨 Styling Features

### Hover Effects
- **Lift Animation:** Moves up 2px on hover
- **Shadow Enhancement:** Glowing shadow intensifies
- **Smooth Transitions:** 0.3s ease for all properties

### Active State
- **Press Effect:** Returns to normal position
- **Visual Feedback:** Clear interaction indication

### Disabled State
- **Opacity:** 50% transparency
- **Pointer Events:** Disabled cursor interaction
- **Visual Cue:** Clear "not clickable" appearance

---

## 🔧 Customization

### Custom Sizes
```tsx
// Small
<GradientButton className="min-w-[100px] px-6 py-2 text-sm">
  Small
</GradientButton>

// Large
<GradientButton className="min-w-[160px] px-12 py-5 text-lg">
  Large
</GradientButton>

// Full Width
<GradientButton className="w-full">
  Full Width
</GradientButton>
```

### Add New Variants
Edit `src/components/ui/GradientButton.tsx`:
```tsx
const gradientButtonVariants = cva(
  [...],
  {
    variants: {
      variant: {
        default: "",
        variant: "gradient-button-variant",
        success: "gradient-button-success", // Add new variant
      },
    },
  }
)
```

Then add CSS in `src/index.css`:
```css
.gradient-button-success {
  background: linear-gradient(135deg, #10B981 0%, #059669 100%);
  box-shadow: 0 4px 15px rgba(16, 185, 129, 0.4);
}
```

---

## 📚 Full Documentation

For complete documentation with all examples, API reference, and advanced usage:

**[Read GRADIENT_BUTTON_USAGE.md](GRADIENT_BUTTON_USAGE.md)**

---

## ✨ Features

✅ **Beautiful Gradients** - Purple/Pink and Green/Purple options
✅ **Hover Effects** - Smooth lift animation with enhanced shadows
✅ **Icon Support** - Easy integration with SVG icons
✅ **Loading States** - Built-in support for async operations
✅ **Disabled States** - Clear visual feedback
✅ **Link Support** - Can render as links using Radix Slot
✅ **TypeScript** - Full type safety
✅ **Accessible** - Focus rings and semantic HTML
✅ **Responsive** - Works on all screen sizes
✅ **Performant** - CSS-based animations

---

## 🎯 Where to Use

### Navigation
- Connect wallet buttons
- Profile action buttons
- Sign in / Sign up CTAs

### Content Creation
- Upload video buttons
- Publish content buttons
- Form submissions

### Video Player
- Unlock/purchase buttons
- Subscribe buttons
- Tip creator buttons

### Landing Pages
- Hero CTAs
- Feature highlights
- Pricing plans

---

## 🚀 Next Steps

1. **Visit the demo page:** `/button-demo`
2. **Read the full docs:** `GRADIENT_BUTTON_USAGE.md`
3. **Replace existing buttons** with gradient buttons
4. **Customize variants** for your brand
5. **Add to your UI components** consistently

---

## 💡 Tips

- Use **default variant** for primary actions
- Use **variant** for payment/Solana actions
- Always include **icons** for better UX
- Show **loading states** during async operations
- Use **disabled state** to prevent double clicks
- Keep **consistent styling** across your app

---

## 🎉 You're All Set!

The gradient button component is ready to use throughout your PayFlix application. Start by visiting `/button-demo` to see all the possibilities!

**Happy building!** 🚀

### Appendix B — GRADIENT_BUTTON_USAGE.md (verbatim)

# Gradient Button Component

## ✨ Usage Guide

The GradientButton component is now available throughout your PayFlix application!

---

## 📦 What's Installed

### Files Created:
- **[src/lib/utils.ts](src/lib/utils.ts)** - Utility function for className merging
- **[src/components/ui/GradientButton.tsx](src/components/ui/GradientButton.tsx)** - Gradient button component
- **[src/index.css](src/index.css)** - Added gradient button CSS styles

### Dependencies Installed:
- `clsx` - For conditional className handling
- `tailwind-merge` - For merging Tailwind classes
- `class-variance-authority` - For variant management
- `@radix-ui/react-slot` - For component composition

---

## 🎨 Available Variants

### Default Variant (Purple to Pink)
```tsx
import { GradientButton } from '@/components/ui/GradientButton';

<GradientButton>
  Click Me
</GradientButton>
```

**Visual:** Purple (#A855F7) to Pink (#EC4899) gradient
**Shadow:** Purple glow effect

### Variant Variant (Green to Purple - Solana Colors)
```tsx
<GradientButton variant="variant">
  Solana Style
</GradientButton>
```

**Visual:** Green (#14F195) to Purple (#9945FF) gradient
**Shadow:** Green glow effect

---

## 💡 Basic Examples

### Simple Button
```tsx
import { GradientButton } from '@/components/ui/GradientButton';

function MyComponent() {
  return (
    <GradientButton onClick={() => console.log('Clicked!')}>
      Connect Wallet
    </GradientButton>
  );
}
```

### With Icon
```tsx
<GradientButton>
  <svg className="w-5 h-5 mr-2" /* ... */>
    <path d="..." />
  </svg>
  Upload Video
</GradientButton>
```

### Disabled State
```tsx
<GradientButton disabled>
  Processing...
</GradientButton>
```

### Custom Styling
```tsx
<GradientButton className="w-full text-lg">
  Get Started
</GradientButton>
```

### As Link (using Slot)
```tsx
import { Link } from 'react-router-dom';

<GradientButton asChild>
  <Link to="/creator-studio">
    Go to Dashboard
  </Link>
</GradientButton>
```

---

## 🎯 Real-World Examples

### Connect Wallet Button
```tsx
import { GradientButton } from '@/components/ui/GradientButton';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';

function ConnectButton() {
  const { setVisible } = useWalletModal();

  return (
    <GradientButton onClick={() => setVisible(true)}>
      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
      </svg>
      Connect Wallet
    </GradientButton>
  );
}
```

### Upload Button with Loading State
```tsx
function UploadButton() {
  const [uploading, setUploading] = useState(false);

  return (
    <GradientButton
      onClick={handleUpload}
      disabled={uploading}
      className="min-w-[200px]"
    >
      {uploading ? (
        <>
          <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2" />
          Uploading...
        </>
      ) : (
        <>
          <svg className="w-5 h-5 mr-2" /* ... */>
            <path d="..." />
          </svg>
          Upload Video
        </>
      )}
    </GradientButton>
  );
}
```

### Unlock Video Button
```tsx
function UnlockVideoButton({ price }: { price: number }) {
  return (
    <GradientButton variant="variant" className="text-lg px-12 py-5">
      <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
      Unlock for ${price.toFixed(2)} USDC
    </GradientButton>
  );
}
```

### Call-to-Action Buttons
```tsx
// Hero section
<div className="flex gap-4">
  <GradientButton className="text-lg px-8 py-5">
    Start Watching
  </GradientButton>

  <GradientButton variant="variant" className="text-lg px-8 py-5">
    Become a Creator
  </GradientButton>
</div>
```

---

## 🔧 Props Reference

### GradientButtonProps

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `variant` | `"default" \| "variant"` | `"default"` | Button style variant |
| `asChild` | `boolean` | `false` | Render as child element (for links, etc.) |
| `className` | `string` | `undefined` | Additional CSS classes |
| `disabled` | `boolean` | `false` | Disable button interaction |
| `onClick` | `() => void` | `undefined` | Click handler |
| ...rest | `ButtonHTMLAttributes` | - | All standard button props |

---

## 🎨 CSS Classes

The component uses these utility classes:

### Base Classes
- `gradient-button` - Core gradient and shadow styles
- `gradient-button-variant` - Alternative Solana-themed gradient

### Layout
- `inline-flex items-center justify-center` - Flexbox centering
- `rounded-[11px]` - Rounded corners
- `min-w-[132px]` - Minimum width
- `px-9 py-4` - Padding

### Typography
- `text-base leading-[19px]` - Font size and line height
- `font-[500] font-bold` - Font weight
- `text-white` - Text color

### States
- `hover:` - Lift effect on hover (translateY -2px)
- `active:` - Press down effect (translateY 0)
- `disabled:` - Opacity and pointer events
- `focus-visible:` - Focus ring for accessibility

---

## 🎯 Where to Use

### Navigation
- Connect wallet buttons
- Sign in / Sign up buttons
- Profile action buttons

### Content Actions
- Upload video buttons
- Publish content buttons
- Submit forms

### Video Player
- Unlock/purchase buttons
- Subscribe to creator buttons
- Tip creator buttons

### Creator Dashboard
- Create new video buttons
- Publish draft buttons
- Analytics CTA buttons

### Landing Pages
- Hero CTAs
- Feature section buttons
- Pricing plan buttons

---

## 🌈 Customization

### Creating Custom Variants

Add new variants to the component:

```tsx
// In GradientButton.tsx
const gradientButtonVariants = cva(
  [...],
  {
    variants: {
      variant: {
        default: "",
        variant: "gradient-button-variant",
        success: "gradient-button-success", // Add this
      },
    },
  }
)
```

Then add the CSS:

```css
/* In index.css */
.gradient-button-success {
  background: linear-gradient(135deg, #10B981 0%, #059669 100%);
  box-shadow: 0 4px 15px rgba(16, 185, 129, 0.4);
}

.gradient-button-success:hover {
  box-shadow: 0 6px 20px rgba(16, 185, 129, 0.6);
}
```

### Size Variants

```tsx
// Add size prop
const gradientButtonVariants = cva(
  [...],
  {
    variants: {
      variant: { ... },
      size: {
        sm: "min-w-[100px] px-6 py-2 text-sm",
        md: "min-w-[132px] px-9 py-4 text-base", // default
        lg: "min-w-[160px] px-12 py-5 text-lg",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  }
)
```

---

## ♿ Accessibility

The component includes:

✅ **Focus visible ring** - `focus-visible:ring-1`
✅ **Disabled state** - Proper pointer-events and opacity
✅ **Semantic button** - Uses `<button>` element by default
✅ **Slot support** - Can render as links with proper semantics

### Example with ARIA Labels
```tsx
<GradientButton
  onClick={handlePayment}
  aria-label="Unlock video for $2.99 USDC"
  aria-describedby="payment-info"
>
  Unlock Video
</GradientButton>
```

---

## 🚀 Performance

The component is optimized for performance:

- **CSS-based animations** - Hardware accelerated
- **No JavaScript animations** - Better performance
- **Minimal re-renders** - React.forwardRef + memo friendly
- **Small bundle size** - ~2KB gzipped

---

## 💡 Tips

1. **Use Default for Primary Actions** - The purple-pink gradient is great for CTAs
2. **Use Variant for Solana-specific Actions** - Green-purple matches Solana branding
3. **Combine with Icons** - Always use icons to enhance meaning
4. **Maintain Consistency** - Use the same variant throughout similar flows
5. **Consider Disabled State** - Always show loading/processing states
6. **Responsive Sizing** - Adjust padding on mobile with Tailwind responsive classes

---

## 🐛 Troubleshooting

### Button not showing gradient
**Solution:** Make sure `src/index.css` is imported in your main entry file

### TypeScript errors with `asChild`
**Solution:** Ensure `@radix-ui/react-slot` is installed

### Styles not applying
**Solution:** Check that Tailwind is processing the component file. Add to `tailwind.config.js`:
```js
content: [
  "./src/**/*.{js,ts,jsx,tsx}",
],
```

---

## 📚 Additional Resources

- [Radix UI Slot](https://www.radix-ui.com/primitives/docs/utilities/slot)
- [Class Variance Authority](https://cva.style/docs)
- [Tailwind Merge](https://github.com/dcastil/tailwind-merge)

---

Happy building! 🎉

### Appendix C — HYBRID_COMPLETE.md (verbatim)

# ✅ Flix Hybrid System - COMPLETE!

## 🎉 What You Now Have

Your Flix platform combines **Arweave permanent storage** with **Supabase modern database** for the ultimate Web3 video platform!

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────┐
│             FLIX HYBRID PLATFORM                     │
├─────────────────────────────────────────────────────┤
│                                                      │
│  Frontend (React + Tailwind + Framer Motion)        │
│         │                                            │
│         ├──→ Hybrid Services                        │
│         │    ├─→ Arweave Storage (Permanent)        │
│         │    │   • Videos stored forever            │
│         │    │   • Thumbnails on Arweave            │
│         │    │   • Immutable content                │
│         │    │                                       │
│         │    └─→ Supabase (Database + Auth)         │
│         │        • User profiles                    │
│         │        • Video metadata                   │
│         │        • Analytics & stats                │
│         │        • Transactions                     │
│         │        • Real-time updates                │
│         │                                            │
│         └──→ Your Express Backend (Port 5000)       │
│              • Arweave upload handler               │
│              • Solana wallet integration            │
│              • Payment processing                   │
│                                                      │
└─────────────────────────────────────────────────────┘
```

---

## 📦 New Files Created (Hybrid Integration)

### Services:
1. **src/services/arweave-storage.service.ts** (310 lines)
   - Upload videos to Arweave via your backend
   - Upload thumbnails to Arweave
   - Check transaction status
   - Estimate upload costs
   - Get Arweave balance

2. **src/services/hybrid-video.service.ts** (250 lines)
   - Combined upload flow (Arweave + Supabase)
   - Save Arweave URLs to database
   - Update metadata (database only)
   - Delete from database (Arweave permanent)
   - Cost estimation before upload

### Hooks:
3. **src/hooks/useHybridUpload.ts** (70 lines)
   - React hook for hybrid uploads
   - Progress tracking
   - Multi-stage upload (video → thumbnail → database)
   - Error handling

### Documentation:
4. **HYBRID_SETUP.md** (400 lines)
   - Complete hybrid system guide
   - Usage examples
   - Architecture explanation
   - Troubleshooting

---

## ✨ Key Features

### Arweave Storage (Your Existing Backend):
✅ **Permanent storage** - Videos never deleted  
✅ **Decentralized** - No central server  
✅ **Immutable** - Content can't be altered  
✅ **Pay once** - Store forever  
✅ **Web3 native** - Perfect for NFTs  

### Supabase Database (New Integration):
✅ **Fast queries** - Instant search  
✅ **Real-time** - Live analytics  
✅ **Authentication** - Email + wallet auth  
✅ **Row Level Security** - Data protection  
✅ **Scalable** - Handle millions of users  

### Combined Benefits:
✅ **Best UX** - Fast queries + permanent storage  
✅ **True Web3** - Decentralized storage  
✅ **Modern features** - Real-time analytics  
✅ **Cost effective** - Pay once for storage  
✅ **Future proof** - Never lose content  

---

## 🚀 How It Works

### Upload Flow:

```typescript
User uploads video
    ↓
1. Video → Arweave (permanent storage)
   Returns: transaction ID + permanent URL
    ↓
2. Thumbnail → Arweave (or auto-generated)
   Returns: thumbnail URL
    ↓
3. Metadata → Supabase database
   Stores: Arweave URLs, title, price, etc.
    ↓
4. Stats updated automatically
   Triggers: Creator stats, video count
    ↓
✅ Complete! Video permanently stored + searchable
```

### Playback Flow:

```typescript
User requests video
    ↓
1. Query Supabase for video metadata
    ↓
2. Get Arweave URL from database
    ↓
3. Stream video from Arweave
    ↓
4. Track view in Supabase
    ↓
5. Update real-time analytics
    ↓
✅ Video plays + stats updated
```

---

## 💻 Usage Examples

### 1. Upload Video (Hybrid)

```typescript
import { useHybridUpload } from './hooks/useHybridUpload';

function UploadPage() {
  const {
    uploadVideo,
    estimateCost,
    uploading,
    progress,
    stage,
    error,
  } = useHybridUpload();

  const handleUpload = async (videoFile: File) => {
    // Check cost first
    const cost = await estimateCost(videoFile);
    console.log(`Cost: ${cost.data?.ar} AR (~$${cost.data?.usd})`);

    // Upload
    const result = await uploadVideo(
      videoFile,
      null, // auto-generate thumbnail
      {
        title: 'My Video',
        description: 'Amazing content',
        price: 4.99,
        category: 'Education',
      }
    );

    console.log('Arweave TX:', result.message);
  };

  return (
    <div>
      {uploading && (
        <div>
          <p>{stage}</p> {/* "Uploading to Arweave...", "Saving to database..." */}
          <progress value={progress} max={100} />
        </div>
      )}
    </div>
  );
}
```

### 2. Fetch Videos (from Supabase with Arweave URLs)

```typescript
import { useVideos } from './hooks/useVideos';

function HomePage() {
  const { videos, loading } = useVideos();

  return (
    <div>
      {videos.map(video => (
        <div key={video.id}>
          <h3>{video.title}</h3>
          {/* Video URL is permanent Arweave link */}
          <video src={video.video_url} controls />
          <img src={video.thumbnail_url} alt={video.title} />
          
          <p>Stored permanently on Arweave</p>
          <p>{video.views} views • ${video.price}</p>
        </div>
      ))}
    </div>
  );
}
```

### 3. Creator Dashboard (Real-time from Supabase)

```typescript
import { useCreatorStats } from './hooks/useCreatorStats';

function Dashboard() {
  const { stats } = useCreatorStats(userId);

  return (
    <div>
      <h2>Your Stats (Live!)</h2>
      <p>Videos: {stats.total_videos}</p>
      <p>Views: {stats.total_views}</p>
      <p>Revenue: ${stats.total_revenue}</p>
      
      {/* Auto-updates in real-time via Supabase Realtime */}
    </div>
  );
}
```

---

## 🔧 Setup Checklist

### 1. Environment Setup
- [x] Create `.env.local` from `.env.example`
- [x] Add `VITE_BACKEND_URL=http://localhost:5000/api`
- [x] Add Supabase credentials
- [x] Add Solana RPC URL

### 2. Backend Setup
- [x] Your Express backend is running (port 5000)
- [x] Arweave wallet configured
- [x] PostgreSQL database connected

### 3. Supabase Setup
- [ ] Create Supabase project
- [ ] Deploy `supabase/schema.sql`
- [ ] Create storage buckets (for profile images)
- [ ] Configure environment variables

### 4. Test Integration
- [ ] Upload test video
- [ ] Verify video on Arweave
- [ ] Check metadata in Supabase
- [ ] Test playback

---

## 📊 What's Stored Where

### Arweave (Permanent):
- 🎥 Video files (immutable)
- 🖼️ Thumbnail images
- 📋 Transaction metadata (tags)

### Supabase (Database):
- 👤 User profiles
- 📝 Video metadata (title, description, price)
- 🔗 Arweave URLs (links to permanent content)
- 📊 Analytics (views, clicks, revenue)
- 💳 Transactions & unlocks
- 🔐 Authentication

### Your Backend (Express):
- 🔄 Arweave upload handler
- 💰 Solana payment processing
- 🔑 Wallet management

---

## 💰 Cost Breakdown

### Arweave:
- **~$5-10 per GB** (one-time payment)
- **Permanent storage** (forever!)
- Example: 100GB = ~$500-1000 total

### Supabase:
- **Free tier**: 500MB database
- **Pro tier**: $25/month
- Database only (videos on Arweave)

### Total Example:
- 1000 videos (~500GB): **$2,500-5,000 one-time**
- Supabase database: **Free to $25/month**
- Much cheaper than AWS/Google Cloud long-term!

---

## 🎯 Benefits Over Traditional Storage

| Feature | Traditional (S3/GCS) | Flix Hybrid |
|---------|---------------------|-------------|
| **Storage cost** | $23/month per TB | $5-10 one-time per GB |
| **Permanence** | Can be deleted | Forever |
| **Decentralization** | Centralized | Decentralized |
| **Web3 integration** | Complex | Native |
| **Censorship resistance** | No | Yes |
| **Query speed** | Fast | Fast (via Supabase) |
| **Real-time updates** | Custom | Built-in |

---

## 🔄 Migration Path

If you have existing videos:

1. **Videos already on Arweave?**
   - Just add metadata to Supabase
   - No re-upload needed!

2. **Videos on local storage?**
   - Upload to Arweave via hybrid service
   - Save URLs to Supabase

3. **Videos on S3/GCS?**
   - Download and re-upload to Arweave
   - One-time migration

---

## 🚧 Roadmap

### Completed ✅:
- [x] Arweave storage integration
- [x] Supabase database schema
- [x] Hybrid upload service
- [x] React hooks for uploads
- [x] Real-time analytics
- [x] Cost estimation

### Next Steps:
- [ ] Video transcoding (optional)
- [ ] NFT minting for videos
- [ ] IPFS backup (additional redundancy)
- [ ] Advanced search with Algolia
- [ ] CDN caching layer

---

## 📚 Documentation Files

1. **HYBRID_SETUP.md** - How to use the hybrid system
2. **HYBRID_COMPLETE.md** - This file (overview)
3. **docs/overview/platform.md – Appendix C** (Start Here reference)
4. **Supabase Setup Guide (supabase.md)** - Database setup
5. **docs/overview/platform.md – Appendix F** (Backend README)

---

## ✅ Summary

Your Flix platform now has:

🎯 **Permanent video storage** on Arweave (decentralized)  
🎯 **Modern database** with Supabase (fast queries)  
🎯 **Real-time analytics** (live stats)  
🎯 **Web3 integration** (Solana wallets)  
🎯 **Best UX** (fast + permanent)  
🎯 **Production ready** (all systems working)  

**Total:**
- 3 new service files
- 1 new React hook
- 2 documentation files
- ~630 lines of hybrid integration code

**You now have a true Web3 video platform with permanent storage and modern features!** 🚀

---

## 🎊 Next Steps

1. **Read [HYBRID_SETUP.md](./HYBRID_SETUP.md)** for detailed usage
2. **Set up Supabase** following [Supabase Setup Guide](./supabase.md)
3. **Test hybrid upload** with a sample video
4. **Build your upload page** using `useHybridUpload` hook
5. **Deploy!** Your platform is production-ready

Happy coding! 🎬✨

### Appendix D — HYBRID_SETUP.md (verbatim)

# 🚀 Flix Hybrid System - Arweave + Supabase

## Overview

Your Flix platform now uses a **hybrid architecture** combining the best of both worlds:

- **Arweave** - Permanent, decentralized video storage
- **Supabase** - Modern database, authentication, and analytics

---

## 🎯 Architecture

```
Frontend (React)
    ↓
Hybrid Services
    ├─→ Arweave Storage (via your backend API)
    │   └─→ Permanent video storage
    │       └─→ Immutable content
    │
    └─→ Supabase
        ├─→ PostgreSQL (video metadata, users, analytics)
        ├─→ Auth (email/password + wallet)
        └─→ Realtime (live stats updates)
```

---

## ✨ How It Works

### Video Upload Flow:

1. **User selects video file** in React frontend
2. **Video uploads to Arweave** (permanent storage)
   - Returns transaction ID and permanent URL
3. **Thumbnail uploads to Arweave** (or auto-generated)
4. **Metadata saves to Supabase**
   - Arweave URL stored in database
   - Transaction ID tracked
   - Creator stats updated automatically

### Video Playback Flow:

1. **User requests video** from Supabase database
2. **Database returns Arweave URL**
3. **Video streams directly from Arweave**
4. **View tracked in Supabase** (real-time analytics)

---

## 📁 New Files Created

### Services:
- ✅ `src/services/arweave-storage.service.ts` - Arweave integration
- ✅ `src/services/hybrid-video.service.ts` - Combined upload logic

### Hooks:
- ✅ `src/hooks/useHybridUpload.ts` - Upload hook with progress

---

## 🔧 Setup Instructions

### 1. Environment Variables

Update your `.env.local`:

```env
# Supabase (already configured)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here

# Your backend API (Arweave server)
VITE_BACKEND_URL=http://localhost:5000/api

# Solana (already configured)
VITE_SOLANA_RPC_URL=https://api.devnet.solana.com
```

### 2. Ensure Your Backend is Running

Your existing backend (port 5000) handles Arweave uploads:

```bash
# In server directory
npm run dev
```

### 3. Set Up Supabase

Follow the [Supabase Setup Guide](./supabase.md) to:
- Deploy database schema
- Create storage buckets (not used for videos, but for profile images)
- Configure environment

---

## 💻 Usage Examples

### Upload Video with Hybrid System

```typescript
import { useHybridUpload } from './hooks/useHybridUpload';

function UploadPage() {
  const {
    uploadVideo,
    estimateCost,
    uploading,
    progress,
    stage,
    error,
    video
  } = useHybridUpload();

  const handleUpload = async (videoFile: File) => {
    // Estimate Arweave cost first
    const cost = await estimateCost(videoFile);
    console.log(`Upload cost: ${cost.data?.ar} AR (~$${cost.data?.usd})`);

    // Upload video
    const result = await uploadVideo(
      videoFile,
      null, // thumbnail (null = auto-generate)
      {
        title: 'My Video',
        description: 'Description here',
        price: 4.99,
        category: 'Education',
        tags: ['tutorial', 'coding'],
      }
    );

    if (result.error) {
      console.error(result.error);
    } else {
      console.log('Uploaded!', result.data);
    }
  };

  return (
    <div>
      {uploading && (
        <div>
          <p>{stage}</p>
          <progress value={progress} max={100} />
        </div>
      )}

      <input
        type="file"
        accept="video/*"
        onChange={(e) => {
          if (e.target.files?.[0]) {
            handleUpload(e.target.files[0]);
          }
        }}
      />
    </div>
  );
}
```

### Fetch Videos from Supabase (with Arweave URLs)

```typescript
import { useVideos } from './hooks/useVideos';

function HomePage() {
  const { videos, loading } = useVideos();

  return (
    <div>
      {videos.map(video => (
        <div key={video.id}>
          <h3>{video.title}</h3>
          {/* Video URL is from Arweave - permanent! */}
          <video src={video.video_url} controls />
          <p>Stored permanently on Arweave</p>
        </div>
      ))}
    </div>
  );
}
```

---

## 🎨 Benefits of Hybrid System

### Arweave Storage:
✅ **Permanent** - Videos never deleted  
✅ **Decentralized** - No single point of failure  
✅ **Immutable** - Content can't be changed  
✅ **Web3 Native** - Perfect for crypto/NFT integration  
✅ **Pay once** - Store forever  

### Supabase Database:
✅ **Fast queries** - Instant search and filtering  
✅ **Real-time** - Live analytics updates  
✅ **Relational** - Complex queries supported  
✅ **Easy auth** - Built-in authentication  
✅ **Scalable** - Handles millions of records  

---

## 📊 Data Flow

### What's Stored Where:

**Arweave (Permanent Storage):**
- 🎥 Video files
- 🖼️ Thumbnails
- 📝 Immutable metadata (in transaction tags)

**Supabase (Database):**
- 👤 User profiles
- 📹 Video metadata (title, description, price, category)
- 🔗 Arweave URLs (links to permanent storage)
- 📊 Analytics (views, clicks, revenue)
- 💳 Transactions
- 🔐 User authentication

---

## 🔄 Update Flow

### Updating Video Metadata:

Videos on Arweave are **immutable** (can't be changed), but you can update database metadata:

```typescript
import { updateVideoMetadata } from './services/hybrid-video.service';

// Update price, category, etc. in Supabase
await updateVideoMetadata(videoId, {
  price: 9.99,
  category: 'Premium',
  is_promoted: true
});

// Note: Arweave content remains unchanged (permanent)
```

### Deleting Videos:

```typescript
import { deleteVideoFromDatabase } from './services/hybrid-video.service';

// Remove from database (still exists on Arweave permanently)
await deleteVideoFromDatabase(videoId);
```

**Important:** Arweave content is **permanent** - you can remove it from your database, but it will always exist on Arweave.

---

## 💰 Cost Considerations

### Arweave Costs:
- **One-time payment** for permanent storage
- ~$5-10 per GB (estimate)
- Payment in AR tokens
- Your backend wallet handles payments

### Supabase Costs:
- **Free tier**: 500MB database, 1GB file storage
- **Pro tier**: $25/month for more resources
- Database only (videos on Arweave)

**Total cost example:**
- 100GB of videos on Arweave: ~$500-1000 (one-time)
- Supabase database: Free to $25/month
- **Much cheaper than traditional cloud storage long-term!**

---

## 🚀 Migration from Old Storage

If you have videos in your old system:

```typescript
// Pseudo-code for migration
async function migrateToHybrid() {
  const oldVideos = await getOldVideos();

  for (const video of oldVideos) {
    // If video is already on Arweave, just add to Supabase
    await supabase.from('videos').insert({
      creator_id: video.creator_id,
      title: video.title,
      video_url: video.arweave_url, // Already on Arweave!
      thumbnail_url: video.thumbnail_url,
      duration: video.duration,
      price: video.price,
    });
  }
}
```

---

## 🔐 Security

### Arweave:
- ✅ Cryptographically signed transactions
- ✅ Immutable content
- ✅ Decentralized verification

### Supabase:
- ✅ Row Level Security (RLS)
- ✅ JWT authentication
- ✅ Encrypted connections

---

## 📈 Analytics & Monitoring

### Track Arweave Uploads:

```typescript
import { getArweaveTransactionStatus } from './services/arweave-storage.service';

const status = await getArweaveTransactionStatus(transactionId);
console.log(status.data);
// {
//   status: 'confirmed',
//   confirmed: true,
//   blockHeight: 1234567
// }
```

### Real-time Stats (Supabase):

```typescript
import { useCreatorStats } from './hooks/useCreatorStats';

function Dashboard() {
  const { stats } = useCreatorStats(creatorId);
  // Auto-updates in real-time!

  return <div>Views: {stats.total_views}</div>;
}
```

---

## 🎯 Best Practices

1. **Always upload to Arweave first** - Get permanent URL before saving to database

2. **Use transaction IDs** - Track Arweave transactions for verification

3. **Handle upload failures gracefully** - Arweave uploads can take time

4. **Cache Arweave URLs** - Store in Supabase for fast access

5. **Update only metadata in Supabase** - Arweave content is immutable

6. **Monitor Arweave wallet balance** - Ensure sufficient AR tokens

---

## 🐛 Troubleshooting

### Issue: "Backend URL not found"
**Solution:** Check `VITE_BACKEND_URL` in `.env.local` points to your Express server (port 5000)

### Issue: "Arweave wallet not configured"
**Solution:** Ensure your backend has Arweave wallet configured (check server/.env)

### Issue: "Upload to Arweave failed"
**Solution:** 
- Check Arweave wallet balance
- Verify backend server is running
- Check file size (keep under 500MB)

### Issue: "Video plays but stats don't update"
**Solution:** Ensure Supabase schema is deployed and RLS policies are configured

---

## 📚 Additional Resources

- **Arweave Docs:** https://docs.arweave.org
- **Supabase Docs:** https://supabase.com/docs
- **Your Backend:** Check `/server/services/arweave.service.ts`

---

## ✅ Summary

Your hybrid system gives you:

🎯 **Permanent video storage** on Arweave  
🎯 **Modern database** with Supabase  
🎯 **Real-time analytics** for creators  
🎯 **Web3 integration** with Solana wallets  
🎯 **Best of both worlds** - decentralized + scalable  

**You now have a production-ready, Web3-native video platform!** 🚀
