import { Box, OverlayUtil, type TLOverlay, Vec } from 'tldraw'

interface TLDimensionsHudOverlay extends TLOverlay {
	props: {
		x: number
		y: number
		w: number
		h: number
		rotation: number
	}
}

const LABEL_PADDING = 20
const PI2 = Math.PI * 2

type LabelEdge = 'top' | 'right' | 'bottom' | 'left'

// [1]
function getLabelEdge(rotation: number): LabelEdge {
	const quarterTurn = Math.round(rotation / (Math.PI / 2))
	const normalizedQuarterTurn = ((quarterTurn % 4) + 4) % 4

	switch (normalizedQuarterTurn) {
		case 0:
			return 'bottom'
		case 1:
			return 'right'
		case 2:
			return 'top'
		default:
			return 'left'
	}
}

// [2]
function getReadableRotation(rotation: number): number {
	const normalizedRotation = ((rotation + Math.PI) % PI2) - Math.PI
	return Math.abs(normalizedRotation) > Math.PI / 2 ? rotation + Math.PI : rotation
}

// [3]
function getLabelPointForEdge(edge: LabelEdge, bounds: Box, padding: number): Vec {
	switch (edge) {
		case 'bottom':
			return new Vec(bounds.midX, bounds.maxY + padding)
		case 'right':
			return new Vec(bounds.maxX + padding, bounds.midY)
		case 'top':
			return new Vec(bounds.midX, bounds.minY - padding)
		case 'left':
			return new Vec(bounds.minX - padding, bounds.midY)
	}
}

export class DimensionsHudOverlayUtil extends OverlayUtil<TLDimensionsHudOverlay> {
	static override type = 'dimensions-hud'
	override options = { zIndex: 950 }

	override isActive(): boolean {
		return this.editor.getSelectedShapeIds().length > 0
	}

	override getOverlays(): TLDimensionsHudOverlay[] {
		const selectedShapeIds = this.editor.getSelectedShapeIds()

		if (selectedShapeIds.length === 0) return []

		// [4]
		if (selectedShapeIds.length > 1) {
			const bounds = this.editor.getSelectionPageBounds()
			if (!bounds) return []
			const zoom = this.editor.getZoomLevel()

			return [
				{
					id: 'dimensions-hud',
					type: 'dimensions-hud',
					props: {
						x: bounds.midX,
						y: bounds.maxY + LABEL_PADDING / zoom,
						w: Math.round(bounds.width),
						h: Math.round(bounds.height),
						rotation: 0,
					},
				},
			]
		}

		const shape = this.editor.getShape(selectedShapeIds[0])
		if (!shape) return []

		// [5]
		const bounds = this.editor.getShapeGeometry(shape).bounds
		const transform = this.editor.getShapePageTransform(shape)
		const zoom = this.editor.getZoomLevel()
		const rotation = transform.rotation()

		// [6]
		const padding = LABEL_PADDING / zoom

		const labelEdge = getLabelEdge(rotation)
		const localLabelPoint = getLabelPointForEdge(labelEdge, bounds, padding)

		const labelPoint = transform.applyToPoint(localLabelPoint)
		const labelRotation =
			labelEdge === 'left' || labelEdge === 'right' ? rotation + Math.PI / 2 : rotation
		const readableLabelRotation = getReadableRotation(labelRotation)

		return [
			{
				id: 'dimensions-hud',
				type: 'dimensions-hud',
				props: {
					x: labelPoint.x,
					y: labelPoint.y,
					w: Math.round(bounds.width),
					h: Math.round(bounds.height),
					rotation: readableLabelRotation,
				},
			},
		]
	}

	override render(ctx: CanvasRenderingContext2D, overlays: TLDimensionsHudOverlay[]): void {
		const overlay = overlays[0]
		if (!overlay) return

		const colors = this.editor.getCurrentTheme().colors[this.editor.getColorMode()]

		const { x, y, w, h, rotation } = overlay.props
		const zoom = this.editor.getZoomLevel()

		ctx.save()

		// [7]
		ctx.textAlign = 'center'
		ctx.textBaseline = 'middle'
		ctx.font = `${10 / zoom}px sans-serif`

		const dimensionsLabel = `${w} × ${h}`
		const metrics = ctx.measureText(dimensionsLabel)
		const textHeight = metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent
		const textWidth = metrics.width
		const pillPaddingX = 5 / zoom
		const pillWidth = textWidth + pillPaddingX * 2
		const pillHeight = textHeight * 2

		ctx.translate(x, y)
		ctx.rotate(rotation)

		ctx.fillStyle = colors.selectionStroke
		ctx.beginPath()
		ctx.roundRect(-pillWidth / 2, -pillHeight / 2, pillWidth, pillHeight, pillHeight / 3.5)
		ctx.fill()

		ctx.fillStyle = colors.selectedContrast
		ctx.fillText(dimensionsLabel, 0, 0)
		ctx.restore()
	}
}

/*
[1]
Pick the side of the selected shape that is closest to the bottom of the page.
This keeps the label near the user's expected resize readout position even when
the shape is rotated.

[2]
Flip the label by half a turn when it would otherwise be upside down.

[3]
Calculate the label point in the shape's local coordinate space. The shape's
page transform converts it to page space later.

[4]
Multiple selections do not have a single rotation, so the label uses the
selection's page bounds and stays horizontal.

[5]
Use shape geometry bounds for the width and height. These are local bounds, so
they represent the unrotated dimensions the user is editing.

[6]
Overlay drawing happens in page space. Divide fixed screen-space values by the
zoom level so padding, text, and the pill size look consistent while zooming.

[7]
Save and restore the canvas context around all drawing state because overlay
utils share the same Canvas 2D context.
*/
