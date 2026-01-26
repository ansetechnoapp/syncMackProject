# Patterns d'Interaction & Micro-interactions (T2.2)

**Task: T2.2 - Documenter patterns et micro-interactions**
**Status: COMPLETE**
**Date: 2025-12-09**

---

## 🎬 VUE D'ENSEMBLE

Ce document définit les patterns d'interaction standards pour zodback :
- Loading states
- Error handling
- Success confirmations
- Navigation transitions
- Form interactions
- Micro-interactions

Toutes les animations respectent `prefers-reduced-motion` pour l'accessibilité.

---

## 🔄 LOADING STATES

### Pattern 1: Simple Spinner

```html
<div class="flex items-center gap-2">
  <div class="animate-spin rounded-full h-4 w-4 border-2 border-primary-500 border-t-transparent" />
  <span class="text-sm text-neutral-600">Loading...</span>
</div>
```

**Usage:** Simple loading indicators in buttons, inline status

**Duration:** Indeterminate (until complete)
**Animation:** Smooth rotation, 1 second per full rotation

---

### Pattern 2: Skeleton Loaders

```html
<!-- Skeleton for card list -->
<div class="space-y-4">
  <div class="h-12 bg-neutral-200 rounded-md animate-pulse" />
  <div class="h-4 bg-neutral-200 rounded animate-pulse w-3/4" />
  <div class="h-4 bg-neutral-200 rounded animate-pulse w-1/2" />
</div>
```

**Usage:** Better perceived performance for content loading

**Duration:** Until real content loads
**Animation:** Gentle pulse (0.6s ease-in-out), respects prefers-reduced-motion

---

### Pattern 3: Progress Bar

```html
<div class="w-full h-2 bg-neutral-200 rounded-full overflow-hidden">
  <div class="h-full bg-primary-600 transition-all duration-300" style="width: 65%" />
</div>
```

**Usage:** File uploads, multi-step processes

**Duration:** Tied to actual progress
**Animation:** Smooth width transition (300ms)

---

## ❌ ERROR HANDLING

### Pattern 1: Inline Field Error

```tsx
<div className="flex flex-col gap-1">
  <label htmlFor="email" className="text-label-md">Email</label>
  <input
    id="email"
    type="email"
    aria-invalid={!!error}
    aria-describedby={error ? "email-error" : undefined}
    className={`border-2 rounded-md px-4 py-2 transition-colors ${
      error ? 'border-error-500 bg-error-50' : 'border-neutral-200'
    }`}
  />
  {error && (
    <p id="email-error" role="alert" className="text-caption-sm text-error-600">
      {error}
    </p>
  )}
</div>
```

**Timing:** Appears immediately when invalid
**Duration:** Stays until fixed
**Animation:** Fade in (150ms)
**A11y:** `role="alert"`, `aria-invalid`, `aria-describedby`

---

### Pattern 2: Toast Error Notification

```tsx
<div
  role="alert"
  className="fixed bottom-4 right-4 bg-error-50 border border-error-200 rounded-lg p-4 shadow-lg animate-slide-up"
>
  <h4 className="font-semibold text-error-900">Error</h4>
  <p className="text-error-700 text-sm">Failed to save changes</p>
  <button className="text-error-600 hover:text-error-900 text-sm mt-2">Retry</button>
</div>
```

**Duration:** 5-8 seconds (auto-dismiss) or manual close
**Animation:** Slide up from bottom (300ms ease-out)
**A11y:** `role="alert"`, dismissible

---

### Pattern 3: Error Boundary / Full Page Error

```tsx
<div className="min-h-screen bg-neutral-50 flex items-center justify-center p-4">
  <div className="bg-white rounded-lg shadow-lg p-8 max-w-md text-center">
    <div className="text-6xl mb-4">⚠️</div>
    <h1 className="text-heading-lg font-semibold text-error-900">Something went wrong</h1>
    <p className="text-body-md text-neutral-600 mt-2">Please try again or contact support</p>
    <button className="mt-6 px-6 py-3 bg-primary-600 text-white rounded-md hover:bg-primary-700">
      Reload Page
    </button>
  </div>
</div>
```

**Duration:** Persistent until resolved
**Animation:** Fade in (300ms ease-out)
**A11y:** Clear error message, actionable button

---

## ✅ SUCCESS CONFIRMATIONS

