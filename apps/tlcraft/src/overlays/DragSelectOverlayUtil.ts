import { OverlayUtil, TLOverlay } from 'tldraw'
import { dragSelect$ } from '../game-state'

interface TLDragSelectOverlay extends TLOverlay {
	props: { x1: number; y1: number; x2: number; y2: number }
}

// The marching-ants marquee while the player is drag-selecting units.
export class DragSelectOverlayUtil extends OverlayUtil<TLDragSelectOverlay> {
	static override type = 'tlc-drag-select'
	override options = { zIndex: 220 }

	override isActive(): boolean {
		return dragSelect$.get() !== null
	}

	override getOverlays(): TLDragSelectOverlay[] {
		const d = dragSelect$.get()
		if (!d) return []
		return [{ id: 'tlc-drag-select:main', type: 'tlc-drag-select', props: d }]
	}

	override render(ctx: CanvasRenderingContext2D, overlays: TLDragSelectOverlay[]): void {
		const o = overlays[0]
		if (!o) return
		const { x1, y1, x2, y2 } = o.props
		const x = Math.min(x1, x2)
		const y = Math.min(y1, y2)
		const w = Math.abs(x2 - x1)
		const h = Math.abs(y2 - y1)
		const zoom = this.editor.getZoomLevel()
		ctx.save()
		ctx.fillStyle = 'rgba(34, 197, 94, 0.12)'
		ctx.fillRect(x, y, w, h)
		ctx.lineWidth = 1.5 / zoom
		ctx.setLineDash([6 / zoom, 4 / zoom])
		ctx.strokeStyle = '#22c55e'
		ctx.strokeRect(x, y, w, h)
		ctx.setLineDash([])
		ctx.restore()
	}
}
