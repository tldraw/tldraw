# Fairy front-end cleanup

This document tracks technical debt and cleanup opportunities in the fairy front-end code.

## Code cleanup

### Dead/commented code to remove

| File | Lines | Description |
|------|-------|-------------|
| `FairyHUDTeaser.tsx` | 91-166 | Commented `FairyAnnouncementDialogAutoTrigger`, `FairyComingSoonDialog`, `TimeUntilDecember1st2025` |
| `FairyConfigDialog.tsx` | 20-54, 79-108 | Commented hat selection, personality input, and translation functions |
| `FairyListSidebar.tsx` | 113-126 | Commented header with ContextMenu |
| `FairyMenuContent.tsx` | 32-39, 67 | Unused `_configureFairy` function and `_customizeFairyLabel` variable |

## Duplication

### `getStatusIcon()` function

Duplicated in two files with identical implementation:
- `FairyTaskListInline.tsx:27-38`
- `InCanvasTaskList.tsx:70-81`

**Suggestion**: Extract to a shared utility in `FairyTaskList.ts` or create `fairy-utils.ts`.

### Mobile position offset logic

Similar pattern duplicated in:
- `FairyHUD.tsx:329-350`
- `FairyHUDTeaser.tsx:29-51`

**Suggestion**: Extract to a custom hook like `useMobileMenuOffset()`.

## Naming inconsistency

Mixed use of "todo" and "task" terminology:

| Current | Suggested |
|---------|-----------|
| `$showCanvasFairyTasks` | Keep (uses "Tasks") |
| `showCanvasTodosLoadedRef` | `showCanvasTasksLoadedRef` |
| `setTodoId` in `FairyTaskDragTool` | `setTaskId` |
| `isInTodoDragTool` | `isInTaskDragTool` |
| `TodoDragTool` (comment in FairyApp.tsx:78) | `TaskDragTool` |
| `handleDragStart` todos references | tasks |

## Technical debt

### FileStateUpdater migration

**File**: `FairyApp.tsx:185`

```typescript
// Todo: Use FileStateUpdater for this
// Save fairy state to backend periodically
```

The current implementation manually watches atoms and throttles updates. Should be migrated to use `FileStateUpdater` for consistency with the rest of the app.

### Unused props

**File**: `FairyHUD.tsx`

`FairyHUDHeader` receives these props but doesn't use them:
- `hasUnreadTasks`
- `switchToFairyChatLabel`
- `switchToTaskListLabel`

Either implement the feature or remove the props.

## Minor improvements

### Magic numbers

**File**: `FairyApp.tsx`

```typescript
// Line 207 - throttle delay
}, 2000) // Save maximum every 2 seconds

// Line 175-176 - timeout for state settling
setTimeout(() => {
  isLoadingStateRef.current = false
}, 100)
```

**Suggestion**: Extract to constants:
```typescript
const FAIRY_STATE_SAVE_THROTTLE_MS = 2000
const FAIRY_STATE_LOAD_SETTLE_MS = 100
```

### Inline styles

Replace with CSS classes:

| File | Location |
|------|----------|
| `FairyConfigDialog.tsx` | Line 64-68: `style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}` |
| `InCanvasTaskList.tsx` | `TaskBoundsOverlay` component (lines 131-146) |

### Type safety

**File**: `FairyApp.tsx:46`

```typescript
const handleError = useCallback(
  (e: any) => {  // <- should be typed
```

**Suggestion**: Use `unknown` and narrow the type, or create an error type.

## Architecture suggestions

### Error boundary

Consider wrapping `FairyHUD` in an error boundary to prevent fairy-related errors from crashing the entire editor.

### Component extraction

`FairyHUDHeader` (defined in `FairyHUD.tsx:42-117`) could be extracted to its own file for better organization and testability.

### Memoization

**File**: `FairyListSidebar.tsx`

The `getSidebarEntries` function (lines 17-77) is called within `useValue` but the function itself could be optimized or the computation memoized based on agent state changes.
