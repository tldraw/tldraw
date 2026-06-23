import { DEFAULT_THEME, OverlayUtil, TLOverlay, TLThemeDefaultColors } from 'tldraw'
import { MACHINE_R } from '../constants'
import { drag$ } from '../game-state'

interface TLBeltPreviewOverlay extends TLOverlay {
	props: {
		fromX: number
		fromY: number
		toX: number
		toY: number
		snapId: number | null
		valid: boolean
	}
}

// The rubber-band belt drawn while dragging from one machine toward another:
// green when it would make a valid connection, faint grey otherwise.
export class BeltPreviewOverlayUtil extends OverlayUtil<TLBeltPreviewOverlay> {
	static override type = 'sf-belt-preview'
	override options = { zIndex: 240 }

	override isActive(): boolean {
		return drag$.get() !== null
	}

	override getOverlays(): TLBeltPreviewOverlay[] {
		const d = drag$.get()
		if (!d) return []
		return [{ id: 'sf-belt-preview:0', type: 'sf-belt-preview', props: d }]
	}

	override render(ctx: CanvasRenderingContext2D, overlays: TLBeltPreviewOverlay[]): void {
		const zoom = this.editor.getZoomLevel()
		const theme = (
			this.editor.getColorMode() === 'dark' ? DEFAULT_THEME.colors.dark : DEFAULT_THEME.colors.light
		) as TLThemeDefaultColors

		for (const { props } of overlays) {
			const stroke = props.valid ? theme.green.solid : theme.grey.solid

			ctx.beginPath()
			ctx.moveTo(props.fromX, props.fromY)
			ctx.lineTo(props.toX, props.toY)
			ctx.lineWidth = 8 / zoom
			ctx.strokeStyle = stroke
			ctx.globalAlpha = props.valid ? 0.6 : 0.35
			ctx.lineCap = 'round'
			ctx.stroke()
			ctx.globalAlpha = 1

			// A ring on the machine the belt would snap to.
			if (props.snapId !== null) {
				ctx.beginPath()
				ctx.arc(props.toX, props.toY, MACHINE_R + 6, 0, Math.PI * 2)
				ctx.lineWidth = 3 / zoom
				ctx.strokeStyle = theme.green.solid
				ctx.stroke()
			}
		}
	}
}
