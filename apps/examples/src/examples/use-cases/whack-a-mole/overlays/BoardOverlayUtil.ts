import { DEFAULT_THEME, OverlayUtil, TLOverlay } from 'tldraw'
import { frame$, getWorld, HOLE_R, Hole, MOLE_R, MOLE_RISE } from '../game-state'

interface TLBoardOverlay extends TLOverlay {
	props: { frame: number }
}

const HOLE_RY = HOLE_R * 0.42 // holes are drawn as flat ellipses

// Muted, draw-style palette, matching the viewfinder example: ink-outlined
// shapes with soft earth-tone fills.
const HOLE_DIRT = '#9c8b76' // hole interior
const MOLE_BODY = '#a3815b'
const MOLE_BELLY = '#d8cb9e'
const MOLE_NOSE = '#d98aa0'
const BLOCK_FILL = '#aebac6' // cool slab, against the warm moles

// Draws the whole board on one canvas layer: holes, the moles emerging from
// them, and the draggable blocks — all hand-drawn, ink-outlined doodles. The
// overlay's `frame` prop is bumped each tick so the reactive render re-runs
// every frame against live world state.
export class BoardOverlayUtil extends OverlayUtil<TLBoardOverlay> {
	static override type = 'wm-board'
	override options = { zIndex: 200 }

	override isActive(): boolean {
		return true
	}

	override getOverlays(): TLBoardOverlay[] {
		return [{ id: 'wm-board:board', type: 'wm-board', props: { frame: frame$.get() } }]
	}

	override render(ctx: CanvasRenderingContext2D): void {
		const theme =
			this.editor.getColorMode() === 'dark' ? DEFAULT_THEME.colors.dark : DEFAULT_THEME.colors.light
		const ink = theme.text
		const world = getWorld()

		ctx.lineCap = 'round'
		ctx.lineJoin = 'round'

		for (const hole of world.holes) {
			// Hole mouth: an ink-outlined ellipse of dirt.
			ctx.fillStyle = HOLE_DIRT
			ellipse(ctx, hole.x, hole.y, HOLE_R, HOLE_RY)
			ctx.fill()
			ctx.strokeStyle = ink
			ctx.lineWidth = 2.5
			ctx.stroke()

			this.drawMole(ctx, hole, ink)

			// Front rim: a heavier ink lip on the near side so moles read as coming
			// out of, not floating above, the hole.
			ctx.strokeStyle = ink
			ctx.lineWidth = 4
			ctx.beginPath()
			ctx.ellipse(hole.x, hole.y, HOLE_R, HOLE_RY, 0, 0, Math.PI)
			ctx.stroke()
		}

		// Blocks on top: hand-drawn slabs.
		for (const b of world.blocks) {
			roundRect(ctx, b.x, b.y, b.w, b.h, 14)
			ctx.fillStyle = BLOCK_FILL
			ctx.fill()
			ctx.strokeStyle = ink
			ctx.lineWidth = 2.5
			ctx.stroke()
			// A couple of sketchy planks for texture.
			ctx.globalAlpha = 0.35
			ctx.lineWidth = 2
			for (const t of [0.34, 0.66]) {
				ctx.beginPath()
				ctx.moveTo(b.x + 8, b.y + b.h * t)
				ctx.lineTo(b.x + b.w - 8, b.y + b.h * t)
				ctx.stroke()
			}
			ctx.globalAlpha = 1
		}
	}

	private drawMole(ctx: CanvasRenderingContext2D, hole: Hole, ink: string) {
		const mole = hole.mole
		if (!mole || mole.pop <= 0.01) return

		// Clip to everything above the hole's center line so the mole emerges
		// from the hole rather than appearing whole.
		ctx.save()
		ctx.beginPath()
		ctx.rect(hole.x - HOLE_R, hole.y - 10000, HOLE_R * 2, 10000)
		ctx.clip()

		// A cheeky wiggle while it's still peeking (low pop).
		const peek = Math.max(0, 1 - mole.pop * 1.6)
		const wob = Math.sin(mole.t * 22) * 3 * peek
		const cx = hole.x + wob
		const cy = hole.y - mole.pop * MOLE_RISE

		// Body, ink-outlined.
		ctx.lineWidth = 2
		ctx.fillStyle = MOLE_BODY
		ctx.strokeStyle = ink
		circle(ctx, cx, cy, MOLE_R)
		ctx.fill()
		ctx.stroke()
		// Belly.
		ctx.fillStyle = MOLE_BELLY
		ellipse(ctx, cx, cy + MOLE_R * 0.35, MOLE_R * 0.55, MOLE_R * 0.5)
		ctx.fill()
		// Eyes.
		ctx.fillStyle = ink
		circle(ctx, cx - 10, cy - 8, 3.5)
		ctx.fill()
		circle(ctx, cx + 10, cy - 8, 3.5)
		ctx.fill()
		// Cheeky little smile.
		ctx.strokeStyle = ink
		ctx.lineWidth = 2
		ctx.beginPath()
		ctx.arc(cx, cy - 2, 7, 0.15 * Math.PI, 0.85 * Math.PI)
		ctx.stroke()
		// Nose.
		ctx.fillStyle = MOLE_NOSE
		circle(ctx, cx, cy + 1, 4)
		ctx.fill()

		ctx.restore()
	}
}

function circle(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
	ctx.beginPath()
	ctx.arc(x, y, r, 0, Math.PI * 2)
}

function ellipse(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number) {
	ctx.beginPath()
	ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2)
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
	ctx.roundRect(x, y, w, h, r)
}
