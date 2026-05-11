import { OverlayUtil, TLOverlay } from 'tldraw'
import { PATH } from '../path'

interface TLPathOverlay extends TLOverlay {
	props: Record<string, never>
}

export class PathOverlayUtil extends OverlayUtil<TLPathOverlay> {
	static override type = 'td-path'
	override options = { zIndex: 50 }

	override isActive(): boolean {
		return true
	}

	override getOverlays(): TLPathOverlay[] {
		return [{ id: 'td-path:main', type: 'td-path', props: {} }]
	}

	override render(ctx: CanvasRenderingContext2D): void {
		const zoom = this.editor.getZoomLevel()
		const isDark = this.editor.getColorMode() === 'dark'

		ctx.save()
		ctx.lineCap = 'round'
		ctx.lineJoin = 'round'

		// Wide soft track
		ctx.lineWidth = 38
		ctx.strokeStyle = isDark ? 'rgba(80, 80, 110, 0.45)' : 'rgba(160, 170, 200, 0.45)'
		ctx.beginPath()
		ctx.moveTo(PATH[0].x, PATH[0].y)
		for (let i = 1; i < PATH.length; i++) ctx.lineTo(PATH[i].x, PATH[i].y)
		ctx.stroke()

		// Center dashed line
		ctx.lineWidth = 2 / zoom
		ctx.setLineDash([10 / zoom, 10 / zoom])
		ctx.strokeStyle = isDark ? 'rgba(220, 220, 240, 0.7)' : 'rgba(60, 60, 80, 0.7)'
		ctx.beginPath()
		ctx.moveTo(PATH[0].x, PATH[0].y)
		for (let i = 1; i < PATH.length; i++) ctx.lineTo(PATH[i].x, PATH[i].y)
		ctx.stroke()

		ctx.restore()
	}
}
