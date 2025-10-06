# [BUG-11]: New Document Dialog Has Incorrect Colors Due to Dark Mode CSS

Date reported: 2025-10-05
Date last updated: 2025-10-05
Date resolved: 2025-10-05 

## Status

- [ ] New
- [ ] Investigating
- [ ] In Progress
- [ ] Blocked
- [x] Resolved
- [ ] Cannot Reproduce
- [ ] Won't Fix

## Severity

- [ ] Critical (System down, data loss, security)
- [ ] High (Major feature broken, significant impact)
- [x] Medium (Feature partially broken, workaround exists)
- [ ] Low (Minor issue, cosmetic)

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
- [ ] Performance
- [ ] Infrastructure

## Environment

- Browser: All (when OS is in dark mode)
- OS: All
- Environment: local/staging/production
- Affected version/commit: simple-dotcom branch

## Description

The "Create New Document" dialog on the workspace browser page displays with incorrect styling. The title text appears very light/washed out (barely visible), making it difficult to read against the white dialog background.

## Steps to Reproduce

1. Navigate to workspace browser page
2. Click the "+ New Document" button
3. Observe the dialog that appears

## Expected Behavior

The dialog should display with:

- Dark text on white background for good contrast
- Consistent styling with the rest of the application
- Properly styled title, input, error messages, and buttons

## Actual Behavior

The dialog displays with:

- Very light/nearly invisible title text ("Create New Document")
- Placeholder text is barely visible
- "Cancel" button text appears very light
- Error message shows in bright red (correct)
- Blue "Create" button renders correctly
- Overall appearance suggests dark mode CSS is interfering

## Screenshots/Videos

N/A

## Error Messages/Logs

```
No specific error logs available
```

## Related Files/Components

- `simple-client/src/app/globals.css:15-20` - Dark mode media query setting light text color
- `simple-client/src/app/workspace/[workspaceId]/workspace-browser-client.tsx:378-427` - Modal dialog component
- `simple-client/src/app/layout.tsx:22-33` - Body tag that inherits color scheme

## Possible Cause

The issue is caused by the dark mode media query in `globals.css` conflicting with the fixed white background of the modal dialog.

**globals.css (lines 15-20)**:

```css
@media (prefers-color-scheme: dark) {
	:root {
		--background: #0a0a0a;
		--foreground: #ededed;
	}
}
```

**workspace-browser-client.tsx (lines 378-425)**: The modal uses:

- `bg-white` for dialog background (always white)
- `text-xl`, `text-sm` for text (inherits from `--foreground`)
- When OS is in dark mode, `--foreground` becomes `#ededed` (very light)
- Light text on white background = invisible text

### The Problem

1. The app uses CSS custom properties (`--foreground`) that respond to `prefers-color-scheme: dark`
2. The modal dialog uses a fixed white background (`bg-white`)
3. When the user's OS is in dark mode:
   - `--foreground` becomes `#ededed` (light gray, designed for dark backgrounds)
   - Dialog background stays white
   - Result: light text on light background = poor/no contrast

## Proposed Solution

### Option A: Force Light Mode in Modal (Quick Fix)

Add explicit dark text colors to the modal to override dark mode inheritance:

```tsx
<div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
	<div className="bg-white rounded-lg p-6 max-w-md w-full border text-gray-900">
		<h3 className="text-xl font-semibold mb-4 text-gray-900">Create New Document</h3>
		<input
			type="text"
			// ... other props
			className={`w-full px-3 py-2 rounded-md border ${
				validationError ? 'border-red-500' : 'border-gray-300'
			} bg-white text-gray-900 placeholder:text-gray-500 mb-2`}
			// ...
		/>
		<button
			onClick={handleCloseCreateModal}
			className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
		>
			Cancel
		</button>
		{/* ... */}
	</div>
</div>
```

### Option B: Implement Proper Dark Mode Support (Better Long-term)

Use Tailwind's dark mode with class strategy:
1. Configure Tailwind for class-based dark mode
2. Add dark mode variants to all components
3. Manage dark mode state with context/localStorage
4. Apply consistent dark mode throughout the entire app

### Option C: Update Global CSS (Intermediate)

Remove the automatic dark mode media query and force light mode for all users until proper dark mode is implemented.

**Recommendation**: Apply Option A as immediate fix, then plan Option B for future milestone.

## Related Issues

- May affect other dialog/modal components throughout the app

## Worklog

**2025-10-05:**
- Bug discovered during UI testing with OS dark mode enabled
- Modal text is nearly invisible due to CSS custom property conflict
- Affects all dialogs using fixed white backgrounds
- Applied Option A (force light mode in modal) by adding explicit text color classes:
  - Added `text-gray-900` to dialog container and heading
  - Added `text-gray-900` and `placeholder:text-gray-500` to input field
  - Added `text-gray-700` to Cancel button

## Resolution

**Fixed** - Applied explicit text color classes to the Create New Document modal to override dark mode CSS inheritance. The modal now displays with proper contrast (dark text on white background) regardless of OS color scheme preference.

**Changes made:**
- `workspace-browser-client.tsx:380` - Added `text-gray-900` to dialog container
- `workspace-browser-client.tsx:381` - Added `text-gray-900` to h3 heading
- `workspace-browser-client.tsx:398` - Added `text-gray-900 placeholder:text-gray-500` to input
- `workspace-browser-client.tsx:411` - Added `text-gray-700` to Cancel button
