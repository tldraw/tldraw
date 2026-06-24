import { DEFAULT_THEME, getStroke, OverlayUtil, TLOverlay } from 'tldraw'
import {
	CLAIM_CHARGE,
	CORE_HP,
	CUT_FLASH_TICKS,
	frame$,
	getWorld,
	GRID,
	Owner,
	pegOwner,
	PLAYER_COLOR,
	THICKNESS_SCALE,
} from '../game-state'
import { chargeStrength, hasPresence, sparkPos, vineSubtreeSize } from '../sim'

interface TLOvergrowthOverlay extends TLOverlay {
	props: { frame: number }
}

type ThemeColors = (typeof DEFAULT_THEME.colors)['light']

// ============================================================================
// PALETTE — drawn entirely from tldraw's DEFAULT_THEME so the board sits in
// tldraw's own visual language and follows its light/dark color scheme. The two
// sides are tldraw palette colors (blue vs orange, via PLAYER_COLOR); the growth
// frontier is tldraw yellow; rock and withering use tldraw grey; the cut "snip"
// and core ink use the theme's text color so they read on either scheme.
//
// `C` is the resolved color set for the current frame; render() rebuilds it from
// the live theme before drawing, so the helpers below stay simple string reads.
// ============================================================================
function resolveColors(theme: ThemeColors) {
	const named = (name: string) => (theme[name as keyof ThemeColors] as { solid: string }).solid
	return {
		a: named(PLAYER_COLOR.a),
		b: named(PLAYER_COLOR.b),
		tip: theme.yellow.solid, // growth-frontier bud
		spark: theme.white.solid, // bright spark center
		flash: theme.text, // cut "snip" ring + burst (ink; adapts to scheme)
		ink: theme.text, // core outline, rock rim
		neutral: theme.grey.solid, // unclaimed vine threads
		rockFill: theme.grey.solid,
		rockHi: theme.background, // lit top-edge bevel
		danger: theme.red.solid, // low-HP core ring
		wither: theme.grey.solid, // sere tint a cut-off vine fades toward
	}
}

let C = resolveColors(DEFAULT_THEME.colors.light)
const coreColor = (o: Owner) => (o === 'a' ? C.a : C.b)

// ============================================================================
// CONTINUOUS LEVEL OF DETAIL (zoom = page units per screen unit; <1 zoomed out).
// Rather than hard-switching representations, a single eased factor `t` (0 when
// zoomed out, 1 when zoomed in) crossfades the board across LOD_LO..LOD_HI:
//
//   t≈0 (far)  → territory is space-filling squares; no lines.
//   t mid      → squares fade as owner-colored circles bloom & suffuse, and the
//                hand-drawn vine mesh fades in.
//   t≈1 (near) → crisp jewel-bead nodes + the full freehand vine mesh.
//
// So zooming (including the auto fly-in to cut) is a smooth morph, never a pop.
// Sparks still gate on a higher zoom (they're a close-up flourish).
// ============================================================================
const LOD_LO = 0.26
const LOD_HI = 0.6
const VINE_ZOOM = 0.85

const smoothstep = (lo: number, hi: number, x: number) => {
	const u = Math.max(0, Math.min(1, (x - lo) / (hi - lo)))
	return u * u * (3 - 2 * u)
}

// Render everything for the board on one canvas layer, culled to the viewport.
// The overlay's `frame` prop is bumped each tick so this re-runs every frame
// against live world state.
export class OvergrowthOverlayUtil extends OverlayUtil<TLOvergrowthOverlay> {
	static override type = 'og-overgrowth'
	override options = { zIndex: 200 }

	override isActive(): boolean {
		return true
	}

	override getOverlays(): TLOvergrowthOverlay[] {
		return [{ id: 'og-overgrowth:board', type: 'og-overgrowth', props: { frame: frame$.get() } }]
	}

