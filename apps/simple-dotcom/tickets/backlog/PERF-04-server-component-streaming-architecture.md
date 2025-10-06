# PERF-04: Server Component Streaming Architecture

Date created: 2025-10-05
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
- [ ] Documents
- [ ] Folders
- [ ] Permissions & Sharing
- [ ] Real-time Collaboration
- [x] UI/UX
- [ ] API
- [ ] Database
- [ ] Testing
- [x] Infrastructure

## Description

Refactor the dashboard and other data-heavy pages to use React Server Components with Suspense boundaries for progressive rendering. Currently, pages fetch all data in a single async function and block rendering until everything loads. This creates a slow initial page load even when some content could be shown immediately.

By breaking the UI into independent server components with their own data fetching, we can:

- Show page layout and static content immediately
- Stream in data-dependent sections as they become available
- Display skeleton loading states for pending sections
- Improve perceived performance and Time to First Byte (TTFB)
- Enable parallel data fetching for independent sections

## Acceptance Criteria

- [ ] Dashboard page uses Suspense boundaries for independent sections (sidebar, recent documents, user info)
- [ ] Each data-dependent section is its own async Server Component
- [ ] Skeleton loading states are shown while sections are loading
- [ ] Page shell/layout renders immediately without waiting for data
- [ ] Profile page uses Suspense for user data
- [ ] Data fetching happens in parallel for independent sections
- [ ] Error boundaries handle individual section failures gracefully
- [ ] No performance regression in data fetching (maintain parallel fetching)
- [ ] Existing functionality and user experience is preserved
- [ ] E2E tests pass without modification

## Technical Details

### Current Architecture Problems

**Dashboard (page.tsx:187-211):**

```tsx
export default async function DashboardPage() {
	const session = await auth.api.getSession({ headers: await headers() })
	if (!session?.user) redirect('/login')

	// BLOCKS RENDERING: Everything fetches in parallel but page waits for ALL data
	const [dashboardData, userProfile] = await Promise.all([
		getDashboardData(session.user.id), // Fetches workspaces, documents, folders, recent docs
		getUserProfile(session.user.id), // Fetches user profile
	])

	return (
		<DashboardClient
			initialData={dashboardData}
			userProfile={userProfile}
			userId={session.user.id}
		/>
	)
}
```

**Profile (page.tsx:20-35):**

```tsx
export default async function ProfilePage() {
	const session = await auth.api.getSession({ headers: await headers() })
	if (!session?.user) redirect('/login')

	// BLOCKS RENDERING: Waits for profile data before showing anything
	const profile = await getUserProfile(session.user.id)

	return <ProfileClient profile={profile} />
}
```

### Proposed Architecture

**Dashboard with Streaming:**

```tsx
// app/dashboard/page.tsx
export default async function DashboardPage() {
	const session = await auth.api.getSession({ headers: await headers() })
	if (!session?.user) redirect('/login')

	return (
		<div className="flex min-h-screen bg-background">
			{/* Sidebar streams independently */}
			<Suspense fallback={<WorkspacesSidebarSkeleton />}>
				<WorkspacesSidebar userId={session.user.id} />
			</Suspense>

			<div className="flex-1 p-8 overflow-y-auto">
				<div className="mx-auto max-w-4xl">
					{/* Header loads immediately (no data needed) */}
					<DashboardHeader userId={session.user.id} />

					{/* Welcome section streams independently */}
					<Suspense fallback={<WelcomeSectionSkeleton />}>
						<WelcomeSection userId={session.user.id} />
					</Suspense>

					{/* Recent documents stream independently */}
					<Suspense fallback={<RecentDocumentsSkeleton />}>
						<RecentDocuments userId={session.user.id} />
					</Suspense>
				</div>
			</div>
		</div>
	)
}

// app/dashboard/workspaces-sidebar.tsx (NEW Server Component)
async function WorkspacesSidebar({ userId }: { userId: string }) {
	const workspaces = await getWorkspacesWithContent(userId)
	return <WorkspacesSidebarClient workspaces={workspaces} userId={userId} />
}

// app/dashboard/recent-documents.tsx (NEW Server Component)
async function RecentDocuments({ userId }: { userId: string }) {
	const recentDocs = await getRecentDocuments(userId)
	if (recentDocs.length === 0) return <EmptyRecentDocuments />
	return <RecentDocumentsList documents={recentDocs} />
}

// app/dashboard/welcome-section.tsx (NEW Server Component)
async function WelcomeSection({ userId }: { userId: string }) {
	const profile = await getUserProfile(userId)
	const displayName = profile?.display_name || profile?.name || 'User'
	return <WelcomeCard displayName={displayName} />
}
```

**Profile with Streaming:**

