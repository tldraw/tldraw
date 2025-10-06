# [TECH-08]: Server Component Data Fetching

Date created: 2025-10-05
Date last updated: 2025-10-05
Date completed: 2025-10-05

## Status

- [ ] Not Started
- [ ] In Progress
- [ ] Blocked
- [x] Done

## Priority

- [x] P0 (MVP Required)
- [ ] P1 (Post-MVP)

## Category

- [ ] Authentication
- [ ] Workspaces
- [ ] Documents
- [ ] Folders
- [ ] Permissions & Sharing
- [ ] Real-time Collaboration
- [x] UI/UX
- [x] API
- [ ] Database
- [ ] Testing
- [x] Infrastructure

## Description

Refactor authenticated pages to use Next.js Server Components for initial data fetching instead of client-side API calls. This improves performance by:
- Eliminating loading states on mount
- Reducing client-side JavaScript bundle size
- Leveraging server-side rendering for faster initial page loads
- Better SEO and performance metrics

Client components should only be used for interactive/stateful UI elements (forms, modals, collapsible sections, etc.).

## Acceptance Criteria

- [x] Dashboard page uses Server Component for data fetching (already completed)
- [x] Profile page uses Server Component for initial profile data fetch
- [x] Other authenticated pages follow the same pattern where applicable
- [x] Client components are only used for interactive UI (forms, modals, buttons with state)
- [x] No client-side `useEffect` calls for initial data fetching on page load
- [x] Better Auth session is validated server-side before rendering
- [x] Unauthenticated users are redirected server-side (not client-side)

## Technical Details

### Pattern to Follow

**Server Component (page.tsx):**
```typescript
import { auth } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import PageClient from './page-client'

async function getData(userId: string) {
  const supabase = await createClient()
  // Fetch data server-side
  const { data } = await supabase.from('table').select('*').eq('user_id', userId)
  return data
}

export default async function Page() {
  // Server-side auth check
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) redirect('/login')

  // Server-side data fetching
  const data = await getData(session.user.id)

  // Pass to client component
  return <PageClient initialData={data} userId={session.user.id} />
}
```

**Client Component (page-client.tsx):**
```typescript
'use client'

interface PageClientProps {
  initialData: Data
  userId: string
}

export default function PageClient({ initialData, userId }: PageClientProps) {
  // Only client-side state for interactions
  const [data, setData] = useState(initialData)

  // Handle mutations, form submissions, etc.
  return <div>...</div>
}
```

### Pages to Refactor

1. **Profile Page** (High Priority)
   - Move profile data fetch to Server Component
   - Keep form state and mutations in Client Component

2. **403 Page** (Low Priority)
   - Can be simplified to pure Server Component if no client-side routing needed

### API Endpoints

- Keep existing API endpoints for mutations (POST, PUT, DELETE)
- API endpoints can still be used for client-side updates after initial load
- Consolidated endpoints like `/api/dashboard` remain useful for client-side refreshes

### Authentication Pattern

All Server Component pages should use:
```typescript
const session = await auth.api.getSession({ headers: await headers() })
if (!session?.user) redirect('/login')
```

This ensures:
- Server-side authentication check
- No flash of unauthenticated content
- Proper redirects before any rendering

## Dependencies

- Better Auth server-side session handling
- Supabase server client
- Next.js 15 Server Components support

## Testing Requirements

- [ ] Unit tests for data fetching functions
- [x] Integration tests - existing API tests remain valid
- [x] E2E tests - existing Playwright tests should continue to work
- [x] Manual testing scenarios - verify no regressions

## Related Documentation

- Next.js Server Components: https://nextjs.org/docs/app/building-your-application/rendering/server-components
- Better Auth server-side: https://www.better-auth.com/docs/concepts/session
- Current implementation: `apps/simple-dotcom/simple-client/src/app/dashboard/page.tsx` (reference)

## Notes

**Benefits:**
- Faster initial page loads (data arrives with HTML)
- Reduced client-side JavaScript
- Better Core Web Vitals scores
- No loading spinners on page load

**Client Components still needed for:**
- Forms with controlled inputs
- Modals and dialogs
- Collapsible/expandable UI
- Real-time updates
- Interactive widgets

**Migration Strategy:**
1. Start with profile page (highest impact)
2. Ensure no regressions in existing tests
3. Document pattern for future pages
4. Can be done incrementally without breaking changes

## Estimated Complexity

- [ ] Small (< 1 day)
- [x] Medium (1-3 days)
- [ ] Large (3-5 days)
- [ ] Extra Large (> 5 days)

## Worklog

**2025-10-05**: Ticket created. Dashboard page already refactored to use Server Components as reference implementation.

**2025-10-05**: Completed profile page refactoring:
- Created Server Component `page.tsx` that fetches profile data server-side
- Created Client Component `profile-client.tsx` for form interactions only
- Eliminated client-side `useEffect` for initial data fetch
- Added server-side auth check with redirect
- Profile data now arrives with HTML (no loading state on mount)
- All acceptance criteria met

## Open questions

- Should we keep the `/api/dashboard` endpoint for client-side refresh/polling, or remove it entirely?
  - **Decision**: Keep it for now - useful for optimistic updates and client-side refreshes after mutations
- Do we need loading.tsx files for suspense boundaries?
  - **Recommendation**: Add later as polish, not blocking for MVP