	override render(ctx: CanvasRenderingContext2D): void {
		const editor = this.editor
		C = resolveColors(
			editor.getColorMode() === 'dark' ? DEFAULT_THEME.colors.dark : DEFAULT_THEME.colors.light
		)
		const zoom = editor.getZoomLevel()
		const px = (n: number) => n / zoom // keep stroke/size constant on screen
		const world = getWorld()
		const frame = frame$.get()

		// --- viewport culling bounds, inflated by one cell so partly-visible
		// elements still draw. All iteration below is gated by these so cost is
		// O(visible), never O(board). ---
		const vp = editor.getViewportPageBounds()
		const inset = GRID.spacing
		const minX = vp.minX - inset
		const minY = vp.minY - inset
		const maxX = vp.maxX + inset
		const maxY = vp.maxY + inset
		const inView = (x: number, y: number) => x >= minX && x <= maxX && y >= minY && y <= maxY

		const c0 = Math.max(0, Math.floor((minX - GRID.x0) / GRID.spacing))
		const c1 = Math.min(GRID.cols - 1, Math.ceil((maxX - GRID.x0) / GRID.spacing))
		const r0 = Math.max(0, Math.floor((minY - GRID.y0) / GRID.spacing))
		const r1 = Math.min(GRID.rows - 1, Math.ceil((maxY - GRID.y0) / GRID.spacing))

		this.renderBoard(ctx, world, inView, c0, c1, r0, r1, px, zoom, frame)
	}

	// True if cell (c,r) is rock. Out-of-board reads as rock so the board edge
	// gets no spurious rim. Used to outline rock *regions* rather than cells.
	private isRock(world: ReturnType<typeof getWorld>, c: number, r: number): boolean {
		if (c < 0 || r < 0 || c >= GRID.cols || r >= GRID.rows) return true
		const peg = world.pegById.get(`peg:${c},${r}`)
		return !!peg?.blocked
	}

	private outOfBoard(c: number, r: number): boolean {
		return c < 0 || r < 0 || c >= GRID.cols || r >= GRID.rows
	}

	// Rock as a filled grey landmass (adjacent cells merge into one mass) with an
	// ink rim drawn ONLY on edges facing open space — so rock reads like a tldraw
	// grey rectangle with a hand-inked outline, not a field of tiles. Top edges get
	// a lighter bevel. `px` is omitted when extremely far out (rims sub-pixel).
	private renderRocks(
		ctx: CanvasRenderingContext2D,
		world: ReturnType<typeof getWorld>,
		c0: number,
		c1: number,
		r0: number,
		r1: number,
		px?: (n: number) => number
	) {
		const size = GRID.spacing
		ctx.globalAlpha = 0.9
		ctx.fillStyle = C.rockFill
		for (let r = r0; r <= r1; r++) {
			for (let c = c0; c <= c1; c++) {
				if (this.isRock(world, c, r) && !this.outOfBoard(c, r)) {
					const x = GRID.x0 + c * GRID.spacing
					const y = GRID.y0 + r * GRID.spacing
					ctx.fillRect(x - size / 2, y - size / 2, size, size)
				}
			}
		}
		ctx.globalAlpha = 1
		if (!px) return
		const h = size / 2
		const rim = new Path2D()
		const top = new Path2D()
		for (let r = r0; r <= r1; r++) {
			for (let c = c0; c <= c1; c++) {
				if (!this.isRock(world, c, r) || this.outOfBoard(c, r)) continue
				const x = GRID.x0 + c * GRID.spacing
				const y = GRID.y0 + r * GRID.spacing
				if (!this.isRock(world, c, r - 1)) {
					top.moveTo(x - h, y - h)
					top.lineTo(x + h, y - h)
				}
				if (!this.isRock(world, c, r + 1)) {
					rim.moveTo(x - h, y + h)
					rim.lineTo(x + h, y + h)
				}
				if (!this.isRock(world, c - 1, r)) {
					rim.moveTo(x - h, y - h)
					rim.lineTo(x - h, y + h)
				}
				if (!this.isRock(world, c + 1, r)) {
					rim.moveTo(x + h, y - h)
					rim.lineTo(x + h, y + h)
				}
			}
		}
		ctx.lineWidth = px(1.2)
		ctx.globalAlpha = 0.4
		ctx.strokeStyle = C.ink
		ctx.stroke(rim)
		ctx.globalAlpha = 0.5
		ctx.strokeStyle = C.rockHi
		ctx.stroke(top)
		ctx.globalAlpha = 1
	}

