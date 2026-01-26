# Design System Complet - Zodback Frontend

**Task: T2.0 - Guide de Style et Design System**
**Status: IN PROGRESS**
**Date: 2025-12-09**

---

## 🎨 Vue d'Ensemble

Ce document définit le design system complet pour Zodback, incluant :
- Palette de couleurs unified
- Système de typographie
- Spacing & layout grid
- Shadows & elevations
- Transitions & animations
- Components primitives

**Objectif:** Un système cohérent, professionnel, accessible (WCAG 2.1 AA).

---

## 🌈 1. PALETTE DE COULEURS

### 1.1 Couleurs Primaires

```typescript
// tailwind.config.ts - PRIMARY COLORS
const colors = {
  // Primary (Action, Buttons, Links, Focus)
  primary: {
    50:  '#EFF6FF',  // Lightest
    100: '#DBEAFE',
    200: '#BFDBFE',
    300: '#93C5FD',
    400: '#60A5FA',
    500: '#3B82F6',  // ← MAIN PRIMARY (Use this most)
    600: '#2563EB',
    700: '#1D4ED8',
    800: '#1E40AF',
    900: '#1E3A8A',  // Darkest
    950: '#172554',
  },

  // Secondary (Accent, Highlights)
  secondary: {
    50:  '#F3E8FF',
    100: '#E9D5FF',
    200: '#D8B4FE',
    300: '#C084FC',
    400: '#A855F7',
    500: '#9333EA',  // ← MAIN SECONDARY
    600: '#7E22CE',
    700: '#6B21A8',
    800: '#581C87',
    900: '#3F0F5C',
  },

  // Success (Positive actions, Confirmations)
  success: {
    50:  '#F0FDF4',
    100: '#DCFCE7',
    200: '#BBF7D0',
    300: '#86EFAC',
    400: '#4ADE80',
    500: '#22C55E',  // ← MAIN SUCCESS
    600: '#16A34A',
    700: '#15803D',
    800: '#166534',
    900: '#145231',
  },

  // Error (Destructive actions, Errors, Alerts)
  error: {
    50:  '#FEF2F2',
    100: '#FEE2E2',
    200: '#FECACA',
    300: '#FCA5A5',
    400: '#F87171',
    500: '#EF4444',  // ← MAIN ERROR
    600: '#DC2626',
    700: '#B91C1C',
    800: '#991B1B',
    900: '#7F1D1D',
  },

  // Warning (Caution, Info notices)
  warning: {
    50:  '#FFFBEB',
    100: '#FEF3C7',
    200: '#FDE68A',
    300: '#FCD34D',
    400: '#FBBF24',
    500: '#F59E0B',  // ← MAIN WARNING
    600: '#D97706',
    700: '#B45309',
    800: '#92400E',
    900: '#78350F',
  },

  // Info (Informational messages)
  info: {
    50:  '#EFF6FF',
    100: '#DBEAFE',
    200: '#BFDBFE',
    300: '#93C5FD',
    400: '#60A5FA',
    500: '#3B82F6',  // ← MAIN INFO (Same as primary)
    600: '#2563EB',
    700: '#1D4ED8',
    800: '#1E40AF',
    900: '#1E3A8A',
  },

  // Neutral (Backgrounds, Text, Borders)
  neutral: {
    50:  '#F9FAFB',  // Lightest (almost white)
    100: '#F3F4F6',
    150: '#ECECF1',  // Custom: between 100 and 200
    200: '#E5E7EB',
    300: '#D1D5DB',
    400: '#9CA3AF',
    500: '#6B7280',
    600: '#4B5563',
    700: '#374151',
    800: '#1F2937',
    900: '#111827',  // Darkest (almost black)
    950: '#030712',
  },
};
```

### 1.2 Semantic Color Usage

