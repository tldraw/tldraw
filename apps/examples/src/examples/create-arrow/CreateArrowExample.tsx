import { createShapeId, Editor, TLArrowBinding, TLArrowShape, Tldraw, TLShapeId, Vec } from 'tldraw'
import 'tldraw/tldraw.css'

// There's a guide at the bottom of this file!

export default function CreateArrowExample() {
	return (
		<>
			<div className="tldraw__editor">
				<Tldraw
					onMount={(editor) => {
						// Only do this on an empty canvas
						if (editor.getCurrentPageShapeIds().size > 0) return

						const shapeAId = createShapeId()
						const shapeBId = createShapeId()

						editor.createShapes([
							{
								id: shapeAId,
								type: 'geo',
								x: 100,
								y: 100,
							},
							{
								id: shapeBId,
								type: 'geo',
								x: 400,
								y: 400,
							},
						])

						createArrowBetweenShapes(editor, shapeAId, shapeBId)
					}}
				/>
			</div>
		</>
	)
}

function createArrowBetweenShapes(
	editor: Editor,
	startShapeId: TLShapeId,
	endShapeId: TLShapeId,
	options = {} as {
		parentId?: TLShapeId
		start?: Partial<Omit<TLArrowBinding['props'], 'terminal'>>
		end?: Partial<Omit<TLArrowBinding['props'], 'terminal'>>
	}
) {
	const { start = {}, end = {}, parentId } = options

	// [1]
	const {
		normalizedAnchor: startNormalizedAnchor = { x: 0.5, y: 0.5 },
		isExact: startIsExact = false,
		isPrecise: startIsPrecise = false,
	} = start
	const {
		normalizedAnchor: endNormalizedAnchor = { x: 0.5, y: 0.5 },
		isExact: endIsExact = false,
		isPrecise: endIsPrecise = false,
	} = end

	const startTerminalNormalizedPosition = Vec.From(startNormalizedAnchor)
	const endTerminalNormalizedPosition = Vec.From(endNormalizedAnchor)

	const parent = parentId ? editor.getShape(parentId) : undefined
	if (parentId && !parent) throw Error(`Parent shape with id ${parentId} not found`)

	const startShapePageBounds = editor.getShapePageBounds(startShapeId)
	const endShapePageBounds = editor.getShapePageBounds(endShapeId)

	const startShapePageRotation = editor.getShapePageTransform(startShapeId).rotation()
	const endShapePageRotation = editor.getShapePageTransform(endShapeId).rotation()

	if (!startShapePageBounds || !endShapePageBounds) return

	const startTerminalPagePosition = Vec.Add(
		startShapePageBounds.point,
		Vec.MulV(
			startShapePageBounds.size,
			Vec.Rot(startTerminalNormalizedPosition, startShapePageRotation)
		)
	)
	const endTerminalPagePosition = Vec.Add(
		endShapePageBounds.point,
		Vec.MulV(
			startShapePageBounds.size,
			Vec.Rot(endTerminalNormalizedPosition, endShapePageRotation)
		)
	)

	const arrowPointInParentSpace = Vec.Min(startTerminalPagePosition, endTerminalPagePosition)
	if (parent) {
		arrowPointInParentSpace.setTo(
			editor.getShapePageTransform(parent.id)!.applyToPoint(arrowPointInParentSpace)
		)
	}

	const arrowId = createShapeId()
	editor.run(() => {
		editor.markHistoryStoppingPoint('creating_arrow')
		editor.createShape<TLArrowShape>({
			id: arrowId,
			type: 'arrow',
			// [2]
			x: arrowPointInParentSpace.x,
			y: arrowPointInParentSpace.y,
			props: {
				// [3]
				start: {
					x: arrowPointInParentSpace.x - startTerminalPagePosition.x,
					y: arrowPointInParentSpace.x - startTerminalPagePosition.x,
				},
				end: {
					x: arrowPointInParentSpace.x - endTerminalPagePosition.x,
					y: arrowPointInParentSpace.x - endTerminalPagePosition.x,
				},
			},
		})

		editor.createBindings<TLArrowBinding>([
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

/*
Introduction:

This example shows how to create an arrow between two shapes.

[1] 
The normalized anchor is the position inside the shape that the arrow connects to, where 0 0 is the
top left corner and 1 1 is the bottom right. `isPrecise` needs to be enabled for this position to be
used, otherwise it targets the center of the shape.

By default, arrows don't intersect shapes they're connected to, and instead gracefully touch the
outside of the shape's geometry. You can turn this off and make an arrow intersect a shape by
setting `isExact` to true.

[2]
The arrow shape's position is in parent space, which in this case means the page.

[3]
The arrow's start and end positions are "local", which means they're relative to the arrow's
position. Note: You don't need to set the arrow's start and end positions if they're bound to
another shape, as it gets calculated automatically.

*/