```tsx
// app/profile/page.tsx
export default async function ProfilePage() {
	const session = await auth.api.getSession({ headers: await headers() })
	if (!session?.user) redirect('/login')

	return (
		<div className="min-h-screen bg-background p-8">
			<div className="mx-auto max-w-2xl">
				{/* Navigation loads immediately */}
				<ProfileNavigation />

				{/* Profile form streams with data */}
				<Suspense fallback={<ProfileFormSkeleton />}>
					<ProfileForm userId={session.user.id} />
				</Suspense>
			</div>
		</div>
	)
}

// app/profile/profile-form.tsx (NEW Server Component)
async function ProfileForm({ userId }: { userId: string }) {
	const profile = await getUserProfile(userId)
	return <ProfileClient profile={profile} />
}
```

### Component Breakdown

**Dashboard Components to Create:**

1. **WorkspacesSidebar** (async Server Component)
   - Fetches: workspaces, documents, folders
   - Data function: `getWorkspacesWithContent(userId)`
   - Skeleton: List of 3-4 workspace placeholders with expand buttons

2. **RecentDocuments** (async Server Component)
   - Fetches: recent document access log with workspace info
   - Data function: `getRecentDocuments(userId)`
   - Skeleton: List of 5 document card placeholders

3. **WelcomeSection** (async Server Component)
   - Fetches: user profile (display name)
   - Data function: `getUserProfile(userId)`
   - Skeleton: Card with placeholder text

4. **DashboardHeader** (Client Component)
   - No data fetching (Profile/Sign out buttons)
   - Renders immediately

**Profile Components to Create:**

1. **ProfileForm** (async Server Component)
   - Fetches: user profile
   - Data function: `getUserProfile(userId)`
   - Skeleton: Form with disabled input placeholders

2. **ProfileNavigation** (Static Component)
   - No data fetching
   - Renders immediately

### Data Fetching Functions

**Split `getDashboardData` into:**

```tsx
// lib/api/workspaces.ts
async function getWorkspacesWithContent(userId: string) {
	// Current logic from getDashboardData lines 19-131
	// Returns: WorkspaceWithContent[]
}

// lib/api/documents.ts
async function getRecentDocuments(userId: string) {
	// Current logic from getDashboardData lines 86-167
	// Returns: RecentDocument[]
}

// lib/api/users.ts (already exists)
async function getUserProfile(userId: string) {
	// Current getUserProfile logic (page.tsx:175-185)
	// Returns: User | null
}
```

### Skeleton Components

Create skeleton components using Tailwind or shadcn Skeleton (if available):

```tsx
// components/skeletons/workspaces-sidebar-skeleton.tsx
export function WorkspacesSidebarSkeleton() {
	return (
		<div className="w-80 border-r border-foreground/20 flex flex-col">
			<div className="p-4 border-b border-foreground/20">
				<div className="h-6 bg-foreground/10 rounded mb-2 w-32" />
				<div className="h-10 bg-foreground/10 rounded" />
			</div>
			<div className="p-4 space-y-2">
				{[1, 2, 3].map((i) => (
					<div key={i} className="border border-foreground/10 rounded-md p-3">
						<div className="h-5 bg-foreground/10 rounded w-3/4" />
						<div className="h-3 bg-foreground/10 rounded w-1/2 mt-2" />
					</div>
				))}
			</div>
		</div>
	)
}
```

### Error Handling

Wrap Suspense boundaries with Error Boundaries:

```tsx
import { ErrorBoundary } from 'react-error-boundary'

;<ErrorBoundary fallback={<RecentDocumentsError />}>
	<Suspense fallback={<RecentDocumentsSkeleton />}>
		<RecentDocuments userId={session.user.id} />
	</Suspense>
</ErrorBoundary>
```

Or use Next.js error.tsx convention:

```tsx
// app/dashboard/error.tsx
'use client'
export default function DashboardError({ error, reset }) {
	return <div>Error loading dashboard: {error.message}</div>
}
```

### Migration Strategy

**Phase 1: Dashboard**

1. Create new async Server Components for each section
2. Create corresponding skeleton components
3. Refactor dashboard/page.tsx to use Suspense
4. Split getDashboardData into focused functions
5. Test and verify parallel fetching performance

**Phase 2: Profile**

1. Create ProfileForm server component
2. Create ProfileFormSkeleton
3. Refactor profile/page.tsx to use Suspense
4. Test form functionality

**Phase 3: Other Pages** (Future)

- Apply same pattern to any future data-heavy pages

### Performance Considerations

**Before (current):**

- Total blocking time = max(workspaces query, recent docs query, profile query)
- User sees nothing until all data arrives
- Example: 300ms workspaces + 150ms recent + 50ms profile = 300ms blocking

