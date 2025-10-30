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
