# Guide d'Utilisation - Designers & Développeurs (T2.3)

**Task: T2.3 - Documentation complète du design system**
**Status: COMPLETE**
**Date: 2025-12-09**

---

## 👨‍🎨 GUIDE POUR LES DESIGNERS

### 1. Avant de Designer

**Lisez d'abord:**
1. `2-design-system-complete.md` - Design tokens (colors, typography, spacing)
2. `2-component-library-T2.1.md` - Components existants
3. `2-design-system-patterns-T2.2.md` - Interaction patterns

**Outils recommandés:**
- Figma (design, prototyping)
- Color picker (validate contrast ratios)
- Accessibility checker (WCAG compliance)

### 2. Principes de Design

**Mobile First:**
```
Start with 320px (mobile)
Then add styles for sm (640px), md (768px), lg (1024px)
Design grows with breakpoints
```

**Color Usage:**
```
Primary (#3B82F6)    → Main actions, CTAs, focus
Secondary (#9333EA)  → Alternative actions, accents
Success (#22C55E)    → Confirmations, positive states
Error (#EF4444)      → Errors, destructive actions
Warning (#F59E0B)    → Warnings, cautions
Neutral (#6B7280)    → Text, backgrounds, disabled
```

**Typography Scale:**
```
Display LG (56px)   → Page hero titles (rare)
Heading LG (32px)   → Page titles (h1)
Heading MD (28px)   → Section titles (h2)
Heading SM (24px)   → Subsection titles (h3)
Body MD (14px)      → Default reading text
Body SM (12px)      → Secondary text
```

**Spacing Grid (4px base):**
```
Gap between elements:  4px (1 unit)
Container padding:     16px (4 units)
Section spacing:       24-32px (6-8 units)
Page padding:          32-48px (8-12 units)
```

### 3. Design Workflow

**Step 1: Wireframe**
- Use desktop/mobile artboards
- Focus on layout, hierarchy, content
- No colors yet, just grayscale

**Step 2: Add Color**
- Primary actions → primary color
- Secondary text → neutral-600
- Backgrounds → neutral-50 or white
- Borders → neutral-200

**Step 3: Add Details**
- Shadows (follow elevation levels)
- Border radius (use 8px default)
- Hover states (shadow + color)
- Focus states (ring + color)

**Step 4: Responsive**
- Create mobile (320px) layout
- Add tablet (768px) layout
- Add desktop (1024px) layout
- Test in Figma responsive mode

**Step 5: Documentation**
- Export specs (dimensions, colors, fonts)
- Create component variants in Figma
- Add documentation in component notes

### 4. Component Design Checklist

For each component, define:

- [ ] Default state
- [ ] Hover state (if interactive)
- [ ] Focus state (keyboard navigation)
- [ ] Active/selected state
- [ ] Disabled state
- [ ] Loading state (if applicable)
- [ ] Error state (for forms)
- [ ] Empty state (for containers)

**Example - Button Component:**
```
States:
├─ Default (idle)
├─ Hover (mouse over)
├─ Focus (keyboard focus - visible ring)
├─ Active (pressed)
├─ Disabled (unavailable)
└─ Loading (in progress)

Variants:
├─ Primary (main action)
├─ Secondary (alternative)
├─ Ghost (minimal)
└─ Danger (destructive)

Sizes:
├─ Small (sm)
├─ Medium (md)
└─ Large (lg)
```

### 5. Design Handoff

**What to provide developers:**

1. **Color definitions**
   ```
   Primary: #3B82F6
   Primary hover: #2563EB
   Primary focus ring: rgba(59, 130, 246, 0.1)
   ```

2. **Typography specs**
   ```
   Heading: 32px, 600 weight, -0.3px letter-spacing
   Body: 14px, 400 weight, 20px line-height
   ```

3. **Spacing measurements**
   ```
   Card padding: 24px (p-6)
   Button padding: 16px horizontal, 10px vertical
   Section gap: 32px (8 units)
   ```

4. **Component states**
   ```
   Button normal: #3B82F6
   Button hover: #2563EB (darker)
   Button focused: ring 2px offset 2px
   Button disabled: opacity 50%
   ```

5. **Responsive behavior**
   ```
   Grid mobile: 1 column
   Grid tablet: 2 columns (md:grid-cols-2)
   Grid desktop: 3 columns (lg:grid-cols-3)
   ```

---

## 👨‍💻 GUIDE POUR LES DÉVELOPPEURS

### 1. Setup Initial

**Install dependencies:**
```bash
cd frontend
pnpm install
```

**Update tailwind.config.ts:**
- Copy configuration from project root `tailwind.config.ts`
- All design tokens already defined

