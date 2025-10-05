# BUG-11: New Document Dialog Has Incorrect Colors Due to Dark Mode CSS

**Status**: Open
**Date reported**: 2025-10-05
**Severity**: Medium
**Category**: UI/Styling

## Summary

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
- Overall appearance suggests CSS is not loading properly or dark mode is interfering

## Root Cause Analysis

The issue is caused by the dark mode media query in `globals.css` conflicting with the fixed white background of the modal dialog.

### Key Evidence

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

## Affected Files

- `simple-client/src/app/globals.css:15-20` - Dark mode media query setting light text color
- `simple-client/src/app/workspace/[workspaceId]/workspace-browser-client.tsx:378-427` - Modal dialog component
- `simple-client/src/app/layout.tsx:22-33` - Body tag that inherits color scheme

## Impact

- Dialog is nearly unusable when OS is in dark mode
- Users cannot read the dialog title or placeholder text
- Creates confusion about whether the feature is broken
- Affects all users with OS-level dark mode enabled
- Does not prevent functionality but severely impacts usability

## Proposed Solutions

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

1. Configure Tailwind for class-based dark mode (requires tailwind.config)
2. Add dark mode variants to all components:
   ```tsx
   className = 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100'
   ```
3. Manage dark mode state with context/localStorage
4. Apply consistent dark mode throughout the entire app

### Option C: Update Global CSS (Intermediate)

Remove the automatic dark mode media query and manage colors explicitly:

```css
/* Remove or comment out */
/* @media (prefers-color-scheme: dark) {
  :root {
    --background: #0a0a0a;
    --foreground: #ededed;
  }
} */
```

This forces light mode for all users until proper dark mode is implemented.

## Recommended Solution

**Option A (immediate)** + **Option B (future milestone)**

1. Apply Option A as an immediate fix to restore usability
2. Add explicit text colors to all modal/dialog components
3. Plan Option B (full dark mode support) for a future milestone
4. Audit all other dialogs/modals for similar issues

## Testing

To reproduce and verify fix:

1. Set OS to dark mode (System Preferences → Appearance → Dark)
2. Open the app in a browser
3. Navigate to workspace browser
4. Click "+ New Document"
5. Verify all text is readable with good contrast

To test thoroughly:

- Test in both light and dark OS modes
- Check all other dialogs/modals for similar issues
- Verify buttons, inputs, and error states

## Related Issues

None identified yet, but should audit:

- All dialog/modal components for similar dark mode conflicts
- Delete confirmation dialog
- Rename dialog in DocumentCard
- Any other overlay components
