import { createShapeId, useEditor, useValue } from 'tldraw'
import { ButtonFrameShape } from './ButtonFrameShapeUtil'
import { buttonTheme } from './buttonTheme'
import { BUTTON_VARIANT_IDS, ButtonVariant } from './buttonTokens'

// There's a guide at the bottom of this file!

export function VariantToolbar() {
	const editor = useEditor()
	const theme = useValue(buttonTheme)

	// [1]
	function createVariant(variant: ButtonVariant) {
		const existing = editor
			.getCurrentPageShapes()
			.filter(
				(s): s is ButtonFrameShape => s.type === 'button-frame' && s.props.variant === variant
			)

		let x: number
		let y: number
		if (existing.length > 0) {
			let anchor = editor.getShapePageBounds(existing[0].id)!
			for (const shape of existing) {
				const bounds = editor.getShapePageBounds(shape.id)
				if (bounds && bounds.maxY > anchor.maxY) anchor = bounds
			}
			x = anchor.minX
			y = anchor.maxY + 32
		} else {
			const center = editor.getViewportPageBounds().center
			x = center.x - 120
			y = center.y - 80
		}

		const id = createShapeId()
		editor.createShape<ButtonFrameShape>({ id, type: 'button-frame', x, y, props: { variant } })
		editor.select(id)

		const bounds = editor.getShapePageBounds(id)
		if (bounds && !editor.getViewportPageBounds().contains(bounds)) {
			editor.centerOnPoint(bounds.center, { animation: { duration: 220 } })
		}
	}

	return (
		<div className="variant-toolbar">
			<span className="variant-toolbar__label">Add</span>
			{BUTTON_VARIANT_IDS.map((variant) => {
				// [2]
				const tokens = theme.variants[variant]
				const dotColor =
					tokens['--button-bg'] === 'transparent' ? tokens['--button-text'] : tokens['--button-bg']
				return (
					<button
						key={variant}
						className="variant-toolbar__chip"
						onClick={() => createVariant(variant)}
					>
						<span className="variant-toolbar__chip-dot" style={{ background: dotColor }} />
						{variant}
					</button>
				)
			})}
		</div>
	)
}

/*
The top toolbar creates new variant frames.

[1]
New frames stack vertically: each variant forms a column, with new frames
placed just below the lowest existing frame of that variant. The first frame
of a variant lands at the viewport center. If the new frame ends up outside
the viewport, the camera pans to it.

[2]
Each chip shows a live swatch of its variant's current background token (or
text color, for the transparent ghost), so the toolbar reflects theme edits
made in the inspector.
*/
