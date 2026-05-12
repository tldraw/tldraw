import { ShapeIndicatorOverlayUtil, TLShapeIndicatorOverlay, Tldraw } from 'tldraw'
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
						editor.createShapes([
							{ type: 'geo', x: 100, y: 100 },
							{ type: 'geo', x: 500, y: 150 },
							{ type: 'geo', x: 100, y: 500 },
							{ type: 'geo', x: 500, y: 500 },
						])
					}
				}}
			/>
		</div>
	)
}

/*

[1]
We subclass `ShapeIndicatorOverlayUtil` and override `getOverlays()` to
return every shape currently being rendered on the canvas, instead of the
default rule (selected / hovered only). Filter the list of ids if you only
want indicators on specific shapes.

[2]
Pass our custom util via the `overlayUtils` prop. Because it inherits the
same `static type` as the built-in (`'shape_indicator'`), it replaces the
default util rather than running alongside it.

*/
