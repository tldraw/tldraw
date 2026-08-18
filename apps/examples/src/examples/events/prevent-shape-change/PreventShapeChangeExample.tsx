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

					// Unlike locking the shape, rejecting transforms here leaves it selectable and editable.
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
