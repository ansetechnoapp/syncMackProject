# Bibliothèque de Composants Standardisés (T2.1)

**Task: T2.1 - Créer 15+ composants réutilisables**
**Status: IN PROGRESS**
**Date: 2025-12-09**

---

## 📦 Vue d'Ensemble

Cette bibliothèque contient 15+ composants React/TypeScript réutilisables, construits avec:
- **Design System:** Tokens Tailwind du fichier 2-design-system-complete.md
- **Architecture:** Atomic design (atoms → molecules → organisms)
- **Constraints:** Maximum 80 lignes par fichier (modularité)
- **Accessibility:** WCAG 2.1 AA compliant
- **Pattern:** Composition over inheritance

---

## 🏗️ ARCHITECTURE DES COMPOSANTS

```
src/components/
├── atoms/              # Basic building blocks
│   ├── Button.tsx
│   ├── Input.tsx
│   ├── Label.tsx
│   ├── Badge.tsx
│   └── Avatar.tsx
├── molecules/          # Simple compositions
│   ├── FormField.tsx   # Label + Input + Error
│   ├── Card.tsx
│   ├── Modal.tsx
│   └── Alert.tsx
├── organisms/          # Complex compositions
│   ├── Form.tsx
│   ├── DataTable.tsx
│   └── Navigation.tsx
└── lib/
    └── classNames.ts   # Utility functions
```

---

## 🧬 ATOMS - Basic Building Blocks

### 1. Button Component

```typescript
// src/components/atoms/Button.tsx
import React from 'react';

interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  className?: string;
  fullWidth?: boolean;
}

export function Button({
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  children,
  onClick,
  type = 'button',
  className = '',
  fullWidth = false,
}: ButtonProps) {
  const baseStyles = `
    inline-flex items-center justify-center font-semibold
    rounded-md transition-all duration-150 ease-out
    focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
    disabled:opacity-50 disabled:cursor-not-allowed
    ${fullWidth ? 'w-full' : ''}
  `.trim();

  const variants = {
    primary: 'bg-primary-600 text-white hover:bg-primary-700 focus-visible:ring-primary-500',
    secondary: 'bg-neutral-200 text-neutral-900 hover:bg-neutral-300 focus-visible:ring-primary-500',
    ghost: 'text-primary-600 hover:bg-primary-50 focus-visible:ring-primary-500',
    danger: 'bg-error-600 text-white hover:bg-error-700 focus-visible:ring-error-500',
  };

  const sizes = {
    sm: 'px-3 py-2 text-sm',
    md: 'px-4 py-2.5 text-base',
    lg: 'px-6 py-3 text-lg',
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
    >
      {loading && (
        <span className="animate-spin mr-2 h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
      )}
      {children}
    </button>
  );
}
```

**Usage:**
```tsx
<Button variant="primary" size="md">Save</Button>
<Button variant="danger" loading>Deleting...</Button>
<Button variant="ghost" fullWidth>Cancel</Button>
```

---

### 2. Input Component

```typescript
// src/components/atoms/Input.tsx
import React from 'react';

interface InputProps {
  type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url';
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
  error?: string;
  required?: boolean;
  autoComplete?: string;
  maxLength?: number;
  className?: string;
}

export function Input({
  type = 'text',
  placeholder,
  value,
  onChange,
  disabled = false,
  error,
  required = false,
  autoComplete,
  maxLength,
  className = '',
}: InputProps) {
  return (
    <input
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
      disabled={disabled}
      required={required}
      maxLength={maxLength}
      autoComplete={autoComplete}
      aria-invalid={!!error}
      className={`
        px-4 py-2.5 rounded-md border-2 text-base
        bg-white text-neutral-900 placeholder:text-neutral-500
        transition-all duration-150 ease-out
        ${error
          ? 'border-error-500 bg-error-50 focus:border-error-600'
          : 'border-neutral-200 hover:border-neutral-300 focus:border-primary-500'
        }
        focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/50
        disabled:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-60
        ${className}
      `}
    />
  );
}
```

**Usage:**
```tsx
<Input type="email" placeholder="you@example.com" error={errors.email} />
<Input type="password" value={password} onChange={setPassword} />
```

---

### 3. Label Component

