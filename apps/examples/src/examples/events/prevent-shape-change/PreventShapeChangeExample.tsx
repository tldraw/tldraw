import { Tldraw, toRichText } from 'tldraw'
import 'tldraw/tldraw.css'

export default function PreventShapeChangeExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				onMount={(editor) => {
					editor.createShape({
						type: 'geo',
						x: 100,
						y: 100,
						props: {
							w: 300,
							h: 300,
							richText: toRichText("style me but don't transform me"),
						},
					})

					// A before-change handler returns the record that will actually be written.
					// For geo rectangles, any change to position, rotation, or size is rejected by
					// returning `prev`; everything else (color, fill, text, etc.) passes through.
					// Unlike locking the shape, this leaves it selectable and editable.
					editor.sideEffects.registerBeforeChangeHandler('shape', (prev, next) => {
						if (
							editor.isShapeOfType(prev, 'geo') &&
							editor.isShapeOfType(next, 'geo') &&
							next.props.geo === 'rectangle'
						) {
							if (
								next.x !== prev.x ||
								next.y !== prev.y ||
								next.rotation !== prev.rotation ||
								next.props.w !== prev.props.w ||
								next.props.h !== prev.props.h
							) {
								return prev
							}
						}
						return next
					})
				}}
			/>
		</div>
	)
}