**Verify setup:**
```bash
pnpm run dev
# Open http://localhost:3014
# Styles should load correctly
```

### 2. Component Usage

**Import components:**
```typescript
import { Button, Input, Card, Modal } from '@/components';
```

**Use in page:**
```tsx
import { FormField, Card, Button } from '@/components';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  return (
    <Card title="Login" className="max-w-md mx-auto">
      <FormField
        label="Email"
        htmlFor="email"
        type="email"
        value={email}
        onChange={setEmail}
        required
      />
      <FormField
        label="Password"
        htmlFor="password"
        type="password"
        value={password}
        onChange={setPassword}
        required
      />
      <Button type="submit" className="mt-6">
        Sign In
      </Button>
    </Card>
  );
}
```

### 3. Tailwind Classes

**Always use design system colors:**
```tsx
// ✅ Good
<div className="bg-primary-50 border border-primary-200">

// ❌ Bad
<div className="bg-blue-100 border border-blue-300">
```

**Use typography classes:**
```tsx
// ✅ Good
<h1 className="text-heading-lg">Page Title</h1>
<p className="text-body-md">Content</p>

// ❌ Bad
<h1 className="text-4xl font-bold">Page Title</h1>
<p className="text-base">Content</p>
```

**Use spacing scale:**
```tsx
// ✅ Good
<div className="p-6 gap-4">

// ❌ Bad
<div className="p-24 gap-16">
```

### 4. Accessibility Checklist

For every component:

- [ ] Semantic HTML (`<button>`, `<form>`, `<nav>`, etc.)
- [ ] ARIA labels where needed
- [ ] `aria-invalid` and `aria-describedby` on form fields
- [ ] Focus visible (outline or ring)
- [ ] Keyboard navigation working
- [ ] Color contrast verified (4.5:1 minimum)
- [ ] Alt text on images
- [ ] `role` attributes where needed
- [ ] Test with keyboard (Tab, Enter, Escape)
- [ ] Test with screen reader (NVDA/JAWS)

**Common a11y patterns:**

```typescript
// Form field with error
<div>
  <label htmlFor="email">Email *</label>
  <input
    id="email"
    type="email"
    aria-invalid={!!error}
    aria-describedby={error ? "email-error" : undefined}
    required
  />
  {error && (
    <p id="email-error" role="alert" className="text-error-600">
      {error}
    </p>
  )}
</div>

// Modal with proper ARIA
<div
  role="dialog"
  aria-modal="true"
  aria-labelledby="modal-title"
>
  <h2 id="modal-title">Modal Title</h2>
  {/* content */}
</div>

// Focus management on button
<button
  className="px-4 py-2 bg-primary-600 text-white rounded-md
             focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary-500"
>
  Click me
</button>
```

### 5. Responsive Design Checklist

For every page:

- [ ] Mobile layout (320px-480px)
- [ ] Tablet layout (768px-1024px)
- [ ] Desktop layout (1024px+)
- [ ] No horizontal scrolling
- [ ] Touch targets ≥ 44x44px
- [ ] Text readable at all sizes
- [ ] Images responsive with srcset
- [ ] Collapse non-essential on mobile
- [ ] Touch-friendly spacing on mobile

**Mobile-first example:**
```tsx
// Mobile (default)
<div className="
  grid grid-cols-1      // 1 column on mobile
  gap-4                 // 16px gap
  p-4                   // 16px padding

  // Tablet and above
  sm:grid-cols-2 sm:gap-6 sm:p-6

  // Desktop and above
  md:grid-cols-3 md:gap-8 md:p-8
">
  {items.map(item => <Card key={item.id}>{item}</Card>)}
</div>
```

### 6. TypeScript Best Practices

**Define component interfaces:**
```typescript
interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
}

// Use the interface
export function Button(props: ButtonProps) {
  // ...
}
```

**Export types from components:**
```typescript
// src/components/index.ts
export type { ButtonProps } from './atoms/Button';
export { Button } from './atoms/Button';
```

**Use strict TypeScript:**
```typescript
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true
  }
}
```

### 7. Testing Checklist

For accessibility:
```bash
# Test with axe DevTools
# https://www.deque.com/axe/devtools/

# Test with NVDA (Windows)
# Test with VoiceOver (Mac)

# Keyboard navigation (Tab, Enter, Escape)
# Color contrast (4.5:1 minimum)
```

For responsiveness:
```bash
# Test mobile (320px, 375px, 425px)
# Test tablet (768px, 1024px)
# Test desktop (1280px, 1440px, 1920px)

# Chrome DevTools → Device Emulation
# Real devices if available
```