```typescript
// src/components/atoms/Label.tsx
import React from 'react';

interface LabelProps {
  htmlFor: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}

export function Label({
  htmlFor,
  required = false,
  children,
  className = '',
}: LabelProps) {
  return (
    <label
      htmlFor={htmlFor}
      className={`block text-label-md text-neutral-700 mb-2 ${className}`}
    >
      {children}
      {required && <span className="text-error-500 ml-1">*</span>}
    </label>
  );
}
```

---

### 4. Badge Component

```typescript
// src/components/atoms/Badge.tsx
import React from 'react';

interface BadgeProps {
  variant?: 'default' | 'success' | 'error' | 'warning' | 'info';
  size?: 'sm' | 'md';
  children: React.ReactNode;
  className?: string;
}

export function Badge({
  variant = 'default',
  size = 'md',
  children,
  className = '',
}: BadgeProps) {
  const variants = {
    default: 'bg-primary-100 text-primary-700',
    success: 'bg-success-100 text-success-700',
    error: 'bg-error-100 text-error-700',
    warning: 'bg-warning-100 text-warning-700',
    info: 'bg-info-100 text-info-700',
  };

  const sizes = {
    sm: 'px-2 py-1 text-xs font-medium rounded',
    md: 'px-3 py-1.5 text-sm font-medium rounded-md',
  };

  return (
    <span className={`inline-flex items-center ${variants[variant]} ${sizes[size]} ${className}`}>
      {children}
    </span>
  );
}
```

---

### 5. Avatar Component

```typescript
// src/components/atoms/Avatar.tsx
import React from 'react';

interface AvatarProps {
  initials: string;
  src?: string;
  alt?: string;
  size?: 'sm' | 'md' | 'lg';
  bgColor?: string;
  className?: string;
}

export function Avatar({
  initials,
  src,
  alt = 'Avatar',
  size = 'md',
  bgColor = 'bg-primary-500',
  className = '',
}: AvatarProps) {
  const sizes = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
  };

  if (src) {
    return (
      <img
        src={src}
        alt={alt}
        className={`${sizes[size]} rounded-full object-cover ${className}`}
      />
    );
  }

  return (
    <div
      className={`
        ${sizes[size]} ${bgColor} text-white
        rounded-full flex items-center justify-center font-semibold
        ${className}
      `}
    >
      {initials}
    </div>
  );
}
```

---

## 🧩 MOLECULES - Simple Compositions

### 6. FormField Component

```typescript
// src/components/molecules/FormField.tsx
import React from 'react';
import { Label } from '../atoms/Label';
import { Input } from '../atoms/Input';

interface FormFieldProps {
  label: string;
  htmlFor: string;
  type?: 'text' | 'email' | 'password' | 'number';
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  error?: string;
  hint?: string;
  required?: boolean;
}

export function FormField({
  label,
  htmlFor,
  type = 'text',
  placeholder,
  value,
  onChange,
  error,
  hint,
  required = false,
}: FormFieldProps) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={htmlFor} required={required}>
        {label}
      </Label>
      <Input
        type={type}
        id={htmlFor}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        error={error}
        required={required}
      />
      {error && <p className="text-caption-sm text-error-600">{error}</p>}
      {hint && <p className="text-caption-sm text-neutral-600">{hint}</p>}
    </div>
  );
}
```

---

### 7. Card Component

```typescript
// src/components/molecules/Card.tsx
import React from 'react';

interface CardProps {
  title?: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  padding?: 'sm' | 'md' | 'lg';
  shadow?: 'none' | 'sm' | 'md' | 'lg';
  interactive?: boolean;
  className?: string;
}

export function Card({
  title,
  description,
  children,
  footer,
  padding = 'md',
  shadow = 'md',
  interactive = false,
  className = '',
}: CardProps) {
  const paddingSizes = {
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  };

  const shadowSizes = {
    none: 'shadow-none',
    sm: 'shadow-sm',
    md: 'shadow-md',
    lg: 'shadow-lg',
  };

  return (
    <div
      className={`
        bg-white border border-neutral-200 rounded-lg
        ${shadowSizes[shadow]} ${paddingSizes[padding]}
        transition-all duration-200 ease-out
        ${interactive ? 'hover:shadow-lg hover:-translate-y-1 cursor-pointer' : ''}
        ${className}
      `}
    >
      {title && <h3 className="text-heading-sm font-semibold text-neutral-900">{title}</h3>}
      {description && <p className="text-body-sm text-neutral-600 mt-1">{description}</p>}
      <div className="mt-4">{children}</div>
      {footer && <div className="mt-6 pt-6 border-t border-neutral-200">{footer}</div>}
    </div>
  );
}
```

