import {
	Circle2d,
	Geometry2d,
	OverlayUtil,
	TLCursorType,
	TLOverlay,
	TLPointerEventInfo,
	TLShapeId,
} from 'tldraw'
import {
	CONNECTION_CENTER_HANDLE_HOVER_SIZE_PX,
	CONNECTION_CENTER_HANDLE_SIZE_PX,
} from '../constants'
import { ConnectionShape, getConnectionPageCenter } from './ConnectionShapeUtil'
import { insertNodeWithinConnection } from './insertNodeWithinConnection'

interface TLConnectionCenterHandleOverlay extends TLOverlay {
	props: {
		shapeId: TLShapeId
		x: number
		y: number
	}
}

/**
 * Renders a clickable "+" handle at the midpoint of each fully-bound connection
 * so users can insert a new node into the middle of a connection. Replaces the
 * old SVG indicator-based handle.
 */
export class ConnectionCenterHandleOverlayUtil extends OverlayUtil<TLConnectionCenterHandleOverlay> {
	static override type = 'connection_center_handle'
	override options = { zIndex: 150 }

	override isActive(): boolean {
		const editor = this.editor
		if (editor.getInstanceState().isReadonly) return false
		if (!editor.isIn('select.idle')) return false
		return editor.getZoomLevel() > 0.5
	}

	override getOverlays(): TLConnectionCenterHandleOverlay[] {
		const editor = this.editor
		const overlays: TLConnectionCenterHandleOverlay[] = []
		for (const renderingShape of editor.getRenderingShapes()) {
			const shape = renderingShape.shape
			if (!editor.isShapeOfType<ConnectionShape>(shape, 'connection')) continue
			const center = getConnectionPageCenter(editor, shape)
			if (!center) continue
			overlays.push({
				id: `connection_center_handle:${shape.id}`,
				type: 'connection_center_handle',
				props: { shapeId: shape.id, x: center.x, y: center.y },
			})
		}
		return overlays
	}

	override getGeometry(overlay: TLConnectionCenterHandleOverlay): Geometry2d {
		const radius = CONNECTION_CENTER_HANDLE_HOVER_SIZE_PX / 2 / this.editor.getZoomLevel()
		return new Circle2d({
			x: overlay.props.x - radius,
			y: overlay.props.y - radius,
			radius,
			isFilled: true,
		})
	}

	override getCursor(): TLCursorType {
		return 'pointer' as TLCursorType
	}

	override onPointerDown(overlay: TLConnectionCenterHandleOverlay, _info: TLPointerEventInfo) {
		const connection = this.editor.getShape<ConnectionShape>(overlay.props.shapeId)
		if (!connection) return false
		insertNodeWithinConnection(this.editor, connection, 'vertical')
	}

	override render(
		ctx: CanvasRenderingContext2D,
		overlays: TLConnectionCenterHandleOverlay[]
	): void {
		if (overlays.length === 0) return

		const editor = this.editor
		const zoom = editor.getZoomLevel()
		const themeColors = editor.getCurrentTheme().colors[editor.getColorMode()]
		const ringColor = themeColors.selectionStroke
		const iconColor = themeColors.selectedContrast
		const hoverFill = themeColors.selectionFill
		const hoveredId = editor.overlays.getHoveredOverlayId()

		const ringRadius = CONNECTION_CENTER_HANDLE_SIZE_PX / 2 / zoom
		const hoverRadius = CONNECTION_CENTER_HANDLE_HOVER_SIZE_PX / 2 / zoom
		const plusReachPage = (CONNECTION_CENTER_HANDLE_SIZE_PX / 3 - 1) / zoom
		const iconLineWidth = 2 / zoom

		for (const overlay of overlays) {
			const { x, y } = overlay.props
			const isHovered = overlay.id === hoveredId

			if (isHovered) {
				ctx.fillStyle = hoverFill
				ctx.beginPath()
				ctx.arc(x, y, hoverRadius, 0, Math.PI * 2)
				ctx.fill()
			}

			ctx.fillStyle = ringColor
			ctx.beginPath()
			ctx.arc(x, y, ringRadius, 0, Math.PI * 2)
			ctx.fill()

			ctx.strokeStyle = iconColor
			ctx.lineWidth = iconLineWidth
			ctx.lineCap = 'round'
			ctx.beginPath()
			ctx.moveTo(x - plusReachPage, y)
			ctx.lineTo(x + plusReachPage, y)
			ctx.moveTo(x, y - plusReachPage)
			ctx.lineTo(x, y + plusReachPage)
			ctx.stroke()
		}
	}
}
