import { TLGetShapeStyleOverrides, TLShape, Tldraw, createShapeId, toRichText } from 'tldraw'
import 'tldraw/tldraw.css'

// [1]
const getShapeStyleOverrides: TLGetShapeStyleOverrides = (shape: TLShape) => {
	// [2]
	if (shape.type === 'geo' || shape.type === 'draw' || shape.type === 'line') {
		if (shape.isLocked) {
			return {
				strokeColor: { light: '#9ca3af', dark: '#6b7280' },
				strokeWidth: 1,
			}
		}
	}

	// [3]
	if (shape.type === 'text') {
		if (shape.isLocked) {
			return {
				textColor: { light: '#9ca3af', dark: '#6b7280' },
			}
		}
	}

	return undefined
}

export default function ShapeStyleOverridesExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				getShapeStyleOverrides={getShapeStyleOverrides}
				persistenceKey="shape-style-overrides"
				onMount={(editor) => {
					// [4]
					editor.createShape({
						id: createShapeId(),
						type: 'geo',
						x: 100,
						y: 100,
						isLocked: true,
						props: {
							w: 180,
							h: 120,
							color: 'red',
							size: 'xl',
							richText: toRichText('Locked'),
						},
					})

					editor.createShape({
						id: createShapeId(),
						type: 'geo',
						x: 340,
						y: 100,
						props: {
							w: 180,
							h: 120,
							color: 'red',
							size: 'xl',
							richText: toRichText('Normal'),
						},
					})

					// [5]
					editor.createShape({
						id: createShapeId(),
						type: 'text',
						x: 100,
						y: 280,
						isLocked: true,
						props: {
							richText: toRichText('Locked text'),
							color: 'blue',
							size: 'l',
						},
					})

					editor.createShape({
						id: createShapeId(),
						type: 'text',
						x: 340,
						y: 280,
						props: {
							richText: toRichText('Normal text'),
							color: 'blue',
							size: 'l',
						},
					})

					editor.createShape({
						id: createShapeId(),
						type: 'geo',
						x: 100,
						y: 400,
						isLocked: true,
						props: {
							w: 180,
							h: 120,
							color: 'green',
							geo: 'ellipse',
							size: 'l',
						},
					})

					editor.createShape({
						id: createShapeId(),
						type: 'geo',
						x: 340,
						y: 400,
						props: {
							w: 180,
							h: 120,
							color: 'green',
							geo: 'ellipse',
							size: 'l',
						},
					})

					editor.zoomToFit({ animation: { duration: 0 } })
				}}
			/>
		</div>
	)
}

/*
[1]
The `getShapeStyleOverrides` callback receives each shape and a style context.
Return an object with any style properties to override, or `undefined` to keep
defaults. This runs at render time so overrides react to shape changes.

[2]
Override stroke styles for locked geo, draw, and line shapes — making them
appear muted with a thin grey stroke. The `{ light, dark }` format automatically
picks the right value based on the current theme.

[3]
Similarly override text color for locked text shapes. Any property returned by
the shape's `getDefaultStyles()` method can be overridden here.

[4]
Create pairs of locked and unlocked shapes side by side. The locked shapes on
the left will appear muted (grey, thin stroke) while the unlocked shapes on the
right keep their original styles.

[5]
The same override logic applies to text shapes and other shape types — locked
text appears grey while unlocked text keeps its blue color.
*/