---

### 8. Alert Component

```typescript
// src/components/molecules/Alert.tsx
import React from 'react';

interface AlertProps {
  variant?: 'info' | 'success' | 'warning' | 'error';
  title?: string;
  children: React.ReactNode;
  onClose?: () => void;
  className?: string;
}

export function Alert({
  variant = 'info',
  title,
  children,
  onClose,
  className = '',
}: AlertProps) {
  const variants = {
    info: { bg: 'bg-info-50', border: 'border-info-200', title: 'text-info-900', text: 'text-info-700' },
    success: { bg: 'bg-success-50', border: 'border-success-200', title: 'text-success-900', text: 'text-success-700' },
    warning: { bg: 'bg-warning-50', border: 'border-warning-200', title: 'text-warning-900', text: 'text-warning-700' },
    error: { bg: 'bg-error-50', border: 'border-error-200', title: 'text-error-900', text: 'text-error-700' },
  };

  const style = variants[variant];

  return (
    <div
      role="alert"
      className={`${style.bg} ${style.border} border rounded-lg p-4 ${className}`}
    >
      <div className="flex gap-3">
        <div className="flex-1">
          {title && <h4 className={`${style.title} font-semibold text-sm`}>{title}</h4>}
          <p className={`${style.text} text-sm mt-1`}>{children}</p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            aria-label="Close alert"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
}
```

---

### 9. Modal Component

```typescript
// src/components/molecules/Modal.tsx
import React, { useEffect } from 'react';

interface ModalProps {
  isOpen: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

export function Modal({
  isOpen,
  title,
  onClose,
  children,
  footer,
  size = 'md',
}: ModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const sizes = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
      aria-hidden="true"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className={`bg-white rounded-lg shadow-2xl ${sizes[size]} max-h-[90vh] overflow-y-auto`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-6 border-b border-neutral-200">
          <h2 id="modal-title" className="text-heading-md font-semibold">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="text-neutral-500 hover:text-neutral-700 text-2xl"
            aria-label="Close modal"
          >
            ×
          </button>
        </div>
        <div className="p-6">{children}</div>
        {footer && <div className="border-t border-neutral-200 p-6 flex gap-3 justify-end">{footer}</div>}
      </div>
    </div>
  );
}
```

---

## 🏢 ORGANISMS - Complex Compositions

### 10. Form Component

```typescript
// src/components/organisms/Form.tsx
import React from 'react';
import { Button } from '../atoms/Button';

interface FormProps {
  title?: string;
  description?: string;
  children: React.ReactNode;
  onSubmit: (e: React.FormEvent) => void;
  submitText?: string;
  cancelText?: string;
  onCancel?: () => void;
  isLoading?: boolean;
  className?: string;
}

export function Form({
  title,
  description,
  children,
  onSubmit,
  submitText = 'Save',
  cancelText = 'Cancel',
  onCancel,
  isLoading = false,
  className = '',
}: FormProps) {
  return (
    <form onSubmit={onSubmit} className={className}>
      {title && <h2 className="text-heading-lg font-semibold mb-2">{title}</h2>}
      {description && <p className="text-body-md text-neutral-600 mb-6">{description}</p>}

      <div className="space-y-6 mb-8">{children}</div>

      <div className="flex gap-3 pt-6 border-t border-neutral-200">
        <Button type="submit" loading={isLoading}>
          {submitText}
        </Button>
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel}>
            {cancelText}
          </Button>
        )}
      </div>
    </form>
  );
}
```

---

### 11. DataTable Component