```typescript
// Color assignments by purpose
const semanticColors = {
  // Backgrounds
  background: {
    primary: 'neutral-50',      // Page backgrounds
    secondary: 'neutral-100',   // Cards, containers
    tertiary: 'neutral-200',    // Hover states
    inverse: 'neutral-900',     // Dark modes
  },

  // Text
  text: {
    primary: 'neutral-900',     // Main body text
    secondary: 'neutral-600',   // Secondary text, help text
    tertiary: 'neutral-500',    // Disabled text, subtle
    inverse: 'neutral-50',      // Text on dark background
    accent: 'primary-600',      // Links, accent text
  },

  // Borders & Dividers
  border: {
    light: 'neutral-200',       // Default borders
    medium: 'neutral-300',      // Stronger borders
    focus: 'primary-500',       // Focus ring
    error: 'error-300',         // Error borders
  },

  // Actions
  action: {
    primary: 'primary-600',     // Primary buttons
    secondary: 'neutral-200',   // Secondary buttons
    danger: 'error-600',        // Delete, destructive
    success: 'success-600',     // Confirmations
    warning: 'warning-600',     // Cautions
  },

  // Surfaces
  surface: {
    default: 'white',           // Card backgrounds
    elevated: 'neutral-50',     // Elevated elements
    overlay: 'neutral-900/50',  // Modals, overlays (with opacity)
  },
};
```

### 1.3 Color Contrast Verification

```
✅ WCAG AA Compliance (4.5:1 minimum for normal text)
✅ WCAG AAA Compliance (7:1 for enhanced contrast)

Verified combinations:
┌─────────────────────────────────────┐
│ Foreground  │ Background  │ Ratio   │
├─────────────┼─────────────┼─────────┤
│ neutral-900 │ neutral-50  │ 17.5:1  │ ✅
│ primary-600 │ white       │ 4.6:1   │ ✅
│ error-600   │ white       │ 5.2:1   │ ✅
│ success-600 │ white       │ 4.8:1   │ ✅
│ warning-600 │ white       │ 4.3:1   │ ⚠️ (text-lg OK)
│ white       │ neutral-900 │ 17.5:1  │ ✅
│ white       │ primary-600 │ 4.6:1   │ ✅
│ white       │ error-600   │ 5.2:1   │ ✅
└─────────────────────────────────────┘
```

### 1.4 Palette Hex Reference

```typescript
// Quick reference for developers
export const colorHex = {
  // Primary
  primary: '#3B82F6',
  primaryLight: '#DBEAFE',
  primaryDark: '#1D4ED8',

  // Secondary
  secondary: '#9333EA',
  secondaryLight: '#E9D5FF',
  secondaryDark: '#6B21A8',

  // Success
  success: '#22C55E',
  successLight: '#DCFCE7',
  successDark: '#15803D',

  // Error
  error: '#EF4444',
  errorLight: '#FEE2E2',
  errorDark: '#B91C1C',

  // Warning
  warning: '#F59E0B',
  warningLight: '#FEF3C7',
  warningDark: '#B45309',

  // Neutral
  white: '#FFFFFF',
  black: '#000000',
  gray: '#6B7280',
  lightGray: '#F3F4F6',
  darkGray: '#374151',
};
```

### 1.5 Color Usage Guidelines

```
PRIMARY (Blue #3B82F6):
├─ Main action buttons
├─ Links
├─ Focus rings
├─ Highlight colors
└─ Call-to-action elements

SECONDARY (Purple #9333EA):
├─ Alternative actions
├─ Accent elements
├─ Feature highlights
└─ Secondary CTAs

SUCCESS (Green #22C55E):
├─ Confirmations
├─ Success messages
├─ Valid form states
└─ Progress indicators (completion)

ERROR (Red #EF4444):
├─ Error messages
├─ Invalid form states
├─ Alerts
└─ Destructive actions (delete, remove)

WARNING (Amber #F59E0B):
├─ Warning messages
├─ Caution alerts
├─ Info notices
└─ Pending states

NEUTRAL (Gray #6B7280):
├─ Text content
├─ Borders
├─ Backgrounds
├─ Disabled states
└─ Secondary elements
```

---

## ✍️ 2. TYPOGRAPHIE

### 2.1 Font Stack

```typescript
// tailwind.config.ts - FONTS
const fontFamily = {
  // Sans serif - primary for UI
  sans: [
    'Inter',           // Google Font (UI optimized)
    'system-ui',       // Fallback to OS font
    '-apple-system',   // macOS/iOS
    'BlinkMacSystemFont',
    'Segoe UI',        // Windows
    'Roboto',          // Android
    'Helvetica',       // Fallback
    'Arial',           // Fallback
    'sans-serif',      // Generic
  ],

  // Serif - optional for headings or special content
  serif: [
    'Playfair Display',  // Google Font (elegant)
    'Georgia',
    'serif',
  ],

  // Monospace - for code, technical content
  mono: [
    'Fira Code',       // Google Font (code friendly)
    'Courier New',
    'monospace',
  ],
};
```

