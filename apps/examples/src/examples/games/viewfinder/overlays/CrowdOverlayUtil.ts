import { DEFAULT_THEME, OverlayUtil, TLOverlay } from 'tldraw'
import { Creature, frame$, getWorld } from '../game-state'

interface TLCrowdOverlay extends TLOverlay {
	props: { frame: number }
}

// Everything is drawn at a fixed page size, so zoom is literally resolving
// power: far out the whole crowd is a field of identical specks; only once you
// zoom in do the faces — and Wally's tell — become large enough to read.
const BODY = 16 // body radius, page units

// Muted, draw-style body colours. Wally draws from the same palette, so colour
// is never the tell — only the red cap is.
const COLORS = ['#cdbfae', '#b9c4b1', '#c9b7b0', '#aebac6', '#d8cb9e', '#c2b2c4', '#b3b3aa']

// Cheap deterministic per-creature noise: stable across frames, different per
// channel, so each creature gets a fixed but varied set of features.
function hash(seed: number, channel: number) {
	const v = Math.sin(seed * 127.1 + channel * 311.7) * 43758.5453
	return v - Math.floor(v)
}

// Draws the whole crowd on one page-space canvas layer. A single overlay whose
// `frame` prop bumps each tick, so the reactive render re-runs every frame and
// reads live world state.
export class CrowdOverlayUtil extends OverlayUtil<TLCrowdOverlay> {
	static override type = 'vf-crowd'
	override options = { zIndex: 200 }

	override isActive(): boolean {
		return true
	}

	override getOverlays(): TLCrowdOverlay[] {
		return [{ id: 'vf-crowd:field', type: 'vf-crowd', props: { frame: frame$.get() } }]
	}

	override render(ctx: CanvasRenderingContext2D): void {
		const theme =
			this.editor.getColorMode() === 'dark' ? DEFAULT_THEME.colors.dark : DEFAULT_THEME.colors.light
		const ink = theme.text
		const world = getWorld()

		ctx.lineCap = 'round'
		ctx.lineJoin = 'round'

		for (const c of world.creatures) {
			this.drawCreature(ctx, c, ink)
		}
	}

	private drawCreature(ctx: CanvasRenderingContext2D, c: Creature, ink: string) {
		// Per-creature features, all derived from the seed so they're stable.
		const r = BODY * (0.8 + hash(c.seed, 1) * 0.5)
		const aspect = 0.8 + hash(c.seed, 2) * 0.55 // tall vs squat
		const color = COLORS[Math.floor(hash(c.seed, 3) * COLORS.length)]
		const eyeCount = 1 + Math.floor(hash(c.seed, 4) * 3) // 1, 2 or 3 eyes
		const accessory = Math.floor(hash(c.seed, 5) * 4) // 0 none, 1 antenna, 2 ears, 3 tuft
		const baseTilt = (hash(c.seed, 6) - 0.5) * 0.5

		const panic = c.isWally ? c.panic : 0
		// Wally squashes, spins and jitters as he freaks out.
		const w = c.wobble
		const tilt = baseTilt + (c.isWally ? Math.sin(w) * 0.18 * panic : 0)
		const squash = c.isWally ? 1 + Math.sin(w * 1.3) * 0.1 * panic : 1

		ctx.save()
		ctx.translate(c.x, c.y)
		ctx.rotate(tilt)
		ctx.scale(squash, 1 / squash)

		const rx = r
		const ry = r * aspect

		// Accessories drawn behind the body.
		ctx.strokeStyle = ink
		ctx.fillStyle = color
		ctx.lineWidth = 2
		if (accessory === 1) {
			// antenna with a bobble
			ctx.beginPath()
			ctx.moveTo(0, -ry)
			ctx.lineTo(hash(c.seed, 7) * 6 - 3, -ry - r * 0.7)
			ctx.stroke()
			ctx.beginPath()
			ctx.arc(hash(c.seed, 7) * 6 - 3, -ry - r * 0.7, 2.5, 0, Math.PI * 2)
			ctx.fill()
			ctx.stroke()
		} else if (accessory === 2) {
			// two little ears
			for (const s of [-1, 1]) {
				ctx.beginPath()
				ctx.ellipse(s * rx * 0.6, -ry * 0.7, r * 0.22, r * 0.34, s * 0.4, 0, Math.PI * 2)
				ctx.fill()
				ctx.stroke()
			}
		}

		// Body
		ctx.fillStyle = color
		ctx.strokeStyle = ink
		ctx.lineWidth = 2
		ctx.beginPath()
		ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2)
		ctx.fill()
		ctx.stroke()

		if (accessory === 3) {
			// a little hair tuft on top
			ctx.beginPath()
			ctx.moveTo(-r * 0.2, -ry)
			ctx.lineTo(0, -ry - r * 0.4)
			ctx.lineTo(r * 0.2, -ry)
			ctx.stroke()
		}

		// Eyes, spread along the face, looking in the creature's idle direction.
		const look = c.seed * 2.3
		const ex = Math.cos(look) * r * 0.18
		const ey = Math.sin(look) * r * 0.18 - r * 0.12
		const eyeR = Math.max(1.4, r * 0.11) * (1 + panic * 0.8) // eyes go wide in panic
		ctx.fillStyle = ink
		for (let i = 0; i < eyeCount; i++) {
			const t = eyeCount === 1 ? 0 : (i / (eyeCount - 1) - 0.5) * 2 // -1..1
			ctx.beginPath()
			ctx.arc(t * rx * 0.4 + ex, ey, eyeR, 0, Math.PI * 2)
			ctx.fill()
		}

		// Open "o" mouth when freaking out.
		if (panic > 0.15) {
			ctx.beginPath()
			ctx.arc(0, ry * 0.35, r * 0.16 * panic + 1, 0, Math.PI * 2)
			ctx.fill()
		}

		// Flailing arms while panicking.
		if (panic > 0) {
			ctx.strokeStyle = ink
			ctx.lineWidth = 2
			for (const s of [-1, 1]) {
				ctx.beginPath()
				ctx.moveTo(s * rx * 0.8, ry * 0.1)
				ctx.lineTo(
					s * rx * (1.3 + Math.sin(w * 1.2 + s) * 0.2 * panic),
					-ry * (0.4 + Math.cos(w * 1.4 + s) * 0.3 * panic)
				)
				ctx.stroke()
			}
		}

		// Wally's tell: a small red cap. Tiny in page units, so it's invisible
		// from afar and only resolves once you've zoomed right in.
		if (c.isWally) {
			ctx.fillStyle = '#e15241'
			ctx.beginPath()
			ctx.moveTo(-rx * 0.55, -ry * 0.85)
			ctx.lineTo(rx * 0.55, -ry * 0.85)
			ctx.lineTo(0, -ry - r * 0.7)
			ctx.closePath()
			ctx.fill()
		}

		ctx.restore()
	}
}