### Pattern 1: Toast Success

```tsx
<div
  role="status"
  className="fixed bottom-4 right-4 bg-success-50 border border-success-200 rounded-lg p-4 shadow-lg animate-slide-up"
>
  <div className="flex gap-3">
    <div className="text-2xl">✓</div>
    <div>
      <h4 className="font-semibold text-success-900">Success!</h4>
      <p className="text-success-700 text-sm">Changes saved</p>
    </div>
  </div>
</div>
```

**Duration:** 3 seconds auto-dismiss
**Animation:** Slide up (300ms), fade out (300ms)
**A11y:** `role="status"` (non-intrusive)

---

### Pattern 2: Confirmation Dialog

```tsx
<div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4">
  <div className="bg-white rounded-lg max-w-sm p-6">
    <h2 className="text-heading-md font-semibold">Delete this item?</h2>
    <p className="text-body-md text-neutral-600 mt-2">This action cannot be undone.</p>
    <div className="flex gap-3 mt-6 justify-end">
      <button className="px-4 py-2 rounded-md border border-neutral-200 hover:bg-neutral-50">
        Cancel
      </button>
      <button className="px-4 py-2 rounded-md bg-error-600 text-white hover:bg-error-700">
        Delete
      </button>
    </div>
  </div>
</div>
```

**Duration:** Until user responds
**Animation:** Backdrop fade in + modal zoom (300ms ease-out)
**A11y:** Focus trap, keyboard support (Escape closes)

---

### Pattern 3: Inline Success Message

```tsx
<div className="mt-4 p-4 bg-success-50 border border-success-200 rounded-md">
  <p className="text-success-700 font-medium">✓ Your profile has been updated</p>
</div>
```

**Duration:** Stays visible, user can dismiss
**Animation:** Fade in (200ms ease-out)
**A11y:** Semantic HTML, clear message

---

## 🧭 NAVIGATION PATTERNS

### Pattern 1: Breadcrumbs

```tsx
<nav className="flex gap-2 text-body-sm" aria-label="Breadcrumb">
  <a href="/" className="text-primary-600 hover:underline">Home</a>
  <span className="text-neutral-400">/</span>
  <a href="/dashboard" className="text-primary-600 hover:underline">Dashboard</a>
  <span className="text-neutral-400">/</span>
  <span className="text-neutral-600">Posts</span>
</nav>
```

**Purpose:** Show location in hierarchy
**Responsive:** Collapse on mobile (hide non-essential)
**A11y:** `aria-label="Breadcrumb"`, semantic links

---

### Pattern 2: Tab Navigation

```tsx
<div className="border-b border-neutral-200">
  <div className="flex gap-8" role="tablist">
    {['Overview', 'Settings', 'Users'].map((label, i) => (
      <button
        key={i}
        role="tab"
        aria-selected={activeTab === i}
        className={`py-4 px-1 border-b-2 transition-colors ${
          activeTab === i
            ? 'border-primary-600 text-primary-600'
            : 'border-transparent text-neutral-600 hover:text-neutral-900'
        }`}
      >
        {label}
      </button>
    ))}
  </div>
</div>
```

**Purpose:** Switch between content sections
**Animation:** Underline transitions (200ms ease-out)
**A11y:** Proper ARIA roles, keyboard navigation

---

### Pattern 3: Sidebar Collapse

```tsx
<button
  onClick={() => setSidebarOpen(!sidebarOpen)}
  className="p-2 hover:bg-neutral-100 rounded-md transition-colors"
  aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
>
  <ChevronLeftIcon className={`transition-transform ${sidebarOpen ? '' : 'rotate-180'}`} />
</button>
```

**Purpose:** Responsive navigation on mobile
**Animation:** Smooth width transition (300ms ease-out)
**A11y:** Button with clear label, keyboard accessible

---

## 📝 FORM INTERACTIONS

### Pattern 1: Form Field Focus

```css
/* When input is focused */
.input:focus {
  border-color: #3B82F6;           /* Primary color */
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1); /* Subtle ring */
  outline: none;
}

/* Input on hover (not focused) */
.input:hover:not(:focus) {
  border-color: #D1D5DB;
}
```

**Animation:** Instant (no transition for focus)
**Ring Color:** Primary accent
**A11y:** Clear focus indicator, tested with keyboard