For performance:
```bash
# Lighthouse audit
# Chrome DevTools → Lighthouse tab

# Target scores:
# Performance: > 85
# Accessibility: > 95
# Best Practices: > 90
# SEO: > 90
```

### 8. Common Patterns

**Form with validation:**
```tsx
const [formData, setFormData] = useState({ email: '', password: '' });
const [errors, setErrors] = useState<Record<string, string>>({});

const handleSubmit = (e: React.FormEvent) => {
  e.preventDefault();
  const newErrors: Record<string, string> = {};

  if (!formData.email) newErrors.email = 'Email required';
  if (!formData.password) newErrors.password = 'Password required';

  if (Object.keys(newErrors).length > 0) {
    setErrors(newErrors);
    return;
  }

  // Submit logic here
};

return (
  <Form onSubmit={handleSubmit}>
    <FormField
      label="Email"
      htmlFor="email"
      error={errors.email}
      value={formData.email}
      onChange={(val) => setFormData({ ...formData, email: val })}
    />
    <FormField
      label="Password"
      htmlFor="password"
      type="password"
      error={errors.password}
      value={formData.password}
      onChange={(val) => setFormData({ ...formData, password: val })}
    />
    <Button type="submit">Login</Button>
  </Form>
);
```

**Data table:**
```tsx
const columns: Column<User>[] = [
  { key: 'email', label: 'Email', sortable: true },
  { key: 'role', label: 'Role' },
  {
    key: 'createdAt',
    label: 'Created',
    render: (date) => new Date(date).toLocaleDateString(),
  },
];

return (
  <DataTable<User>
    columns={columns}
    data={users}
    onSort={(key) => sortUsers(key)}
    loading={isLoading}
  />
);
```

---

## 🤝 COLLABORATION WORKFLOW

### Designer → Developer Handoff

1. **Design file shared in Figma**
   - Component library with variants
   - Page designs with specs
   - Prototype for interactions

2. **Developer creates components**
   - Following design exactly
   - Implements in Tailwind
   - Adds accessibility

3. **Developer tests**
   - Visual regression (compare to design)
   - Accessibility (axe, keyboard, screen reader)
   - Responsiveness (all breakpoints)
   - Performance (Lighthouse)

4. **Designer reviews code**
   - Verify visual accuracy
   - Check responsive behavior
   - Ensure interactions match

5. **Deploy**
   - Merge to production
   - Monitor for issues
   - Gather user feedback

### Version Control

- Design changes → Figma versioning
- Code changes → Git commits
- Keep both in sync

---

## 📚 QUICK REFERENCE

### Colors
```
Primary:    text-primary-600, bg-primary-600
Success:    text-success-600, bg-success-600
Error:      text-error-600, bg-error-600
Warning:    text-warning-600, bg-warning-600
Neutral:    text-neutral-600, bg-neutral-600
```

### Typography
```
h1: text-heading-lg
h2: text-heading-md
h3: text-heading-sm
p:  text-body-md
```

### Spacing
```
p-4     → 16px padding
gap-4   → 16px gap
m-6     → 24px margin
```

### Responsive
```
Mobile (default) → sm:tablet → md:desktop → lg:large
grid-cols-1 sm:grid-cols-2 md:grid-cols-3
```

### Shadows
```
shadow-sm → subtle
shadow-md → default card
shadow-lg → elevated
shadow-2xl → modal
```

---

## ✅ FINAL CHECKLIST

**Before starting work:**
- [ ] Downloaded tailwind.config.ts
- [ ] Read design system docs (T2.0)
- [ ] Read component library (T2.1)
- [ ] Reviewed patterns (T2.2)
- [ ] Familiar with color/typography scales

**During development:**
- [ ] Using components from @/components
- [ ] Mobile-first responsive design
- [ ] WCAG 2.1 AA accessibility
- [ ] Proper TypeScript types
- [ ] Testing accessibility

**Before submitting PR:**
- [ ] Visual matches design
- [ ] All states tested (hover, focus, disabled, loading, error)
- [ ] Responsive on all breakpoints
- [ ] No console errors
- [ ] Lighthouse score > 85
- [ ] Axe audit clean (0 violations)
- [ ] Keyboard navigation working

---

**T2.3 Status: ✅ COMPLETE**

## 🎉 PHASE 2 COMPLETE!

You now have:
✅ Design system with tokens
✅ 15+ reusable components
✅ Interaction patterns documented
✅ Designer & developer guides
✅ Implementation ready

**Next: Phase 3 - Design Maquettes**
See: `5-ux-ui-frontend-redesign-plan.md` (T3.0-T3.4)