	private renderBoard(
		ctx: CanvasRenderingContext2D,
		world: ReturnType<typeof getWorld>,
		inView: (x: number, y: number) => boolean,
		c0: number,
		c1: number,
		r0: number,
		r1: number,
		px: (n: number) => number,
		zoom: number,
		frame: number
	): void {
		const size = GRID.spacing
		const t = smoothstep(LOD_LO, LOD_HI, zoom) // 0 far → 1 near

		// Rock landmasses, under everything (rim only once we're not extremely far).
		this.renderRocks(ctx, world, c0, c1, r0, r1, zoom >= 0.18 ? px : undefined)

		// Territory FILL squares — the far-zoom read: owned cells tile to fill the
		// space. Fades out as the mesh fades in.
		if (t < 0.995) {
			for (let r = r0; r <= r1; r++) {
				for (let c = c0; c <= c1; c++) {
					const peg = world.pegById.get(`peg:${c},${r}`)
					if (!peg || peg.blocked) continue
					const owner = pegOwner(peg)
					if (!owner) continue
					const a = (0.3 + 0.55 * chargeStrength(peg, owner)) * (1 - t)
					if (a < 0.01) continue
					ctx.globalAlpha = a
					ctx.fillStyle = coreColor(owner)
					ctx.fillRect(peg.x - size / 2, peg.y - size / 2, size, size)
				}
			}
			ctx.globalAlpha = 1
		}

		// Vines — the mesh, rendered with tldraw's own freehand (getStroke) so each
		// vine is a filled brush stroke with rounded caps, not a plotted polyline.
		// They keep a gentle hand-drawn wiggle (from makeStrand). STROKE WIDTH scales
		// gently with subtree size (trunks fatter, leaves hairline) so chokes stay
		// legible. The whole mesh fades in with `t`. There is NO on-canvas hover cue;
		// the only "can't cut" feedback is the not-allowed cursor.
		if (t > 0.01) {
			const witherRgb = parseRgb(C.wither)
			const greyRgb = parseRgb(C.ink) // muted target for out-of-reach enemy vines
			const slicing = world.slicing
			// Trunk emphasis grows with zoom: leaves stay ~1px at every zoom, but the
			// fat-trunk bonus ramps up as you zoom in (where you actually cut), so the
			// chokes pop clearly up close while the zoomed-out mesh stays even/legible.
			const trunkAmp = 0.5 + 1.7 * smoothstep(0.5, 1.4, zoom)
			for (const strand of world.strands) {
				const c = strand.cell % GRID.cols
				const r = (strand.cell / GRID.cols) | 0
				if (c < c0 - 1 || c > c1 + 1 || r < r0 - 1 || r > r1 + 1) continue
				const owner = strand.owner
				let width = owner
					? Math.min(
							11,
							1 + trunkAmp * THICKNESS_SCALE * Math.log(Math.max(1, vineSubtreeSize(world, strand)))
						)
					: 1
				// Contextual cue: while a cut is in progress, ENEMY ('b') vines the
				// player can't reach are greyed — the SAME hasPresence-at-midpoint test
				// sliceCut refuses, so the greyed set matches the set the cut rejects.
				let greyed = false
				if (slicing && owner === 'b') {
					const m = strand.points[(strand.points.length / 2) | 0]
					greyed = !hasPresence(world, 'a', m)
				}
				let alpha: number
				if (owner) {
					const pa = strand.aId ? world.pegById.get(strand.aId) : null
					const pb = strand.bId ? world.pegById.get(strand.bId) : null
					const charge = Math.max(pa ? pa.charge[owner] : 0, pb ? pb.charge[owner] : 0)
					const wither = 1 - Math.min(1, charge / CLAIM_CHARGE)
					if (wither > 0.02) {
						width = width + (1 - width) * wither
						alpha = 0.5
						ctx.fillStyle = lerpColor(parseRgb(coreColor(owner)), witherRgb, wither)
					} else if (greyed) {
						alpha = 0.5
						ctx.fillStyle = desaturate(parseRgb(coreColor(owner)), greyRgb)
					} else {
						alpha = 0.92
						ctx.fillStyle = coreColor(owner)
					}
				} else {
					width = 1
					alpha = 0.45
					ctx.fillStyle = C.neutral
				}
				ctx.globalAlpha = alpha * t
				strokeVine(ctx, strand.points, px(width))
			}
			ctx.globalAlpha = 1
		}

		// Nodes — owner-colored beads at owned pegs, ON TOP of the mesh. They bloom
		// (grow) and fade as you zoom OUT, suffusing into the fill squares; near zoom
		// they settle into small crisp dots. This is the smooth hand-off between the
		// dot/mesh read and the square fill.
		if (t > 0.03) {
			const rad = px(1.8 + 4 * (1 - t))
			for (let r = r0; r <= r1; r++) {
				for (let c = c0; c <= c1; c++) {
					const peg = world.pegById.get(`peg:${c},${r}`)
					if (!peg) continue
					const owner = pegOwner(peg)
					if (!owner) continue
					const a = (0.5 + 0.45 * chargeStrength(peg, owner)) * t
					if (a < 0.01) continue
					ctx.globalAlpha = a
					ctx.fillStyle = coreColor(owner)
					ctx.beginPath()
					ctx.arc(peg.x, peg.y, rad, 0, Math.PI * 2)
					ctx.fill()
				}
			}
			ctx.globalAlpha = 1
		}

		// Growth buds — the active tendril frontier: a pulsing tldraw-yellow bud in a
		// soft owner-tinted halo, so the growing edge reads warm and alive. Fades in
		// with the mesh. Culled to visible cells.
		if (t > 0.05) {
			for (const tip of world.tips) {
				const peg = world.pegById.get(tip.pegId)
				if (!peg || peg.col < c0 - 1 || peg.col > c1 + 1 || peg.row < r0 - 1 || peg.row > r1 + 1) {
					continue
				}
				const pulse = 0.6 + 0.4 * Math.sin(frame * 0.12)
				ctx.globalAlpha = 0.35 * pulse * t
				ctx.fillStyle = coreColor(tip.owner)
				ctx.beginPath()
				ctx.arc(peg.x, peg.y, px(4.5), 0, Math.PI * 2)
				ctx.fill()
				ctx.globalAlpha = 0.95 * t
				ctx.fillStyle = C.tip
				ctx.beginPath()
				ctx.arc(peg.x, peg.y, px(2.2), 0, Math.PI * 2)
				ctx.fill()
			}
			ctx.globalAlpha = 1
		}

		// Sparks — only when zoomed in close. Bright motes drifting the live mesh.
		if (zoom >= VINE_ZOOM) {
			for (const spark of world.sparks) {
				const strand = world.strandById.get(spark.strandId)
				if (!strand) continue
				const c = strand.cell % GRID.cols
				const r = (strand.cell / GRID.cols) | 0
				if (c < c0 - 1 || c > c1 + 1 || r < r0 - 1 || r > r1 + 1) continue
				const p = sparkPos(strand, spark.dir, spark.dist)
				const flick = 0.6 + 0.4 * Math.sin(frame * 0.4 + spark.dist * 0.1)
				ctx.globalAlpha = 0.5 * flick
				ctx.fillStyle = coreColor(spark.owner)
				ctx.beginPath()
				ctx.arc(p.x, p.y, px(5), 0, Math.PI * 2)
				ctx.fill()
				ctx.globalAlpha = 0.9
				ctx.fillStyle = C.spark
				ctx.beginPath()
				ctx.arc(p.x, p.y, px(1.8), 0, Math.PI * 2)
				ctx.fill()
			}
			ctx.globalAlpha = 1
		}

		// Cut flashes — an obvious "snip" pop at each severed vine: a crisp ink ring
		// that scale-pops out fast then fades, plus a central burst. (Cuts only land
		// at high zoom, so these only appear over the mesh.)
		for (const flash of world.flashes) {
			const c = flash.cell % GRID.cols
			const r = (flash.cell / GRID.cols) | 0
			if (c < c0 - 1 || c > c1 + 1 || r < r0 - 1 || r > r1 + 1) continue
			const at = Math.min(1, (world.tick - flash.born) / CUT_FLASH_TICKS) // 0..1 over life
			const ease = 1 - (1 - at) * (1 - at)
			const fade = 1 - at
			ctx.globalAlpha = Math.min(1, 0.8 * fade)
			ctx.strokeStyle = C.flash
			ctx.lineWidth = px(3 * fade + 0.5)
			ctx.beginPath()
			ctx.arc(flash.x, flash.y, px(4 + 16 * ease), 0, Math.PI * 2)
			ctx.stroke()
			ctx.globalAlpha = Math.min(1, 0.85 * fade * fade)
			ctx.fillStyle = C.flash
			ctx.beginPath()
			ctx.arc(flash.x, flash.y, px(5 * fade), 0, Math.PI * 2)
			ctx.fill()
		}
		ctx.globalAlpha = 1

		// (The cut swipe is drawn by tldraw's built-in scribble overlay, driven via
		// editor.scribbles from the example — nothing to draw here.)

		// Cores with HP rings, on top. Size eases from page-fixed (far, so it stays a
		// readable landmark) to screen-fixed (near, so the HP arc is legible).
		const coreR = size * 0.8 + (px(12) - size * 0.8) * t
		const ringW = size * 0.22 + (px(4) - size * 0.22) * t
		for (const owner of ['a', 'b'] as Owner[]) {
			const peg = world.pegById.get(world.sources[owner])
			if (!peg) continue
			if (t > 0.5 && !inView(peg.x, peg.y)) continue
			drawCore(ctx, peg.x, peg.y, coreR, ringW, hpFrac(world, owner), owner)
		}
		ctx.globalAlpha = 1
	}
}