**After (streaming):**

- Page shell renders immediately (0ms blocking)
- Each section streams independently in parallel
- User sees partial content progressively
- Example: Shell at 0ms, workspaces at 300ms, recent at 150ms, profile at 50ms

**Key Benefit:** Time to First Byte (TTFB) and First Contentful Paint (FCP) improve dramatically.

### Testing Strategy

**Functional Testing:**

- All existing Playwright tests should pass unchanged
- Client interactions (create/rename/delete workspace) remain unchanged
- Data displays correctly in all sections

**Performance Testing:**

- Measure TTFB before/after (should improve)
- Measure FCP before/after (should improve)
- Verify parallel fetching (check network waterfall)
- Test slow network conditions (streaming should show progressive rendering)

**Manual Testing:**

- Verify skeletons appear briefly on slow connections
- Check that sections appear independently
- Test error states for individual sections
- Verify no layout shift as sections load

## Dependencies

- React 18+ Suspense (already available)
- Next.js 14/15 App Router (already in use)
- No additional packages needed
- Optional: shadcn Skeleton component (see DESIGN-06)

## Testing Requirements

- [ ] Unit tests - Test data fetching functions in isolation
- [ ] Integration tests - Test server components render correctly
- [x] E2E tests (Playwright) - Existing tests should pass unchanged
- [ ] Manual testing scenarios:
  - Test on fast network (skeletons may flash briefly)
  - Test on slow network (throttle to 3G, verify progressive rendering)
  - Test with empty data states (no workspaces, no recent docs)
  - Test error scenarios (database timeout, network failure)
  - Verify no content layout shift (CLS metric)

## Related Documentation

- Next.js Streaming: https://nextjs.org/docs/app/building-your-application/routing/loading-ui-and-streaming
- React Suspense: https://react.dev/reference/react/Suspense
- Next.js Data Fetching Patterns: https://nextjs.org/docs/app/building-your-application/data-fetching/patterns
- Current dashboard implementation: `apps/simple-dotcom/simple-client/src/app/dashboard/page.tsx:187-211`
- Current profile implementation: `apps/simple-dotcom/simple-client/src/app/profile/page.tsx:20-35`

## Notes

### Benefits

1. **Improved Perceived Performance**: Users see content progressively instead of staring at a blank page
2. **Better UX**: Skeleton states provide visual feedback that content is loading
3. **Optimal Resource Usage**: Server can start sending HTML immediately
4. **Granular Error Handling**: One section failing doesn't break the entire page
5. **Progressive Enhancement**: Core layout works even if data takes time

### Challenges

1. **Increased Complexity**: More components and files to manage
2. **Client Component Split**: Need to carefully separate server/client logic
3. **State Management**: Modal state (create/rename workspace) needs to stay in client component
4. **Authentication**: Session check still blocks at page level (unavoidable)

### Client vs Server Component Split

**Keep Client Components For:**

- Interactive modals (create/rename/delete workspace)
- Form state management (input values, loading states)
- Event handlers (button clicks, form submissions)
- React hooks (useState, useRouter, etc.)

**Use Server Components For:**

- Data fetching from database
- Authentication checks
- Async operations
- Initial rendering of static content

**Example Split:**

```
DashboardPage (Server) → checks auth, renders layout
  ↓
WorkspacesSidebar (Server) → fetches data
  ↓
WorkspacesSidebarClient (Client) → handles interactions, modals, state
```

### Alternative: loading.js Convention

Instead of manual Suspense boundaries, could use Next.js loading.js:

```tsx
// app/dashboard/loading.tsx
export default function DashboardLoading() {
	return <DashboardSkeleton />
}
```

**Trade-off:** loading.js creates one boundary for entire route segment. Manual Suspense provides more granular control (better for this use case).

### Data Deduplication

Next.js automatically deduplicates fetch requests in Server Components:

- Multiple components can request same data
- Only one database query executes
- Result is cached and reused

Example: If multiple components call `getUserProfile(userId)`, Next.js only runs it once.

## Estimated Complexity

- [ ] Small (< 1 day)
- [ ] Medium (1-3 days)
- [x] Large (3-5 days)
- [ ] Extra Large (> 5 days)

## Worklog

[Track progress, decisions, and blockers as work proceeds. Each entry should include date and brief description.]

## Open questions

1. Should we use shadcn Skeleton component (depends on DESIGN-06) or custom Tailwind skeletons?
2. Should we implement React Error Boundaries or rely on Next.js error.tsx convention?
3. Do we want analytics/monitoring for streaming performance (e.g., measure actual FCP improvements)?
4. Should ProfileClient remain as-is or also be split into server/client parts?
5. Should we implement progressive enhancement for no-JS scenarios?
