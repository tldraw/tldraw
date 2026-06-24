import { DEFAULT_THEME, OverlayUtil, TLOverlay } from 'tldraw'
import { frame$, getWorld, Owner, pegOwner, PLAYER_COLOR, Point } from '../game-state'
import { pulsePos } from '../sim'

interface TLTerritoryOverlay extends TLOverlay {
	props: { frame: number }
}

type ThemeColors = (typeof DEFAULT_THEME.colors)['light']

// Draws the whole board on one canvas layer: pegs tinted by owner, strands in
// their flowing owner's color, energy pulses, free-end nubs, and the player
// source stations. A single overlay whose `frame` prop is bumped each tick, so
// the reactive render re-runs every frame and reads live world state.
export class TerritoryOverlayUtil extends OverlayUtil<TLTerritoryOverlay> {
	static override type = 'st-territory'
	override options = { zIndex: 200 }

	override isActive(): boolean {
		return true
	}

	override getOverlays(): TLTerritoryOverlay[] {
		return [{ id: 'st-territory:board', type: 'st-territory', props: { frame: frame$.get() } }]
	}

	override render(ctx: CanvasRenderingContext2D): void {
		const zoom = this.editor.getZoomLevel()
		const px = (n: number) => n / zoom // keep stroke/size constant on screen
		const theme =
			this.editor.getColorMode() === 'dark' ? DEFAULT_THEME.colors.dark : DEFAULT_THEME.colors.light
		const world = getWorld()
		const frame = frame$.get()

		const colorOf = (owner: Owner) =>
			(theme[PLAYER_COLOR[owner] as keyof ThemeColors] as { solid: string }).solid

		// Pegs — small blocks, tinted toward their owner with a halo whose
		// strength tracks the dominant charge, so the territory map is readable.
		for (const peg of world.pegs) {
			const owner = pegOwner(peg)
			if (owner) {
				const strength = Math.min(1, peg.charge[owner] / 4)
				// Soft ownership halo.
				ctx.globalAlpha = 0.18 * strength
				ctx.fillStyle = colorOf(owner)
				ctx.beginPath()
				ctx.arc(peg.x, peg.y, px(22), 0, Math.PI * 2)
				ctx.fill()
				// The peg block itself in the owner's color.
				ctx.globalAlpha = 0.5 + 0.5 * strength
				block(ctx, peg.x, peg.y, px(7), px(2))
				ctx.fill()
			} else {
				ctx.globalAlpha = 0.18
				ctx.fillStyle = theme.text
				block(ctx, peg.x, peg.y, px(5), px(1.5))
				ctx.fill()
			}
		}
		ctx.globalAlpha = 1

		// Strands — thick flat lines in the flowing owner's color, dimming as the
		// flow highlight fades. Unlit (dead) strands draw muted.
		ctx.lineCap = 'round'
		ctx.lineJoin = 'round'
		for (const strand of world.strands) {
			let color = theme.text
			let alpha = 0.22
			if (strand.flow) {
				color = colorOf(strand.flow.owner)
				alpha = 0.35 + 0.65 * strand.flow.level
			}
			ctx.globalAlpha = alpha
			ctx.strokeStyle = color
			ctx.lineWidth = px(strand.flow ? 5 : 4)
			ctx.beginPath()
			ctx.moveTo(strand.points[0].x, strand.points[0].y)
			for (let i = 1; i < strand.points.length; i++) {
				ctx.lineTo(strand.points[i].x, strand.points[i].y)
			}
			ctx.stroke()

			// Free ends get a small block to signal "grab me".
			ctx.globalAlpha = 1
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
		ctx.globalAlpha = 1

		// Source stations — large blocky emitters in each player's color.
		for (const owner of ['a', 'b'] as Owner[]) {
			const peg = world.pegs.find((p) => p.id === world.sources[owner])
			if (!peg) continue
			block(ctx, peg.x, peg.y, px(20), px(5))
			ctx.fillStyle = colorOf(owner)
			ctx.fill()
			ctx.lineWidth = px(3)
			ctx.strokeStyle = theme.background
			ctx.stroke()
		}

		// Pulses — bright energy packets streaking along the wires, in their
		// owner's color. Brighter packets carry more strength.
		for (const pulse of world.pulses) {
			const strand = world.strands.find((s) => s.id === pulse.strandId)
			if (!strand) continue
			const flick = 0.7 + 0.3 * Math.sin(frame * 0.5 + pulse.dist * 0.06)
			const size = 0.5 + Math.min(1, pulse.strength) * 0.5

			// Casing: a wider, dim streak trailing the head, in the owner color.
			ctx.globalAlpha = 0.4 * flick * size
			ctx.strokeStyle = colorOf(pulse.owner)
			ctx.lineWidth = px(9 * size)
			strokeAlong(ctx, strand, pulse.dir, pulse.dist - px(30 * size), pulse.dist, px(7))

			// Core: a short bright packet at the head, in the theme's white.
			ctx.globalAlpha = 0.5 + 0.5 * size
			ctx.strokeStyle = theme.white.solid
			ctx.lineWidth = px(4 * size)
			strokeAlong(ctx, strand, pulse.dir, pulse.dist - px(12 * size), pulse.dist, px(6))
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