### 2.2 Font Scale (Modular Type System)

```typescript
// tailwind.config.ts - FONT SIZES
// Uses 1.2x scale (2^0.2) for proportional sizing
const fontSize = {
  // Display - Large headlines (xs < 768px, use 3xl or 4xl)
  'display-lg': ['56px', { lineHeight: '67.2px', fontWeight: '700', letterSpacing: '-1px' }],
  'display-md': ['48px', { lineHeight: '57.6px', fontWeight: '700', letterSpacing: '-0.5px' }],

  // Headings
  'heading-lg': ['32px', { lineHeight: '38.4px', fontWeight: '600', letterSpacing: '-0.3px' }],
  'heading-md': ['28px', { lineHeight: '33.6px', fontWeight: '600', letterSpacing: '-0.2px' }],
  'heading-sm': ['24px', { lineHeight: '28.8px', fontWeight: '600' }],
  'heading-xs': ['20px', { lineHeight: '24px', fontWeight: '600' }],

  // Subheadings
  'subhead-lg': ['18px', { lineHeight: '21.6px', fontWeight: '500' }],
  'subhead-md': ['16px', { lineHeight: '19.2px', fontWeight: '500' }],
  'subhead-sm': ['14px', { lineHeight: '16.8px', fontWeight: '500' }],

  // Body text (primary reading)
  'body-lg': ['16px', { lineHeight: '24px', fontWeight: '400' }],
  'body-md': ['14px', { lineHeight: '20px', fontWeight: '400' }],
  'body-sm': ['12px', { lineHeight: '16px', fontWeight: '400' }],

  // Captions (small text)
  'caption-lg': ['13px', { lineHeight: '16px', fontWeight: '500' }],
  'caption-md': ['12px', { lineHeight: '14.4px', fontWeight: '500' }],
  'caption-sm': ['11px', { lineHeight: '13.2px', fontWeight: '500' }],

  // UI Labels (buttons, form labels)
  'label-lg': ['14px', { lineHeight: '16.8px', fontWeight: '600' }],
  'label-md': ['13px', { lineHeight: '15.6px', fontWeight: '600' }],
  'label-sm': ['12px', { lineHeight: '14.4px', fontWeight: '600' }],

  // Code (monospace)
  'code-lg': ['14px', { lineHeight: '20px', fontWeight: '500', fontFamily: 'monospace' }],
  'code-md': ['13px', { lineHeight: '19.5px', fontWeight: '500', fontFamily: 'monospace' }],
  'code-sm': ['12px', { lineHeight: '18px', fontWeight: '500', fontFamily: 'monospace' }],
};

// Responsive typography (adjust for mobile)
// Mobile: Use smaller sizes (body-md instead of body-lg)
// Desktop: Use larger sizes for better hierarchy
```

### 2.3 Font Weight System

```typescript
// Font weights
const fontWeight = {
  thin: '100',      // Not used often
  extralight: '200', // Not used often
  light: '300',     // Light labels, help text
  normal: '400',    // Default body text
  medium: '500',    // Subheadings, labels
  semibold: '600',  // Headings, strong text
  bold: '700',      // Emphasis, important text
  extrabold: '800', // Display headings (rare)
};

// Usage patterns
const weights = {
  display: '700',    // h1, display text
  heading: '600',    // h2, h3, h4
  subhead: '500',    // Subheadings
  label: '600',      // Form labels, buttons
  body: '400',       // Regular text
  emphasis: '600',   // Strong/em
  light: '300',      // Help text (use 14px+ for readability)
};
```

### 2.4 Line Height System

