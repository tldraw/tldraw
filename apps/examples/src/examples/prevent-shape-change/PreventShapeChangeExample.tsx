import { TLGeoShape, Tldraw, toRichText } from 'tldraw'
import 'tldraw/tldraw.css'

// There's a guide at the bottom of this page!

export default function PreventMoveExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				onMount={(editor) => {
					editor.createShape<TLGeoShape>({
						type: 'geo',
						x: 100,
						y: 100,
						props: {
							w: 300,
							h: 300,
							richText: toRichText("style me but don't transform me"),
						},
					})

					// [1]
					editor.sideEffects.registerBeforeChangeHandler('shape', (prev, next) => {
						if (
							editor.isShapeOfType<TLGeoShape>(prev, 'geo') &&
							editor.isShapeOfType<TLGeoShape>(next, 'geo') &&
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

/*
[1]
Here we register a handler that will run whenever a change is about to be made to
a shape's record.

The logic we want is that: if the shape is a geo shape and a rectangle, and then
if the x, y, or rotation properties would be different in the next version of
the shape record, or if the props.w, or props.h properties would change, then
we want to reject the change; otherwise, we want to allow it.

To reject the change, we return the previous record. To allow the change, we
return the next record.
*/
