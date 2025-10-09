# UI-09: Add shadcn/ui Command Palette for Document Search

Date created: 2025-10-08
Date last updated: -
Date completed: -

## Status

- [x] Not Started
- [ ] In Progress
- [ ] Blocked
- [ ] Done

## Priority

- [ ] P0 (MVP Required)
- [x] P1 (Post-MVP)

## Category

- [ ] Authentication
- [ ] Workspaces
- [x] Documents
- [ ] Folders
- [ ] Permissions & Sharing
- [ ] Real-time Collaboration
- [x] UI/UX
- [ ] API
- [ ] Database
- [ ] Testing
- [ ] Infrastructure

## Description

Add shadcn/ui's Command component to create a keyboard-driven command palette for quick document search and navigation. This improves power user efficiency and discoverability.

## Acceptance Criteria

- [ ] shadcn Command component installed (`npx shadcn@latest add command`)
- [ ] Command palette opens with keyboard shortcut (Cmd+K / Ctrl+K)
- [ ] Palette searches documents across all workspaces
- [ ] Search results show document name, workspace, and folder path
- [ ] Selecting a result navigates to the document
- [ ] Palette includes recent documents section
- [ ] Palette supports fuzzy search
- [ ] Palette is keyboard navigable (arrow keys, enter, escape)
- [ ] Palette shows "No results" state

## Technical Details

### UI Components

**Install shadcn Command:**
```bash
npx shadcn@latest add command
npx shadcn@latest add dialog  # For command palette modal
```

**Implementation:**

1. **Create CommandPalette component** (`src/components/shared/CommandPalette.tsx`)

```typescript
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'

export function CommandPalette() {
  const router = useRouter()
  const [open, setOpen] = useState(false)

  // Open with Cmd+K
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((open) => !open)
      }
    }

    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [])

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Search documents..." />
      <CommandList>
        <CommandEmpty>No documents found.</CommandEmpty>

        <CommandGroup heading="Recent Documents">
          {recentDocs.map((doc) => (
            <CommandItem
              key={doc.id}
              onSelect={() => {
                router.push(`/d/${doc.id}`)
                setOpen(false)
              }}
            >
              <FileIcon className="mr-2 h-4 w-4" />
              <span>{doc.name}</span>
              <span className="ml-auto text-xs text-muted-foreground">
                {doc.workspace}
              </span>
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandGroup heading="All Documents">
          {allDocs.map((doc) => (
            <CommandItem
              key={doc.id}
              onSelect={() => {
                router.push(`/d/${doc.id}`)
                setOpen(false)
              }}
            >
              <FileIcon className="mr-2 h-4 w-4" />
              <span>{doc.name}</span>
              <span className="ml-auto text-xs text-muted-foreground">
                {doc.workspace} / {doc.folder}
              </span>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  )
}
```

2. **Add to root layout** (`src/app/layout.tsx`)

```typescript
import { CommandPalette } from '@/components/shared/CommandPalette'

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <CommandPalette />
        {children}
      </body>
    </html>
  )
}
```

3. **Create search API endpoint** (`src/app/api/search/documents/route.ts`)

```typescript
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('q')

  // Search documents across all user's workspaces
  // Use Postgres full-text search or simple ILIKE
  const { data: documents } = await supabase
    .from('documents')
    .select('id, name, workspace:workspaces(name), folder:folders(name)')
    .ilike('name', `%${query}%`)
    .limit(20)

  return Response.json({ success: true, data: documents })
}
```

### API Endpoints

**New endpoint:**
- `GET /api/search/documents?q={query}` - Search documents by name

### Permissions/Security

- Search should respect RLS policies (only show documents user has access to)
- No special permissions needed

## Dependencies

- shadcn Command component (to be installed)
- shadcn Dialog component (for command palette modal)

## Testing Requirements

- [ ] Manual testing: Verify Cmd+K opens palette
- [ ] Manual testing: Verify search works with fuzzy matching
- [ ] Manual testing: Verify keyboard navigation (arrows, enter, escape)
- [ ] Manual testing: Verify selecting result navigates correctly
- [ ] E2E tests: Test command palette open, search, and navigation

## Related Documentation

- shadcn Command: https://ui.shadcn.com/docs/components/command
- shadcn Dialog: https://ui.shadcn.com/docs/components/dialog
- Related ticket: NAV-06-document-search.md (backlog)

## Notes

- Consider adding actions to command palette (create document, create workspace)
- Consider adding workspace navigation to palette
- Fuzzy search can be implemented client-side with libraries like `fuse.js`
- Command palette is a power user feature - consider onboarding hint
- Cmd+K is a common shortcut - check for conflicts

## Estimated Complexity

- [ ] Small (< 1 day)
- [ ] Medium (1-3 days)
- [x] Large (3-5 days)
- [ ] Extra Large (> 5 days)

## Worklog

[Track progress, decisions, and blockers as work proceeds.]

## Open questions

- Should the palette include workspace creation/navigation actions?
- Should search be server-side or client-side with cached data?
- Should we use Postgres full-text search or simple ILIKE?
- Should we add fuzzy search library like `fuse.js`?
