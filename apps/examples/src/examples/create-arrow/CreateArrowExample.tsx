import { createShapeId, Editor, TLArrowBinding, TLArrowShape, Tldraw, TLShapeId, Vec } from 'tldraw'
import 'tldraw/tldraw.css'

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
							// Create two shapes
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
	const { start = {}, parentId } = options
	const {
		normalizedAnchor: startNormalizedAnchor = { x: 0.5, y: 0.5 },
		isExact: startIsExact = false,
		isPrecise: startIsPrecise = false,
	} = start
	const {
		normalizedAnchor: endNormalizedAnchor = { x: 0.5, y: 0.5 },
		isExact: endIsExact = false,
		isPrecise: endIsPrecise = false,
	} = start

	const parent = parentId ? editor.getShape(parentId) : undefined
	if (parentId && !parent) throw Error(`Parent shape with id ${parentId} not found`)

	const startShapePageBounds = editor.getShapePageBounds(startShapeId)
	const endShapePageBounds = editor.getShapePageBounds(endShapeId)

	const startShapePageRotation = editor.getShapePageTransform(startShapeId).rotation()
	const endShapePageRotation = editor.getShapePageTransform(endShapeId).rotation()

	// We need both bounds to exist
	if (!startShapePageBounds || !endShapePageBounds) return

	// Normalized position: .5 .5 is center, 0 0 is topleft corner, 1 1 is bottom right corner
	const startTerminalNormalizedPosition = Vec.From(startNormalizedAnchor)
	const endTerminalNormalizedPosition = Vec.From(endNormalizedAnchor)

	const arrowId = createShapeId()

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

	// The arrow will be positioned at the top left-most point of the two shapes

	// This needs to be in the coordinate space of the arrow's parent
	const arrowPointInParentSpace = Vec.Min(startTerminalPagePosition, endTerminalPagePosition)
	if (parent) {
		arrowPointInParentSpace.setTo(
			editor.getShapePageTransform(parent.id)!.applyToPoint(arrowPointInParentSpace)
		)
	}

	editor.run(() => {
		editor.markHistoryStoppingPoint('creating_arrow')
		editor.createShape<TLArrowShape>({
			id: arrowId,
			parentId: parent?.id, // if undefined, the parent will be the page
			type: 'arrow',
			// These are in the parent space, which in this case is the page.
			x: arrowPointInParentSpace.x,
			y: arrowPointInParentSpace.y,
			props: {
				// These are in "local" space
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
					normalizedAnchor: startNormalizedAnchor, // middle
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
					normalizedAnchor: endNormalizedAnchor, // middle
					isExact: endIsExact,
					isPrecise: endIsPrecise,
				},
			},
		])
	})
}