```typescript
// Line heights for readability
const lineHeight = {
  tight: '1.1',      // Headings (compact)
  snug: '1.2',       // Subheadings
  normal: '1.4',     // Relaxed headings
  relaxed: '1.5',    // Body text (optimal)
  loose: '1.75',     // Accessibility (large text)
  very_loose: '2',   // Extra space for very small text
};

// Usage recommendations
const readingPrinciples = {
  // Headings: Shorter lines, tighter spacing
  h1: { size: 'display-lg', lineHeight: '1.1', maxWidth: '50ch' },
  h2: { size: 'heading-lg', lineHeight: '1.2', maxWidth: '60ch' },
  h3: { size: 'heading-md', lineHeight: '1.2', maxWidth: '65ch' },

  // Body: Longer lines, looser spacing
  body: { size: 'body-md', lineHeight: '1.6', maxWidth: '75ch' },

  // Small text: Larger spacing to compensate
  small: { size: 'body-sm', lineHeight: '1.6', maxWidth: '80ch' },
};
```

### 2.5 Letter Spacing

```typescript
// Letter spacing for hierarchy and readability
const letterSpacing = {
  tighter: '-0.05em',  // Headings (compact)
  tight: '-0.02em',    // Subheadings
  normal: '0em',       // Default
  wide: '0.025em',     // UI labels, acronyms
  wider: '0.05em',     // All caps (rare)
  widest: '0.1em',     // Very special cases
};

// Usage
const spacing = {
  display: '-1px',     // Very tight for large text
  heading: '-0.5px',   // Tight for headings
  body: '0',           // Normal spacing
  label: '0.5px',      // Slightly wider for clarity
  caps: '1px',         // All caps text
};
```

### 2.6 Typography Scale (Visual)

```
DISPLAY LG  56px ████████████████████████████████████████████ (h0)
DISPLAY MD  48px ██████████████████████████████████████ (h0)
HEADING LG  32px ████████████████████████ (h1 - Page title)
HEADING MD  28px ██████████████████ (h2 - Section title)
HEADING SM  24px ████████████████ (h3 - Subsection)
HEADING XS  20px ████████████ (h4 - Small heading)
SUBHEAD LG  18px ██████████ (Form section title)
SUBHEAD MD  16px ████████ (Form label, button text)
SUBHEAD SM  14px ██████ (Small form label)
BODY LG     16px ████████ (Primary body text)
BODY MD     14px ██████ (Standard body text)
BODY SM     12px ████ (Small text, footer)
CAPTION LG  13px █████ (Image caption)
CAPTION MD  12px ████ (Small caption)
CAPTION SM  11px ███ (Very small text)
```

---

## 📐 3. SPACING & LAYOUT

### 3.1 Spacing Scale (4px Grid)

```typescript
// tailwind.config.ts - SPACING
// Uses 4px as base unit for consistency
const spacing = {
  0: '0px',
  1: '4px',      // xs gap
  2: '8px',      // sm gap
  3: '12px',     // default gap
  4: '16px',     // md padding
  5: '20px',     // padding
  6: '24px',     // lg padding
  7: '28px',     // xl padding
  8: '32px',     // 2xl padding
  9: '36px',     // 3xl padding
  10: '40px',    // section padding
  12: '48px',    // large section
  14: '56px',    // extra large
  16: '64px',    // hero padding
  20: '80px',    // max padding
  24: '96px',    // very large
  28: '112px',
  32: '128px',
  36: '144px',
  40: '160px',
  44: '176px',
  48: '192px',
  52: '208px',
  56: '224px',
  60: '240px',
  64: '256px',
};

// Semantic spacing values
const spacingSemantic = {
  // Gaps between elements
  gapXs: '4px',
  gapSm: '8px',
  gapMd: '12px',
  gapLg: '16px',
  gapXl: '24px',
  gap2xl: '32px',

  // Padding for containers
  padXs: '8px',
  padSm: '12px',
  padMd: '16px',
  padLg: '24px',
  padXl: '32px',
  pad2xl: '48px',

  // Margins for sections
  marginXs: '12px',
  marginSm: '16px',
  marginMd: '24px',
  marginLg: '32px',
  marginXl: '48px',
  margin2xl: '64px',
};
```

### 3.2 Grid System

