# Frontend Development Guide

**Date Created:** 2025-01-16
**Last Updated:** 2025-01-16
**Audience:** Developers working on Simple tldraw frontend

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Technology Stack](#technology-stack)
3. [Component Library (shadcn/ui)](#component-library-shadcnui)
4. [Development Standards](#development-standards)
5. [Implementation Patterns](#implementation-patterns)
6. [Testing Guidelines](#testing-guidelines)
7. [Accessibility Requirements](#accessibility-requirements)
8. [Common Patterns & Anti-Patterns](#common-patterns--anti-patterns)

---

## Architecture Overview

### Design Philosophy

**Simple tldraw follows a pragmatic, component-first approach:**

1. **Consistency over customization** - Use shadcn/ui defaults rather than custom styles
2. **Accessibility by default** - All components include proper ARIA attributes
3. **Progressive enhancement** - Start with basic functionality, add polish later
4. **Test stability** - Maintain `data-testid` attributes for E2E tests
5. **Dark mode support** - All components work in both light and dark themes

### Folder Structure

```
simple-client/src/
├── app/                          # Next.js App Router pages
│   ├── api/                      # API routes
│   ├── dashboard/                # Dashboard page
│   ├── workspace/[workspaceId]/  # Workspace pages
│   ├── login/                    # Auth pages
│   └── ...
├── components/
│   ├── ui/                       # shadcn/ui components (reusable primitives)
│   ├── documents/                # Document-specific components
│   ├── folders/                  # Folder-specific components
│   ├── shared/                   # Shared application components
│   └── users/                    # User-related components
├── lib/
│   ├── api/                      # API client utilities
│   ├── supabase/                 # Supabase client config
│   ├── realtime/                 # Realtime event broadcasting
│   ├── utils.ts                  # Utility functions (cn helper)
│   └── ...
└── hooks/                        # Custom React hooks
```

### Component Hierarchy

```
Primitives (shadcn/ui)
└── Basic UI Components
    └── Feature Components
        └── Page Layouts
```

**Example:**
- `Button` (primitive) → `DocumentActions` (feature) → `DocumentCard` (composite) → `Dashboard` (page)

---

## Technology Stack

### Core Technologies

| Technology | Version | Purpose |
|------------|---------|---------|
| Next.js | 15 (App Router) | Framework |
| React | 19 | UI library |
| Tailwind CSS | 4 | Styling |
| shadcn/ui | Latest | Component library |
| TypeScript | 5.x | Type safety |
| React Query | Latest | Data fetching |
| React Hook Form | Latest | Form handling |
| Zod | 4.x | Schema validation |
| lucide-react | Latest | Icons |

### Why shadcn/ui?

✅ **Not a component library** - Copy components into your codebase, own the code
✅ **Built on Radix UI** - Accessible primitives with keyboard navigation
✅ **Tailwind-first** - No runtime CSS-in-JS overhead
✅ **Customizable** - Full control over styling and behavior
✅ **Type-safe** - First-class TypeScript support
✅ **Dark mode** - Built-in dark mode support

---

## Component Library (shadcn/ui)

### Installation

shadcn/ui components are installed individually via CLI:

```bash
npx shadcn@latest add button
npx shadcn@latest add input
npx shadcn@latest add dialog
# etc.
```

Components are copied to `/src/components/ui/` and can be modified as needed.

### Available Components

**Current Status** (as of 2025-01-16):

| Component | Status | Ticket | Priority |
|-----------|--------|--------|----------|
| Button | ✅ Installed | DESIGN-06-A | P0 |
| Input | ✅ Installed | DESIGN-06-B | P0 |
| Label | ✅ Installed | DESIGN-06-B | P0 |
| Dialog | ⏳ Pending | DESIGN-06-C | P0 |
| Form | ⏳ Pending | DESIGN-06-D | P1 |
| Alert | ⏳ Pending | DESIGN-06-D | P1 |
| Card | ⏳ Pending | DESIGN-06-E | P1 |
| Badge | ⏳ Pending | DESIGN-06-E | P1 |
| Dropdown Menu | ⏳ Pending | DESIGN-06-E | P2 |
| Separator | ⏳ Pending | DESIGN-06-E | P2 |
| Toast | ⏳ Pending | DESIGN-06-E | P2 |

### Usage Examples

#### Button

```tsx
import { Button } from '@/components/ui/button'

// Primary button
<Button onClick={handleClick}>Submit</Button>

// Variants
<Button variant="destructive">Delete</Button>
<Button variant="outline">Cancel</Button>
<Button variant="ghost">More</Button>
<Button variant="link">Learn more</Button>

// Sizes
<Button size="sm">Small</Button>
<Button size="default">Default</Button>
<Button size="lg">Large</Button>
<Button size="icon"><IconComponent /></Button>

// States
<Button disabled>Disabled</Button>
<Button disabled>
  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
  Loading...
</Button>
```

#### Input & Label

```tsx
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

<div className="space-y-2">
  <Label htmlFor="email">Email address</Label>
  <Input
    id="email"
    type="email"
    placeholder="you@example.com"
    value={email}
    onChange={(e) => setEmail(e.target.value)}
  />
</div>

// Error state
<Input
  className={cn(error && "border-destructive")}
  aria-invalid={!!error}
/>
{error && (
  <p className="text-sm text-destructive mt-1">{error}</p>
)}
```

#### Dialog

```tsx
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

<Dialog open={open} onOpenChange={setOpen}>
  <DialogTrigger asChild>
    <Button>Open Dialog</Button>
  </DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Are you sure?</DialogTitle>
      <DialogDescription>
        This action cannot be undone.
      </DialogDescription>
    </DialogHeader>
    {/* Dialog content */}
    <DialogFooter>
      <Button variant="outline" onClick={() => setOpen(false)}>
        Cancel
      </Button>
      <Button onClick={handleConfirm}>Confirm</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

#### Form (with React Hook Form)

```tsx
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

const formSchema = z.object({
  username: z.string().min(2, 'Username must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
})

function MyForm() {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: '',
      email: '',
    },
  })

  function onSubmit(values: z.infer<typeof formSchema>) {
    console.log(values)
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="username"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Username</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormDescription>
                This is your public display name.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={form.formState.isSubmitting}>
          Submit
        </Button>
      </form>
    </Form>
  )
}
```

---

## Development Standards

### Code Style

**TypeScript:**
- Use TypeScript for all new code
- Define interfaces for component props
- Avoid `any` - use `unknown` or proper types
- Use type inference where possible

**React:**
- Functional components with hooks (no class components)
- Use `useCallback` for event handlers passed to child components
- Use `useMemo` for expensive computations
- Use `React.memo` sparingly (profile first)

**Tailwind:**
- Use `cn()` utility for conditional classes
- Prefer Tailwind utilities over custom CSS
- Use shadcn/ui design tokens (`primary`, `destructive`, etc.)
- Group related utilities (layout, spacing, colors, typography)

```tsx
// Good
className={cn(
  "flex items-center justify-between", // Layout
  "px-4 py-2 rounded-md", // Spacing & borders
  "bg-primary text-primary-foreground", // Colors
  "text-sm font-medium", // Typography
  isActive && "ring-2 ring-ring", // Conditional
)}

// Avoid
className="flex px-4 bg-primary items-center text-sm py-2 justify-between font-medium rounded-md text-primary-foreground"
```

### Component Structure

```tsx
'use client' // Only for client components

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { ComponentProps } from '@/lib/api/types'

/**
 * ComponentName - Brief description
 *
 * @example
 * <ComponentName prop="value" />
 */
interface ComponentNameProps {
  /** Required prop description */
  requiredProp: string
  /** Optional prop description */
  optionalProp?: boolean
  /** Callback prop description */
  onAction?: (value: string) => void
  /** Style override */
  className?: string
}

export function ComponentName({
  requiredProp,
  optionalProp = false,
  onAction,
  className,
}: ComponentNameProps) {
  const [state, setState] = useState<string>('')

  const handleClick = () => {
    // Handler logic
    onAction?.(state)
  }

  return (
    <div className={cn("base-classes", className)}>
      <Button onClick={handleClick}>
        {requiredProp}
      </Button>
    </div>
  )
}
```

### File Naming

- **Components:** PascalCase - `DocumentCard.tsx`, `FolderTree.tsx`
- **Utilities:** camelCase - `utils.ts`, `apiClient.ts`
- **Hooks:** camelCase with `use` prefix - `useWorkspaceRealtime.ts`
- **Types:** camelCase - `types.ts`, `api.ts`
- **Constants:** UPPER_SNAKE_CASE - `API_ROUTES.ts`

### Import Order

```tsx
// 1. React & Next.js
import { useState, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

// 2. Third-party libraries
import { useQuery } from '@tanstack/react-query'

// 3. shadcn/ui components
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'

// 4. Application components
import { DocumentCard } from '@/components/documents/DocumentCard'

// 5. Utilities & hooks
import { cn } from '@/lib/utils'
import { useWorkspaceRealtime } from '@/hooks/useWorkspaceRealtime'

// 6. Types
import type { Document, Workspace } from '@/lib/api/types'
```

---

## Implementation Patterns

### Data Fetching (React Query + Realtime)

**Hybrid Strategy:** Realtime subscriptions for instant updates + polling for reliability

```tsx
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useWorkspaceRealtimeUpdates } from '@/hooks/useWorkspaceRealtimeUpdates'

function WorkspaceView({ workspaceId }: { workspaceId: string }) {
  const queryClient = useQueryClient()

  // React Query with polling fallback
  const { data: documents = [] } = useQuery({
    queryKey: ['workspace-documents', workspaceId],
    queryFn: async () => {
      const response = await fetch(`/api/workspaces/${workspaceId}/documents`)
      const result = await response.json()
      if (!result.success) throw new Error(result.error?.message)
      return result.data
    },
    staleTime: 1000 * 10,        // 10 seconds
    refetchInterval: 1000 * 15,  // Poll every 15 seconds
    refetchOnMount: true,
    refetchOnReconnect: true,
  })

  // Realtime subscription (primary)
  useWorkspaceRealtimeUpdates(workspaceId, {
    onChange: () => {
      queryClient.invalidateQueries({ queryKey: ['workspace-documents', workspaceId] })
    },
    enabled: true,
  })

  return (
    <div>
      {documents.map(doc => (
        <DocumentCard key={doc.id} document={doc} />
      ))}
    </div>
  )
}
```

### Form Handling

**Always use React Hook Form with Zod validation:**

```tsx
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'

const schema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  email: z.string().email('Invalid email'),
})

type FormData = z.infer<typeof schema>

function MyForm() {
  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', email: '' },
  })

  const onSubmit = async (data: FormData) => {
    try {
      const response = await fetch('/api/endpoint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      const result = await response.json()
      if (!result.success) {
        form.setError('root', { message: result.error?.message })
        return
      }
      // Success handling
    } catch (err) {
      form.setError('root', { message: 'An unexpected error occurred' })
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        {/* Form fields */}
      </form>
    </Form>
  )
}
```

### Modal/Dialog Pattern

**Always use controlled state:**

```tsx
function MyComponent() {
  const [showDialog, setShowDialog] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const handleConfirm = async () => {
    setIsLoading(true)
    try {
      await performAction()
      setShowDialog(false) // Close on success
    } catch (err) {
      // Show error in dialog, don't close
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <Button onClick={() => setShowDialog(true)}>Open Dialog</Button>
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          {/* Content */}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDialog(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={isLoading}
            >
              {isLoading ? 'Processing...' : 'Confirm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
```

### Error Handling

```tsx
// API route error handling
try {
  const response = await fetch('/api/endpoint')
  const result = await response.json()

  if (!result.success) {
    // Show user-friendly error
    setError(result.error?.message || 'Operation failed')
    return
  }

  // Success handling
} catch (err) {
  // Network or unexpected errors
  console.error('Unexpected error:', err)
  setError('An unexpected error occurred. Please try again.')
}
```

### Loading States

```tsx
// Button loading state
<Button disabled={isLoading}>
  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
  {isLoading ? 'Creating...' : 'Create'}
</Button>

// Page loading state (Suspense)
<Suspense fallback={<LoadingSpinner />}>
  <AsyncComponent />
</Suspense>

// Data loading state (React Query)
const { data, isLoading, error } = useQuery(...)

if (isLoading) return <LoadingSpinner />
if (error) return <ErrorMessage error={error} />
return <Content data={data} />
```

---

## Testing Guidelines

### E2E Testing (Playwright)

**Always add `data-testid` to interactive elements:**

```tsx
<Button
  data-testid="create-workspace-button"
  onClick={handleCreate}
>
  Create Workspace
</Button>

<Input
  data-testid="workspace-name-input"
  value={name}
  onChange={(e) => setName(e.target.value)}
/>

<Dialog open={open} data-testid="confirm-dialog">
  {/* Dialog content */}
</Dialog>
```

**E2E Test Pattern:**

```typescript
import { test, expect } from '@playwright/test'

test.describe('Workspace Creation', () => {
  test('should create a new workspace', async ({ page }) => {
    await page.goto('/dashboard')

    // Click create button
    await page.click('[data-testid="create-workspace-button"]')

    // Fill form
    await page.fill('[data-testid="workspace-name-input"]', 'Test Workspace')

    // Submit
    await page.click('[data-testid="confirm-create-workspace"]')

    // Verify result
    await expect(page.locator('[data-testid="workspace-list"]'))
      .toContainText('Test Workspace')
  })
})
```

### Component Testing

For complex components, write unit tests:

```tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { MyComponent } from './MyComponent'

describe('MyComponent', () => {
  it('should handle click events', () => {
    const handleClick = vi.fn()
    render(<MyComponent onClick={handleClick} />)

    fireEvent.click(screen.getByRole('button'))

    expect(handleClick).toHaveBeenCalled()
  })
})
```

---

## Accessibility Requirements

### Keyboard Navigation

- **Tab:** Navigate between interactive elements
- **Enter/Space:** Activate buttons and links
- **Escape:** Close dialogs and dropdowns
- **Arrow keys:** Navigate within dropdowns and lists

### ARIA Attributes

shadcn/ui components include ARIA attributes by default, but ensure:

- Form inputs have associated labels
- Buttons have descriptive text or `aria-label`
- Dialogs have `aria-labelledby` and `aria-describedby`
- Loading states have `aria-busy` or `aria-live`

### Focus Management

- Focus should be visible (outline/ring styles)
- Focus should trap inside dialogs
- Focus should return to trigger on dialog close
- Skip-to-content links for keyboard users

---

## Common Patterns & Anti-Patterns

### ✅ Good Patterns

**Use shadcn/ui components:**
```tsx
<Button variant="destructive">Delete</Button>
```

**Use cn() for conditional classes:**
```tsx
<div className={cn("base-class", isActive && "active-class")} />
```

**Use React Hook Form for validation:**
```tsx
const form = useForm({ resolver: zodResolver(schema) })
```

**Use controlled Dialog state:**
```tsx
<Dialog open={open} onOpenChange={setOpen}>
```

### ❌ Anti-Patterns to Avoid

**Don't use inline Tailwind for buttons:**
```tsx
// ❌ Bad
<button className="rounded-md bg-blue-500 px-4 py-2">Click</button>

// ✅ Good
<Button>Click</Button>
```

**Don't use window.prompt or window.confirm:**
```tsx
// ❌ Bad
const name = window.prompt('Enter name')
if (window.confirm('Are you sure?')) { ... }

// ✅ Good
<PromptDialog open={open} onConfirm={handleConfirm} />
<ConfirmDialog open={open} onConfirm={handleConfirm} />
```

**Don't create custom form validation:**
```tsx
// ❌ Bad
const [errors, setErrors] = useState({})
const validate = () => { /* manual validation */ }

// ✅ Good
const form = useForm({ resolver: zodResolver(schema) })
```

**Don't forget data-testid:**
```tsx
// ❌ Bad
<Button onClick={handleClick}>Submit</Button>

// ✅ Good
<Button onClick={handleClick} data-testid="submit-button">Submit</Button>
```

---

## Migration Checklist

When migrating a component to shadcn/ui:

- [ ] Read the shadcn/ui component docs
- [ ] Install the component via CLI
- [ ] Identify all instances to replace
- [ ] Update imports
- [ ] Replace inline classes with component props
- [ ] Preserve data-testid attributes
- [ ] Test in light and dark mode
- [ ] Run E2E tests
- [ ] Visual regression test
- [ ] Update this guide if new patterns emerge

---

## Resources

- **shadcn/ui Docs:** https://ui.shadcn.com
- **Radix UI Docs:** https://www.radix-ui.com/primitives/docs/overview/introduction
- **React Hook Form:** https://react-hook-form.com
- **Zod:** https://zod.dev
- **Tailwind CSS:** https://tailwindcss.com
- **Component Inventory:** See `SHADCN_COMPONENT_INVENTORY.md`
- **Implementation Tickets:** See `tickets/backlog/DESIGN-06-*.md`

---

**Document Status:** Living document - update as patterns evolve
**Last Updated:** 2025-01-16
