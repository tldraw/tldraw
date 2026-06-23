import { DEFAULT_THEME, OverlayUtil, TLOverlay } from 'tldraw'
import { frame$, getWorld, Point } from '../game-state'
import { pulsePos } from '../sim'

interface TLStrandsOverlay extends TLOverlay {
	props: { frame: number }
}

type ThemeColors = (typeof DEFAULT_THEME.colors)['light']

// Draws the whole board on one canvas layer: pegs, strands, source/output
// nodes, energy pulses, free-end nubs, and the fading laser cut. A single
// overlay whose `frame` prop is bumped each tick, so the reactive render
// re-runs every frame and reads live world state.
export class StrandsOverlayUtil extends OverlayUtil<TLStrandsOverlay> {
	static override type = 'cc-strands'
	override options = { zIndex: 200 }

	override isActive(): boolean {
		return true
	}

	override getOverlays(): TLStrandsOverlay[] {
		return [{ id: 'cc-strands:board', type: 'cc-strands', props: { frame: frame$.get() } }]
	}

	override render(ctx: CanvasRenderingContext2D): void {
		const zoom = this.editor.getZoomLevel()
		const px = (n: number) => n / zoom // keep stroke/size constant on screen
		const theme =
			this.editor.getColorMode() === 'dark' ? DEFAULT_THEME.colors.dark : DEFAULT_THEME.colors.light
		const world = getWorld()
		const frame = frame$.get()

		// Pegs — small muted blocks on the grid.
		ctx.fillStyle = theme.text
		ctx.globalAlpha = 0.18
		for (const peg of world.pegs) {
			block(ctx, peg.x, peg.y, px(5), px(1.5))
			ctx.fill()
		}
		ctx.globalAlpha = 1

		// Strands — thick flat lines in the line colour.
		ctx.lineCap = 'round'
		ctx.lineJoin = 'round'
		for (const strand of world.strands) {
			const color = (theme[strand.color as keyof ThemeColors] as { solid: string }).solid
			ctx.strokeStyle = color
			ctx.lineWidth = px(5)
			ctx.beginPath()
			ctx.moveTo(strand.points[0].x, strand.points[0].y)
			for (let i = 1; i < strand.points.length; i++) {
				ctx.lineTo(strand.points[i].x, strand.points[i].y)
			}
			ctx.stroke()

			// Free ends get a small block to signal "grab me".
			for (const end of [strand.points[0], strand.points[strand.points.length - 1]] as Point[]) {
				if (end.pinned) continue
				block(ctx, end.x, end.y, px(9), px(2.5))
				ctx.fillStyle = theme.background
				ctx.fill()
				ctx.lineWidth = px(2.5)
				ctx.strokeStyle = color
				ctx.stroke()
			}
		}

		// Source (emitter) and output (target) nodes — blocky stations.
		const station = (pegId: string, color: string) => {
			const peg = world.pegs.find((p) => p.id === pegId)
			if (!peg) return
			block(ctx, peg.x, peg.y, px(18), px(4))
			ctx.fillStyle = color
			ctx.fill()
			ctx.lineWidth = px(3)
			ctx.strokeStyle = theme.background
			ctx.stroke()
		}
		for (const id of world.sources) station(id, theme.green.solid)
		for (const id of world.outputs) station(id, theme.orange.solid)

		// Pulses — bright energy packets streaking along the wires.
		for (const pulse of world.pulses) {
			const strand = world.strands.find((s) => s.id === pulse.strandId)
			if (!strand) continue
			// Subtle electric flicker so the charge feels alive.
			const flick = 0.7 + 0.3 * Math.sin(frame * 0.5 + pulse.dist * 0.06)

			// Casing: a wider, dim streak trailing the head, in a tldraw colour.
			ctx.globalAlpha = 0.4 * flick
			ctx.strokeStyle = theme.blue.solid
			ctx.lineWidth = px(9)
			strokeAlong(ctx, strand, pulse.dir, pulse.dist - px(34), pulse.dist, px(7))

			// Core: a short bright packet at the head, in the theme's white.
			ctx.globalAlpha = 1
			ctx.strokeStyle = theme.white.solid
			ctx.lineWidth = px(4)
			strokeAlong(ctx, strand, pulse.dir, pulse.dist - px(13), pulse.dist, px(6))
		}
		ctx.globalAlpha = 1
		// The cut stroke itself is drawn by tldraw's built-in scribble overlay
		// (driven via editor.scribbles), so nothing to draw here for the laser.
	}
}

// A centered rounded square, path only (caller fills/strokes).
function block(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number, r: number) {
	const x = cx - size / 2
	const y = cy - size / 2
	ctx.beginPath()
	ctx.moveTo(x + r, y)
	ctx.arcTo(x + size, y, x + size, y + size, r)
	ctx.arcTo(x + size, y + size, x, y + size, r)
	ctx.arcTo(x, y + size, x, y, r)
	ctx.arcTo(x, y, x + size, y, r)
	ctx.closePath()
}

// Stroke a sub-section of a strand between two arc-length distances, sampled so
// it follows the wire's curve. Used to draw a pulse's streak.
function strokeAlong(
	ctx: CanvasRenderingContext2D,
	strand: Parameters<typeof pulsePos>[0],
	dir: 1 | -1,
	fromDist: number,
	toDist: number,
	step: number
) {
	const from = Math.max(0, fromDist)
	ctx.beginPath()
	let first = true
	for (let d = from; d < toDist; d += step) {
		const p = pulsePos(strand, dir, d)
		if (first) {
			ctx.moveTo(p.x, p.y)
			first = false
		} else {
			ctx.lineTo(p.x, p.y)
		}
	}
	const head = pulsePos(strand, dir, toDist)
	if (first) ctx.moveTo(head.x, head.y)
	else ctx.lineTo(head.x, head.y)
	ctx.stroke()
}