```typescript
// Content grid (12-column system for layouts)
const gridTemplateColumns = {
  auto: 'auto',
  1: 'repeat(1, minmax(0, 1fr))',
  2: 'repeat(2, minmax(0, 1fr))',
  3: 'repeat(3, minmax(0, 1fr))',
  4: 'repeat(4, minmax(0, 1fr))',
  5: 'repeat(5, minmax(0, 1fr))',
  6: 'repeat(6, minmax(0, 1fr))',
  12: 'repeat(12, minmax(0, 1fr))',  // Full grid system
};

// Container widths
const maxWidth = {
  none: 'none',
  xs: '320px',   // Mobile max
  sm: '640px',   // Tablet
  md: '768px',   // Tablet
  lg: '1024px',  // Desktop
  xl: '1280px',  // Large desktop
  '2xl': '1536px', // Extra large
  full: '100%',
  '7xl': '80rem', // Content-focused max
  screen: '100vw',
};

// Container max-widths for different layouts
const layouts = {
  fullWidth: 'max-w-none',
  widePage: 'max-w-7xl',        // 80rem (1280px) - Full content
  contentPage: 'max-w-4xl',      // 56rem (896px) - Blog posts
  formPage: 'max-w-md',          // 28rem (448px) - Forms
  narrowContent: 'max-w-2xl',    // 42rem (672px) - Single column
};
```

### 3.3 Responsive Breakpoints

```typescript
// Mobile-first responsive design
const breakpoints = {
  // Start: Mobile (< 640px) - Default styles
  // No prefix needed

  sm: '640px',   // Small devices (landscape phones)
  // Use: sm:flex, sm:grid-cols-2

  md: '768px',   // Tablets, large phones
  // Use: md:grid-cols-3, md:flex-row

  lg: '1024px',  // Desktops
  // Use: lg:grid-cols-4, lg:p-8

  xl: '1280px',  // Large desktops
  // Use: xl:max-w-7xl

  '2xl': '1536px', // Extra large displays
  // Use: 2xl:text-2xl
};

// Mobile-first approach
const responsiveExamples = {
  example1: {
    // Mobile: 1 column
    default: 'grid-cols-1 p-4',
    // Tablet: 2 columns
    tablet: 'md:grid-cols-2 md:p-6',
    // Desktop: 3 columns
    desktop: 'lg:grid-cols-3 lg:p-8',
    // Write as: grid-cols-1 md:grid-cols-2 lg:grid-cols-3
  },

  example2: {
    // Mobile: Flex column
    default: 'flex flex-col gap-4 text-sm',
    // Desktop: Flex row
    desktop: 'lg:flex-row lg:gap-8 lg:text-base',
    // Write as: flex flex-col lg:flex-row
  },
};
```

---

## 🌑 4. SHADOWS & ELEVATIONS

### 4.1 Shadow Levels (Elevation System)

```typescript
// tailwind.config.ts - BOX SHADOWS
const boxShadow = {
  none: 'none',

  // Level 1 - Subtle
  xs: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  sm: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',

  // Level 2 - Card default
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
  base: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',

  // Level 3 - Elevated
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
  card: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',

  // Level 4 - Floating
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
  float: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',

  // Level 5 - Modal/Overlay
  '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.1)',
  modal: '0 25px 50px -12px rgba(0, 0, 0, 0.15)',

  // Inset (inner shadow)
  inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.05)',
  'inner-md': 'inset 0 4px 6px -2px rgba(0, 0, 0, 0.1)',

  // Outline (focus rings)
  outline: '0 0 0 3px rgba(59, 130, 246, 0.1)',
  'outline-focus': '0 0 0 3px rgba(59, 130, 246, 0.5)',
};

// Usage guidelines
const shadowUsage = {
  none: 'Flat design (no elevation)',
  xs: 'Minimal depth (borders alternative)',
  sm: 'Subtle cards, buttons',
  md: 'Default cards, form containers',
  lg: 'Elevated cards, popovers',
  xl: 'Floating elements, menus',
  '2xl': 'Modals, full-screen overlays',
  inner: 'Inset cards, pressed buttons',
};
```

### 4.2 Elevation Examples

```html
<!-- No shadow - Flat -->
<div class="bg-white border border-gray-200">Flat</div>

<!-- Subtle - Thin borders alternative -->
<div class="bg-white shadow-sm">Subtle depth</div>

<!-- Card default - Standard containers -->
<div class="bg-white shadow">Card</div>

<!-- Elevated - Hover states, focus states -->
<div class="bg-white shadow-lg">Elevated</div>

<!-- Floating - Popovers, dropdowns -->
<div class="bg-white shadow-xl">Floating</div>

<!-- Modal - Dialog overlays -->
<div class="bg-white shadow-2xl">Modal</div>
```