// Stroke a vine as a tldraw freehand brush stroke: getStroke turns the (wiggly)
// point chain into a filled outline with rounded caps. thinning:0 keeps width
// uniform so strands don't pinch to nothing where they meet at pegs.
function strokeVine(ctx: CanvasRenderingContext2D, pts: { x: number; y: number }[], size: number) {
	const outline = getStroke(pts, { size, thinning: 0, smoothing: 0.55, streamline: 0.5 })
	if (outline.length < 2) return
	ctx.beginPath()
	ctx.moveTo(outline[0].x, outline[0].y)
	for (let i = 1; i < outline.length; i++) ctx.lineTo(outline[i].x, outline[i].y)
	ctx.closePath()
	ctx.fill()
}

// Parse #rgb / #rrggbb / rgb()/rgba() to [r,g,b]. Used for the wither color lerp.
function parseRgb(color: string): [number, number, number] {
	const s = color.trim()
	if (s[0] === '#') {
		const h = s.slice(1)
		if (h.length === 3) {
			return [parseInt(h[0] + h[0], 16), parseInt(h[1] + h[1], 16), parseInt(h[2] + h[2], 16)]
		}
		return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]
	}
	const m = s.match(/(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/)
	return m ? [+m[1], +m[2], +m[3]] : [255, 255, 255]
}

