---
title: Single Selection
component: ./index.tsx
category: editor-api
priority: 0
keywords: [selection, editor-api]
---

This example demonstrates how to restrict shape selection to only one shape at a time in tldraw.

---

You can prevent multiple shape selection by registering a before-change handler for the `instance_page_state` type. This handler intercepts selection changes and ensures only one shape can be selected at a time.

## How it works

The example uses the `onMount` prop of the `Tldraw` component to access the editor instance and register a before-change handler that intercepts changes to the `instance_page_state`. When a selection change would result in multiple shapes being selected, it modifies the change to only select the most recently selected shape.

This approach is more efficient than using a store listener because:

- It prevents the multiple selection from happening rather than fixing it after the fact
- It reduces the number of state updates
- It provides a smoother user experience with no visible flicker

## Code

```tsx
export default function SingleSelectionExample() {
	return (
		<div style={{ position: 'fixed', inset: 0 }}>
			<Tldraw
				onMount={(editor) => {
					// Register a beforeChange handler to prevent multiple selection
					editor.sideEffects.registerBeforeChangeHandler('instance_page_state', (prev, next) => {
						// If this is a selection change and multiple shapes would be selected
						if (
							prev.selectedShapeIds !== next.selectedShapeIds &&
							next.selectedShapeIds.length > 1
						) {
							// Only allow the last shape to be selected
							return {
								...next,
								selectedShapeIds: [next.selectedShapeIds[next.selectedShapeIds.length - 1]],
							}
						}
						return next
					})
				}}
			/>
		</div>
	)
}
```

## Try it out

1. Draw multiple shapes on the canvas
2. Try to select multiple shapes by dragging a selection box or holding Shift while clicking
3. Notice how only the most recently selected shape becomes selected