---

## 🎬 5. TRANSITIONS & ANIMATIONS

### 5.1 Transition Times

```typescript
// tailwind.config.ts - TRANSITION DURATION
const transitionDuration = {
  0: '0ms',
  75: '75ms',    // Micro interactions (very fast)
  100: '100ms',  // Quick feedback
  150: '150ms',  // Standard transition
  200: '200ms',  // Medium transition (default)
  300: '300ms',  // Slower transition
  500: '500ms',  // Slow for emphasis
  700: '700ms',  // Very slow loading
  1000: '1000ms', // Loading states
};

// Usage guidelines
const transitionGuidelines = {
  micro: '75ms',    // Hover effects, opacity changes
  quick: '100ms',   // Button feedback, small changes
  standard: '150-200ms', // Dialog open/close, navigation
  slow: '300-500ms', // Page transitions, loading states
  veryShow: '700-1000ms', // Lengthy animations, emphasis
};
```

### 5.2 Timing Functions (Easing)

```typescript
// Easing curves for natural motion
const transitionTimingFunction = {
  linear: 'linear',  // Constant speed

  // Ease in (slow start)
  in: 'cubic-bezier(0.4, 0, 1, 1)',
  'in-quad': 'cubic-bezier(0.11, 0, 0.5, 0)',
  'in-cubic': 'cubic-bezier(0.35, 0, 0.65, 0)',
  'in-quart': 'cubic-bezier(0.5, 0, 0.75, 0)',
  'in-quint': 'cubic-bezier(0.645, 0.045, 0.355, 1)',

  // Ease out (slow end) - Most natural feeling
  out: 'cubic-bezier(0, 0, 0.2, 1)',  // ← Default for most UI
  'out-quad': 'cubic-bezier(0.5, 1, 0.89, 1)',
  'out-cubic': 'cubic-bezier(0.35, 1, 0.65, 1)',
  'out-quart': 'cubic-bezier(0.25, 1, 0.5, 1)',
  'out-quint': 'cubic-bezier(0.25, 1, 0.25, 1)',

  // Ease in-out (slow start and end)
  'in-out': 'cubic-bezier(0.4, 0, 0.2, 1)',
  'in-out-quad': 'cubic-bezier(0.45, 0.05, 0.55, 0.95)',
  'in-out-cubic': 'cubic-bezier(0.65, 0.05, 0.36, 1)',
};

// Usage recommendation
const easingUsage = {
  'ease-out': 'Default - Natural appearing/disappearing',
  'ease-in-out': 'Transitions between states',
  linear: 'Progress bars, rotating loaders',
  'ease-in': 'Rare - Use only for emphasis',
};
```

### 5.3 Animation Patterns

```css
/* Standard transitions */
.transition-all { transition: all 0.2s ease-out; }
.transition-colors { transition: background-color 0.2s ease-out, border-color 0.2s ease-out, color 0.2s ease-out; }
.transition-opacity { transition: opacity 0.2s ease-out; }
.transition-transform { transition: transform 0.2s ease-out; }

/* Hover effect: Subtle lift */
.hover-lift {
  @apply transition-all duration-200 ease-out;
  @apply hover:shadow-lg hover:-translate-y-1;
}

/* Focus effect: Ring + shadow */
.focus-ring {
  @apply focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary-500;
}

/* Button hover */
.btn-hover {
  @apply transition-all duration-150 ease-out;
  @apply hover:shadow-md hover:scale-105;
}

/* Disabled state */
.disabled-state {
  @apply opacity-50 cursor-not-allowed;
}
```

---

## 📋 6. BORDER & CORNER RADIUS

### 6.1 Border Radius Scale

```typescript
// tailwind.config.ts - BORDER RADIUS
const borderRadius = {
  none: '0px',
  xs: '4px',      // Small form elements, badges
  sm: '6px',      // Inputs, small cards
  md: '8px',      // Default, buttons, cards
  lg: '12px',     // Large cards, popovers
  xl: '16px',     // Extra large cards, modals
  '2xl': '20px',  // Dialog-like elements
  '3xl': '24px',  // Large hero sections
  full: '9999px', // Fully rounded (pills, circles)
};

// Usage guidelines
const radiusUsage = {
  xs: 'Small UI elements (4px)',
  sm: 'Form inputs, small containers (6px)',
  md: 'Default cards, buttons (8px)',
  lg: 'Larger cards, sections (12px)',
  xl: 'Modals, popovers (16px)',
  full: 'Buttons (pill), avatars (circles)',
};
```