```typescript
// src/components/organisms/DataTable.tsx
import React from 'react';

export interface Column<T> {
  key: keyof T;
  label: string;
  sortable?: boolean;
  render?: (value: any) => React.ReactNode;
  width?: string;
}

interface DataTableProps<T extends { id: string | number }> {
  columns: Column<T>[];
  data: T[];
  onSort?: (key: string) => void;
  loading?: boolean;
  emptyMessage?: string;
}

export function DataTable<T extends { id: string | number }>({
  columns,
  data,
  onSort,
  loading = false,
  emptyMessage = 'No data',
}: DataTableProps<T>) {
  if (loading) {
    return <div className="p-4 text-center text-neutral-500">Loading...</div>;
  }

  if (data.length === 0) {
    return <div className="p-4 text-center text-neutral-500">{emptyMessage}</div>;
  }

  return (
    <div className="overflow-x-auto border border-neutral-200 rounded-lg">
      <table className="w-full">
        <thead className="bg-neutral-50">
          <tr className="divide-x divide-neutral-200">
            {columns.map((col) => (
              <th
                key={String(col.key)}
                className="px-6 py-4 text-left text-label-sm font-semibold text-neutral-900"
              >
                {col.sortable ? (
                  <button onClick={() => onSort?.(String(col.key))} className="hover:text-primary-600">
                    {col.label}
                  </button>
                ) : (
                  col.label
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-200">
          {data.map((row) => (
            <tr key={row.id} className="hover:bg-neutral-50 transition-colors divide-x divide-neutral-200">
              {columns.map((col) => (
                <td
                  key={`${row.id}-${String(col.key)}`}
                  className="px-6 py-4 text-body-sm text-neutral-900"
                >
                  {col.render ? col.render(row[col.key]) : String(row[col.key])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

---

## 📚 COMPOSANTS RESTANTS (Brief)

### 12. Breadcrumbs
```tsx
<nav className="flex gap-2">
  {items.map((item, i) => (
    <div key={i} className="flex items-center gap-2">
      {i > 0 && <ChevronRight className="text-neutral-400" />}
      {item.href ? (
        <a href={item.href} className="text-primary-600 hover:underline">
          {item.label}
        </a>
      ) : (
        <span className="text-neutral-600">{item.label}</span>
      )}
    </div>
  ))}
</nav>
```

### 13. Spinner/Loading
```tsx
<div className="flex items-center gap-2">
  <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary-500 border-t-transparent" />
  <span className="text-sm text-neutral-600">Loading...</span>
</div>
```

### 14. Checkbox
```tsx
<input
  type="checkbox"
  id={id}
  checked={checked}
  onChange={(e) => onChange(e.target.checked)}
  className="rounded border-neutral-300 accent-primary-600"
/>
<label htmlFor={id}>{label}</label>
```

### 15. Select/Dropdown
```tsx
<select
  value={value}
  onChange={(e) => onChange(e.target.value)}
  className="px-4 py-2.5 border-2 border-neutral-200 rounded-md focus:border-primary-500 focus:ring-2 focus:ring-primary-500/50"
>
  {options.map((opt) => (
    <option key={opt.value} value={opt.value}>
      {opt.label}
    </option>
  ))}
</select>
```

---

## 🚀 IMPLEMENTING COMPONENTS

### Step 1: Create Folder Structure
```bash
mkdir -p frontend/src/components/{atoms,molecules,organisms}
```

### Step 2: Create Files
- Copy each component code above into corresponding files
- Each file should be max 80 lines (already enforced)

### Step 3: Create Index File
```typescript
// src/components/index.ts
// Atoms
export { Button } from './atoms/Button';
export { Input } from './atoms/Input';
export { Label } from './atoms/Label';
export { Badge } from './atoms/Badge';
export { Avatar } from './atoms/Avatar';

// Molecules
export { FormField } from './molecules/FormField';
export { Card } from './molecules/Card';
export { Alert } from './molecules/Alert';
export { Modal } from './molecules/Modal';

// Organisms
export { Form } from './organisms/Form';
export { DataTable } from './organisms/DataTable';
```

### Step 4: Usage in Pages
```typescript
// app/(dashboard)/home/page.tsx
import { Card, Button, Badge } from '@/components';

export default function Dashboard() {
  return (
    <Card title="Welcome">
      <p className="text-body-md">Hello!</p>
      <Button variant="primary" size="lg">
        Get Started
      </Button>
    </Card>
  );
}
```

---

## ✅ COMPONENT LIBRARY CHECKLIST

- [ ] All 15+ components created
- [ ] Each component ≤ 80 lines
- [ ] TypeScript interfaces defined
- [ ] WCAG 2.1 AA compliant
- [ ] Responsive design tested
- [ ] Focus management implemented
- [ ] Proper naming conventions
- [ ] Index file created
- [ ] Used in at least one page
- [ ] Documentation complete

---

**T2.1 Status: In Progress (Components defined)**

Next: T2.2 - Document interaction patterns
Next Next: T2.3 - Create final design guide