// Lerp between two colors by t (0..1). Used only for withering vines (a small,
// culled subset), so the per-call cost is negligible.
function lerpColor(
	from: [number, number, number],
	to: [number, number, number],
	t: number
): string {
	const m = (a: number, b: number) => Math.round(a + (b - a) * t)
	return `rgb(${m(from[0], to[0])}, ${m(from[1], to[1])}, ${m(from[2], to[2])})`
}

// Desaturate `color` toward its own luminance, then blend halfway toward the
// muted theme `grey` — the "not a target" look for out-of-reach enemy vines.
// Readable but clearly dimmed, and distinct from the wither tint.
function desaturate(color: [number, number, number], grey: [number, number, number]): string {
	const lum = 0.3 * color[0] + 0.59 * color[1] + 0.11 * color[2]
	return lerpColor([lum, lum, lum], grey, 0.5)
}

// HP fraction [0..1] for a core.
function hpFrac(world: ReturnType<typeof getWorld>, owner: Owner): number {
	return Math.max(0, Math.min(1, world.coreHp[owner] / CORE_HP))
}

// Draw a core as a tldraw-style shape: a filled square in the owner color with a
// hand-inked outline, ringed by an HP arc (full circle at full HP, shrinking and
// turning red as HP drops). `radius` is the square half-size, `ringW` the HP-ring
// stroke width — both already in page units.
function drawCore(
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	radius: number,
	ringW: number,
	hp: number,
	owner: Owner
) {
	const col = coreColor(owner)

	ctx.globalAlpha = 1
	ctx.fillStyle = col
	ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2)
	ctx.lineWidth = Math.max(1, ringW * 0.4)
	ctx.strokeStyle = C.ink
	ctx.globalAlpha = 0.85
	ctx.strokeRect(x - radius, y - radius, radius * 2, radius * 2)

	const rr = radius * 2
	ctx.lineWidth = ringW
	ctx.globalAlpha = 0.18
	ctx.strokeStyle = C.ink
	ctx.beginPath()
	ctx.arc(x, y, rr, 0, Math.PI * 2)
	ctx.stroke()
	ctx.globalAlpha = 1
	ctx.strokeStyle = hp > 0.3 ? col : C.danger
	ctx.beginPath()
	ctx.arc(x, y, rr, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * hp)
	ctx.stroke()
	ctx.globalAlpha = 1
}
