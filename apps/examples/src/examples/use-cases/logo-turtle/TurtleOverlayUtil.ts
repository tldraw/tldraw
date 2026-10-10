import { getColorValue, OverlayUtil, TLDefaultSizeStyle, TLOverlay } from 'tldraw'
import { getTurtleWorld, TurtleSnapshot } from './turtle-world'

interface TLTurtleOverlay extends TLOverlay {
	props: { turtle: TurtleSnapshot }
}

// Matches the stroke widths tldraw's line shape uses, so a stroke doesn't jump when it's committed
const STROKE_SIZES: Record<TLDefaultSizeStyle, number> = { s: 1, m: 1.75, l: 2.5, xl: 5 }

export class TurtleOverlayUtil extends OverlayUtil<TLTurtleOverlay> {
	static override type = 'logo-turtle'
	override options = { zIndex: 150 }

	override isActive(): boolean {
		return true
	}

	override getOverlays(): TLTurtleOverlay[] {
		return getTurtleWorld(this.editor)
			.snapshot$.get()
			.map((turtle) => ({ id: `logo-turtle:${turtle.id}`, type: 'logo-turtle', props: { turtle } }))
	}

	override render(ctx: CanvasRenderingContext2D, overlays: TLTurtleOverlay[]): void {
		const theme = this.editor.getCurrentTheme()
		const colors = theme.colors[this.editor.getColorMode()]

		ctx.save()
		ctx.lineCap = 'round'
		ctx.lineJoin = 'round'

		for (const overlay of overlays) {
			const { turtle } = overlay.props
			const color = getColorValue(colors, turtle.color, 'solid')

			if (turtle.path && turtle.path.length > 1) {
				ctx.strokeStyle = color
				ctx.lineWidth = theme.strokeWidth * STROKE_SIZES[turtle.size]
				ctx.beginPath()
				ctx.moveTo(turtle.path[0].x, turtle.path[0].y)
				for (let i = 1; i < turtle.path.length; i++) ctx.lineTo(turtle.path[i].x, turtle.path[i].y)
				ctx.stroke()
			}

			if (!turtle.visible) continue
			ctx.save()
			ctx.translate(turtle.page.x, turtle.page.y)
			ctx.rotate((turtle.heading * Math.PI) / 180)
			ctx.beginPath()
			ctx.moveTo(0, -14)
			ctx.lineTo(9, 9)
			ctx.lineTo(0, 4)
			ctx.lineTo(-9, 9)
			ctx.closePath()
			ctx.fillStyle = getColorValue(colors, turtle.color, 'semi')
			ctx.fill()
			ctx.lineWidth = 1.5
			ctx.strokeStyle = color
			ctx.stroke()
			ctx.restore()
		}

		ctx.restore()
	}
}
