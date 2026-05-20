import { OverlayUtil, TLOverlay, VecModel } from 'tldraw'
import { TapePoint, anchor$, tapeStroke$ } from './tape-state'

interface TLTapeOverlay extends TLOverlay {
	props: {
		leader: TapePoint
		anchor: TapePoint
		stroke: { origin: TapePoint; points: VecModel[] } | null
	}
}

export class TapeOverlayUtil extends OverlayUtil<TLTapeOverlay> {
	static override type = 'digital-tape'
	override options = { zIndex: 400 }

	override isActive(): boolean {
		// Wait until the controller has seeded an anchor on first tick.
		return anchor$.get() !== null
	}

	override getOverlays(): TLTapeOverlay[] {
		const leader = this.editor.inputs.getCurrentPagePoint()
		const anchor = anchor$.get()
		if (!anchor) return []
		return [
			{
				id: 'digital-tape:main',
				type: 'digital-tape',
				props: {
					leader: { x: leader.x, y: leader.y },
					anchor,
					stroke: tapeStroke$.get(),
				},
			},
		]
	}

	override render(ctx: CanvasRenderingContext2D, overlays: TLTapeOverlay[]): void {
		const overlay = overlays[0]
		if (!overlay) return
		const { leader, anchor, stroke } = overlay.props
		const zoom = this.editor.getZoomLevel()
		const px = 1 / zoom
		const colorMode = this.editor.getColorMode()
		const isDark = colorMode === 'dark'
		const fg = isDark ? '#fff' : '#111'
		const muted = isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.25)'
		const accent = this.editor.getCurrentTheme().colors[colorMode].selectionStroke

		// Live tape preview while the user is pulling tape.
		if (stroke && stroke.points.length > 1) {
			ctx.save()
			ctx.strokeStyle = fg
			ctx.lineWidth = 3 * px
			ctx.lineCap = 'round'
			ctx.lineJoin = 'round'
			ctx.beginPath()
			for (let i = 0; i < stroke.points.length; i++) {
				const p = stroke.points[i]
				const x = stroke.origin.x + p.x
				const y = stroke.origin.y + p.y
				if (i === 0) ctx.moveTo(x, y)
				else ctx.lineTo(x, y)
			}
			ctx.stroke()
			ctx.restore()
		}

		// Connector between the two indicators.
		ctx.save()
		ctx.beginPath()
		ctx.moveTo(anchor.x, anchor.y)
		ctx.lineTo(leader.x, leader.y)
		if (stroke) {
			ctx.strokeStyle = accent
			ctx.lineWidth = 2 * px
		} else {
			ctx.strokeStyle = muted
			ctx.lineWidth = 1 * px
			ctx.setLineDash([4 * px, 4 * px])
		}
		ctx.stroke()
		ctx.restore()

		// Anchor (trailing) indicator.
		ctx.save()
		ctx.beginPath()
		ctx.arc(anchor.x, anchor.y, 6 * px, 0, Math.PI * 2)
		ctx.fillStyle = stroke ? accent : fg
		ctx.fill()
		ctx.restore()

		// Leader (cursor) indicator.
		ctx.save()
		ctx.beginPath()
		ctx.arc(leader.x, leader.y, 7 * px, 0, Math.PI * 2)
		ctx.fillStyle = isDark ? '#111' : '#fff'
		ctx.fill()
		ctx.lineWidth = 2 * px
		ctx.strokeStyle = fg
		ctx.stroke()
		ctx.restore()
	}
}