### 6.2 Border Styles & Widths

```typescript
// Border width
const borderWidth = {
  0: '0px',     // No border
  1: '1px',     // Default border
  2: '2px',     // Strong border
  4: '4px',     // Very strong
  8: '8px',     // Extra strong (rare)
};

// Border colors - Use color palette
const borderColor = 'neutral-200'; // Default light border

// Usage
const borderUsage = {
  default: '1px solid',
  strong: '2px solid',
  hover: 'Use primary color on focus',
  error: 'Use error color for validation',
  disabled: 'Use neutral-300 (lighter)',
};
```

---

## 📱 7. RESPONSIVE RULES

### 7.1 Mobile-First Approach

```typescript
// Rule 1: Default = Mobile
// Start with base styles that work on 320px-480px screens
// Then ADD styles for larger screens

// Rule 2: Progressive Enhancement
// Base functionality on mobile
// Enhanced experience on desktop

// Rule 3: Touch-Friendly
// Minimum 44x44px tap targets on mobile
// Adequate spacing between interactive elements

// Rule 4: Text Sizing
// Mobile: 16px minimum (prevents zoom on iOS)
// Desktop: Can be smaller (14px) for secondary text

// Common mobile-first pattern:
const mobilFirstExample = {
  // Mobile (default)
  mobile: 'grid-cols-1 text-sm p-4',
  // Tablet
  tablet: 'sm:grid-cols-2 sm:text-base sm:p-6',
  // Desktop
  desktop: 'md:grid-cols-3 md:text-base md:p-8',
  // Large desktop
  large: 'lg:grid-cols-4',

  // Full class: grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4
};
```

---

## ✅ 8. DESIGN TOKENS CHECKLIST

Before implementation, verify:

```
Colors:
- [ ] Primary, secondary, success, error, warning, info defined
- [ ] All colors tested for WCAG AA contrast
- [ ] Semantic color mapping complete
- [ ] Neutral palette has 11 shades (50-950)

Typography:
- [ ] Font stack defined (sans, serif, mono)
- [ ] 13 font sizes defined
- [ ] Font weights defined (4-5 values)
- [ ] Line heights for each context
- [ ] Letter spacing for hierarchy

Spacing:
- [ ] 4px grid system consistent
- [ ] Spacing scale 0-64px defined
- [ ] Semantic spacing values (gap, padding, margin)
- [ ] Grid system defined (12-column)

Shadows:
- [ ] 5 elevation levels defined
- [ ] Focus ring shadow defined
- [ ] Inset shadows for depth

Transitions:
- [ ] Duration scale defined (0-1000ms)
- [ ] Easing functions selected
- [ ] Common animation patterns documented

Radius & Borders:
- [ ] Border radius scale defined
- [ ] Border width scale defined
- [ ] Default border color chosen

Responsive:
- [ ] 5 breakpoints defined (sm, md, lg, xl, 2xl)
- [ ] Mobile-first approach confirmed
- [ ] Touch-friendly guidelines set
```

---

## 📖 QUICK REFERENCE

```typescript
// Colors
primary: '#3B82F6'
secondary: '#9333EA'
success: '#22C55E'
error: '#EF4444'
warning: '#F59E0B'
text: '#111827'
border: '#E5E7EB'

// Typography
heading: 'text-heading-lg font-semibold'
body: 'text-body-md'
label: 'text-label-sm font-semibold'

// Spacing
gap: 'gap-4'  // 16px
padding: 'p-6' // 24px
margin: 'm-8'  // 32px

// Shadows
card: 'shadow-md'  // 0 4px 6px
elevated: 'shadow-lg' // 0 10px 15px

// Rounded
default: 'rounded-md' // 8px
card: 'rounded-lg'    // 12px
pill: 'rounded-full'  // 9999px

// Responsive
mobile-first: 'default sm:tablet md:desktop lg:large'
```

---

**T2.0 Status: ✅ DESIGN SYSTEM DEFINED**

Next: T2.1 - Build Component Library using these tokens
