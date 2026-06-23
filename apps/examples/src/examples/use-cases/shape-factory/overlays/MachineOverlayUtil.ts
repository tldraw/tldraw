import { DEFAULT_THEME, OverlayUtil, TLOverlay, TLThemeDefaultColors } from 'tldraw'
import { ItemColor, ItemShape, MachineKind, MACHINE_R } from '../constants'
import { machines$ } from '../game-state'
import { traceShape } from '../shapes'

interface TLMachineOverlay extends TLOverlay {
	props: {
		id: number
		kind: MachineKind
		x: number
		y: number
		shape?: ItemShape
		paint?: ItemColor
		request?: { shape: ItemShape; color: ItemColor }
		pending: number
		flash?: number
		flashGood?: boolean
	}
}

// The glyph that tells you what each machine does, drawn on top of its real geo
// shape: an extractor shows the raw shape it emits, a painter shows its colour,
// and the hub shows the item it currently wants.
export class MachineOverlayUtil extends OverlayUtil<TLMachineOverlay> {
	static override type = 'sf-machine'
	override options = { zIndex: 215 }

	override isActive(): boolean {
		return machines$.get().length > 0
	}

	override getOverlays(): TLMachineOverlay[] {
		return machines$.get().map((m) => ({ id: `sf-machine:${m.id}`, type: 'sf-machine', props: m }))
	}

	override render(ctx: CanvasRenderingContext2D, overlays: TLMachineOverlay[]): void {
		const zoom = this.editor.getZoomLevel()
		const theme = (
			this.editor.getColorMode() === 'dark' ? DEFAULT_THEME.colors.dark : DEFAULT_THEME.colors.light
		) as TLThemeDefaultColors

		for (const { props } of overlays) {
			const { x, y, kind } = props

			if (kind === 'extractor' && props.shape) {
				drawGlyph(ctx, props.shape, 'grey', x, y, 12, zoom, theme)
			} else if (kind === 'painter' && props.paint) {
				// A filled dot in the painter's colour — a dab of paint.
				const palette = theme[props.paint]
				ctx.beginPath()
				ctx.arc(x, y, 13, 0, Math.PI * 2)
				ctx.fillStyle = palette.solid
				ctx.fill()
				ctx.lineWidth = 2 / zoom
				ctx.strokeStyle = palette.fill
				ctx.stroke()
			} else if (kind === 'hub' && props.request) {
				drawHubCard(ctx, props, x, y, zoom, theme)
			}

			// A small ring of dots showing how many items are buffered here.
			if (kind !== 'hub') drawPending(ctx, x, y, props.pending, theme)
		}
	}
}

function drawGlyph(
	ctx: CanvasRenderingContext2D,
	shape: ItemShape,
	color: ItemColor,
	x: number,
	y: number,
	r: number,
	zoom: number,
	theme: TLThemeDefaultColors
) {
	const palette = theme[color]
	traceShape(ctx, shape, x, y, r)
	ctx.fillStyle = palette.solid
	ctx.fill()
	ctx.lineWidth = 2 / zoom
	ctx.strokeStyle = palette.fill
	ctx.stroke()
}

// The hub's request, shown as a card floating above it so it stays legible no
// matter how many items are streaming into the hub. It pulses green when a
// matching item is delivered and grey when a wrong one is consumed.
function drawHubCard(
	ctx: CanvasRenderingContext2D,
	props: { request?: { shape: ItemShape; color: ItemColor }; flash?: number; flashGood?: boolean },
	x: number,
	y: number,
	zoom: number,
	theme: TLThemeDefaultColors
) {
	if (!props.request) return
	const flash = props.flash ?? 0
	const accent = props.flashGood ? theme.green : theme.grey
	const pulse = 1 + 0.16 * flash
	const half = 28 * pulse
	const cy = y - MACHINE_R - 46

	// A little stem so the card reads as belonging to this hub.
	ctx.beginPath()
	ctx.moveTo(x - 7, cy + half - 2)
	ctx.lineTo(x + 7, cy + half - 2)
	ctx.lineTo(x, cy + half + 10)
	ctx.closePath()
	ctx.fillStyle = theme.background
	ctx.fill()

	// Card body.
	roundRect(ctx, x - half, cy - half, half * 2, half * 2, 12)
	ctx.fillStyle = theme.background
	ctx.fill()
	ctx.lineWidth = (flash > 0 ? 3.5 : 2) / zoom
	ctx.strokeStyle = flash > 0 ? accent.solid : theme.grey.solid
	ctx.globalAlpha = flash > 0 ? 1 : 0.5
	ctx.stroke()
	ctx.globalAlpha = 1

	// The wanted item, large and centred.
	const palette = theme[props.request.color]
	traceShape(ctx, props.request.shape, x, cy, 15)
	ctx.fillStyle = palette.solid
	ctx.fill()
	ctx.lineWidth = 2 / zoom
	ctx.strokeStyle = palette.fill
	ctx.stroke()
}

function roundRect(
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	w: number,
	h: number,
	r: number
) {
	ctx.beginPath()
	ctx.moveTo(x + r, y)
	ctx.arcTo(x + w, y, x + w, y + h, r)
	ctx.arcTo(x + w, y + h, x, y + h, r)
	ctx.arcTo(x, y + h, x, y, r)
	ctx.arcTo(x, y, x + w, y, r)
	ctx.closePath()
}

function drawPending(
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	pending: number,
	theme: TLThemeDefaultColors
) {
	if (pending <= 0) return
	const cy = y + MACHINE_R + 8
	for (let i = 0; i < pending; i++) {
		ctx.beginPath()
		ctx.arc(x - (pending - 1) * 3 + i * 6, cy, 2, 0, Math.PI * 2)
		ctx.fillStyle = theme.grey.solid
		ctx.fill()
	}
}