---

### Pattern 2: Inline Validation

```tsx
const [email, setEmail] = useState('');
const [error, setError] = useState('');

const handleBlur = () => {
  if (!email.includes('@')) {
    setError('Invalid email format');
  } else {
    setError('');
  }
};

return (
  <input
    type="email"
    value={email}
    onChange={(e) => {
      setEmail(e.target.value);
      if (error) setError(''); // Clear error as they type
    }}
    onBlur={handleBlur}
    aria-invalid={!!error}
  />
);
```

**Validation Timing:** On blur (not while typing)
**Error Display:** After 500ms of inactivity
**Animation:** Gentle fade in of error message

---

### Pattern 3: Submit Button Loading

```tsx
<button
  type="submit"
  disabled={isLoading}
  className="px-6 py-3 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
>
  {isLoading ? (
    <>
      <span className="animate-spin inline-block mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
      Saving...
    </>
  ) : (
    'Save'
  )}
</button>
```

**Timing:** Submit button shows loading state immediately
**Duration:** Until API response received
**A11y:** Button disabled while loading, aria-busy possible

---

## 🎨 MICRO-INTERACTIONS

### Pattern 1: Hover Lift (Cards)

```css
.card {
  transition: all 0.2s ease-out;
}

.card:hover {
  transform: translateY(-4px);
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
}
```

**Purpose:** Feedback that element is interactive
**Duration:** 200ms
**Easing:** ease-out (natural, quick)

---

### Pattern 2: Button Scale on Click

```css
.button:active {
  transform: scale(0.98);
  transition: transform 0.1s ease-out;
}
```

**Purpose:** Tactile feedback
**Duration:** 100ms (quick)
**Easing:** ease-out

---

### Pattern 3: Checkbox Animation

```css
input[type="checkbox"]:checked {
  animation: checkmark 0.3s ease-out;
}

@keyframes checkmark {
  0% {
    transform: scale(0.5);
    opacity: 0;
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}
```

**Purpose:** Visual confirmation of action
**Duration:** 300ms
**Animation:** Scale + fade in

---

## 🎞️ PAGE TRANSITIONS

### Pattern 1: Fade In (Default)

```css
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

html.animate-in {
  animation: fadeIn 0.3s ease-out;
}
```

**Usage:** Most page transitions
**Duration:** 300ms
**Easing:** ease-out

---

### Pattern 2: Slide In (Sidebar)

```css
@keyframes slideInLeft {
  from {
    transform: translateX(-100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

.sidebar.open {
  animation: slideInLeft 0.3s ease-out;
}
```

**Usage:** Sidebar, drawers, modals
**Duration:** 300ms
**Easing:** ease-out

---

## 📊 ANIMATION TIMING REFERENCE

```
Micro-interactions:   75-150ms  (very fast, instant feel)
Feedback:            150-200ms  (natural, responsive)
Transitions:         200-300ms  (visible, not jarring)
Emphasis:            300-500ms  (noticeable, dramatic)
Loading states:      700-1000ms (indicates waiting)
```

---

## ♿ ACCESSIBILITY CONSIDERATIONS

### Respect prefers-reduced-motion

```css
/* All animations wrapped in media query */
@media (prefers-reduced-motion: no-preference) {
  .button {
    transition: all 0.2s ease-out;
  }

  .button:hover {
    transform: translateY(-2px);
  }
}

/* Default state (no motion) */
@media (prefers-reduced-motion: reduce) {
  * {
    animation: none !important;
    transition: none !important;
  }
}
```

### Ensure animations don't cause issues

✓ No flashing (> 3Hz)
✓ No seizure-inducing patterns
✓ Motion alternatives available
✓ Animations are not essential to functionality

---

## ✅ PATTERNS CHECKLIST

- [x] Loading states documented (3 patterns)
- [x] Error handling documented (3 patterns)
- [x] Success confirmations documented (3 patterns)
- [x] Navigation patterns documented (3 patterns)
- [x] Form interactions documented (3 patterns)
- [x] Micro-interactions documented (3 patterns)
- [x] Page transitions documented (2 patterns)
- [x] Accessibility considered for all
- [x] Animation timings standardized
- [x] prefers-reduced-motion respected

---

**T2.2 Status: ✅ COMPLETE**

Next: T2.3 - Create designer/developer guide
