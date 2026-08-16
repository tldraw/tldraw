import { createShapeId, Editor, TLArrowBinding, Tldraw, TLShapeId, Vec, VecLike } from 'tldraw'
import 'tldraw/tldraw.css'

// There's a guide at the bottom of this file!

export default function CreateArrowExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				onMount={(editor) => {
					if (editor.getCurrentPageShapeIds().size > 0) return

					const shapeAId = createShapeId()
					const shapeBId = createShapeId()

					editor.createShapes([
						{ id: shapeAId, type: 'geo', x: 100, y: 100 },
						{ id: shapeBId, type: 'geo', x: 400, y: 400 },
					])

					createArrowBetweenShapes(editor, shapeAId, shapeBId)
				}}
			/>
		</div>
	)
}

type TerminalOptions = Partial<Omit<TLArrowBinding['props'], 'terminal'>>

function createArrowBetweenShapes(
	editor: Editor,
	startShapeId: TLShapeId,
	endShapeId: TLShapeId,
	options: { start?: TerminalOptions; end?: TerminalOptions } = {}
) {
	// [1]
	const {
		normalizedAnchor: startNormalizedAnchor = { x: 0.5, y: 0.5 },
		isExact: startIsExact = false,
		isPrecise: startIsPrecise = false,
	} = options.start ?? {}
	const {
		normalizedAnchor: endNormalizedAnchor = { x: 0.5, y: 0.5 },
		isExact: endIsExact = false,
		isPrecise: endIsPrecise = false,
	} = options.end ?? {}

	// [2]
	const startTerminalPagePosition = getAnchorInPageSpace(
		editor,
		startShapeId,
		startNormalizedAnchor
	)
	const endTerminalPagePosition = getAnchorInPageSpace(editor, endShapeId, endNormalizedAnchor)

	// [3]
	const arrowPagePoint = Vec.Min(startTerminalPagePosition, endTerminalPagePosition)

	const arrowId = createShapeId()
	editor.run(() => {
		editor.markHistoryStoppingPoint('creating_arrow')
		editor.createShape({
			id: arrowId,
			type: 'arrow',
			x: arrowPagePoint.x,
			y: arrowPagePoint.y,
			props: {
				// [4]
				start: Vec.Sub(startTerminalPagePosition, arrowPagePoint).toJson(),
				end: Vec.Sub(endTerminalPagePosition, arrowPagePoint).toJson(),
			},
		})

		// [5]
		editor.createBindings([
			{
				fromId: arrowId,
				toId: startShapeId,
				type: 'arrow',
				props: {
					terminal: 'start',
					normalizedAnchor: startNormalizedAnchor,
					isExact: startIsExact,
					isPrecise: startIsPrecise,
				},
			},
			{
				fromId: arrowId,
				toId: endShapeId,
				type: 'arrow',
				props: {
					terminal: 'end',
					normalizedAnchor: endNormalizedAnchor,
					isExact: endIsExact,
					isPrecise: endIsPrecise,
				},
			},
		])
	})
}

function getAnchorInPageSpace(editor: Editor, shapeId: TLShapeId, normalizedAnchor: VecLike) {
	const { point, size } = editor.getShapeGeometry(shapeId).bounds
	const localPoint = Vec.Add(point, Vec.MulV(normalizedAnchor, size))
	return editor.getShapePageTransform(shapeId).applyToPoint(localPoint)
}

/*
An arrow connects to other shapes through arrow bindings: one binding record per terminal
(`start` and `end`) that points from the arrow to the shape it's attached to. Once the bindings
exist, the editor keeps the arrow's terminals attached as either shape moves.

[1]
Of the binding props, `normalizedAnchor` is the point inside the bound shape that the
terminal targets, in the shape's own bounds: (0, 0) is the top left, (1, 1) the bottom right. It's
only used when `isPrecise` is true; otherwise the arrow aims at the shape's center. By default the
arrow stops at the outside of the shape's geometry; set `isExact` to true to make it end exactly on
the anchor point instead.

[2]
To place the arrow sensibly we compute where each anchor is on the page. The anchor is defined in
the shape's local bounds, so we take the geometry bounds, scale the normalized anchor by their size,
and push the result through the shape's page transform so rotation and parent groups are handled.

[3]
The arrow shape's `x`/`y` are in its parent's space, which here is the page. We put the arrow's
origin at the top-left corner of the box spanning both terminals.

[4]
An arrow's `start` and `end` props are relative to the arrow's own position. When a terminal is
bound, the editor recomputes it from the binding, so these values mostly matter for the unbound
case, but setting them keeps the arrow's transform sensible.

[5]
Create the shape and the bindings inside one `editor.run` so they land in a single history entry.
Bindings are created with `createBindings`, not by setting props on the arrow.
*/
