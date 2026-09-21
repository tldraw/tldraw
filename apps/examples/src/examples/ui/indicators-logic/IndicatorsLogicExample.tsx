import {
	createShapeId,
	ShapeIndicatorOverlayUtil,
	TLShapeIndicatorOverlay,
	Tldraw,
	toRichText,
} from 'tldraw'
import 'tldraw/tldraw.css'

// There's a guide at the bottom of this file!

// [1]
class AllShapesIndicatorOverlayUtil extends ShapeIndicatorOverlayUtil {
	override getOverlays(): TLShapeIndicatorOverlay[] {
		const ids = this.editor.getRenderingShapes().map((s) => s.id)
		if (ids.length === 0) return []
		return [
			{
				id: 'shape_indicator',
				type: 'shape_indicator',
				props: { idsToDisplay: ids, hintingShapeIds: [] },
			},
		]
	}
}

// [2]
const overlayUtils = [AllShapesIndicatorOverlayUtil]

export default function IndicatorsLogicExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				overlayUtils={overlayUtils}
				onMount={(editor) => {
					if (editor.getCurrentPageShapeIds().size === 0) {
						const bottomLeftA = createShapeId()
						const bottomLeftB = createShapeId()
						editor.createShapes([
							{ type: 'geo', x: 100, y: 100 },
							{ type: 'geo', x: 500, y: 150, props: { geo: 'ellipse' } },
							{ id: bottomLeftA, type: 'geo', x: 100, y: 500 },
							{ id: bottomLeftB, type: 'geo', x: 250, y: 400 },
							{ type: 'text', x: 500, y: 500, props: { richText: toRichText('Hello, world!') } },
						])
						editor.groupShapes([bottomLeftA, bottomLeftB])
						editor.setSelectedShapes([])
					}
				}}
			/>
		</div>
	)
}

/*
Shape indicators are the outlines drawn around hovered and selected shapes. They're
painted by `ShapeIndicatorOverlayUtil`, an overlay util, so changing when they appear
means replacing that util.

[1]
Subclass `ShapeIndicatorOverlayUtil` and override `getOverlays()`. The default only lists
selected, hovered, and hinted shapes; here we list every shape currently being rendered,
so all of them get an outline all of the time. Filter the ids to indicate only some shapes.
`render()` is inherited, so the outlines still look like the built-in ones.

[2]
Pass the util via `overlayUtils`. It has the same `static type` (`'shape_indicator'`)
as the built-in util, so it replaces it instead of running alongside it. Defining the
array at module level keeps `<Tldraw>` from seeing a new array on every render.
*/
