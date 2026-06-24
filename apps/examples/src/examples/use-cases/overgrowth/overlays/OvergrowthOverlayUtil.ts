import { DEFAULT_THEME, OverlayUtil, TLOverlay } from 'tldraw'
import {
	CORE_HP,
	CUT_FLASH_TICKS,
	frame$,
	getWorld,
	GRID,
	hoveredVine$,
	Owner,
	pegOwner,
	PLAYER_COLOR,
	THICKNESS_SCALE,
} from '../game-state'
import { chargeStrength, sparkPos, vineSubtreeSize } from '../sim'

interface TLOvergrowthOverlay extends TLOverlay {
	props: { frame: number }
}

type ThemeColors = (typeof DEFAULT_THEME.colors)['light']

// ============================================================================
// LEVEL-OF-DETAIL thresholds (zoom level = page units per screen unit; tldraw
// zoom < 1 is zoomed out, > 1 is zoomed in).
//   below HEATMAP_ZOOM        → heatmap only (filled cells, no lines/sparks)
//   between HEATMAP and VINE  → thin vine lines, no sparks
//   above VINE_ZOOM           → vines + animated sparks
// ============================================================================
const HEATMAP_ZOOM = 0.32
const VINE_ZOOM = 0.85

// Render everything for the board on one canvas layer, culled to the viewport
// and switched by zoom LOD. The overlay's `frame` prop is bumped each tick so
// this re-runs every frame against live world state.
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
		const zoom = editor.getZoomLevel()
		const px = (n: number) => n / zoom // keep stroke/size constant on screen
		const theme =
			editor.getColorMode() === 'dark' ? DEFAULT_THEME.colors.dark : DEFAULT_THEME.colors.light
		const world = getWorld()
		const frame = frame$.get()

		const colorOf = (owner: Owner) =>
			(theme[PLAYER_COLOR[owner] as keyof ThemeColors] as { solid: string }).solid

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

		// Visible grid column/row range, so peg/heatmap loops only touch on-screen
		// cells instead of all 3600 pegs.
		const c0 = Math.max(0, Math.floor((minX - GRID.x0) / GRID.spacing))
		const c1 = Math.min(GRID.cols - 1, Math.ceil((maxX - GRID.x0) / GRID.spacing))
		const r0 = Math.max(0, Math.floor((minY - GRID.y0) / GRID.spacing))
		const r1 = Math.min(GRID.rows - 1, Math.ceil((maxY - GRID.y0) / GRID.spacing))

		if (zoom < HEATMAP_ZOOM) {
			this.renderHeatmap(ctx, world, c0, c1, r0, r1, colorOf, theme)
		} else {
			this.renderDetailed(ctx, world, inView, c0, c1, r0, r1, px, zoom, frame, colorOf, theme)
		}
	}

	// --- zoomed FAR OUT: territory as a colored heatmap, one filled cell per
	// owned peg, tinted by owner + strength. No vines, no sparks. ---
	private renderHeatmap(
		ctx: CanvasRenderingContext2D,
		world: ReturnType<typeof getWorld>,
		c0: number,
		c1: number,
		r0: number,
		r1: number,
		colorOf: (o: Owner) => string,
		theme: ThemeColors
	) {
		const size = GRID.spacing
		// Obstacles first: solid dark rock cells (visible window only).
		ctx.globalAlpha = 1
		ctx.fillStyle = rockColor(theme)
		for (let r = r0; r <= r1; r++) {
			for (let c = c0; c <= c1; c++) {
				const peg = world.pegById.get(`peg:${c},${r}`)
				if (peg?.blocked) ctx.fillRect(peg.x - size / 2, peg.y - size / 2, size, size)
			}
		}
		// Territory tint.
		for (let r = r0; r <= r1; r++) {
			for (let c = c0; c <= c1; c++) {
				const peg = world.pegById.get(`peg:${c},${r}`)
				if (!peg || peg.blocked) continue
				const owner = pegOwner(peg)
				if (!owner) continue
				const strength = chargeStrength(peg, owner)
				ctx.globalAlpha = 0.25 + 0.6 * strength
				ctx.fillStyle = colorOf(owner)
				ctx.fillRect(peg.x - size / 2, peg.y - size / 2, size, size)
			}
		}
		ctx.globalAlpha = 1

		// Cores with HP rings — readable even zoomed all the way out (the win-read).
		for (const owner of ['a', 'b'] as Owner[]) {
			const peg = world.pegById.get(world.sources[owner])
			if (!peg) continue
			drawCore(
				ctx,
				peg.x,
				peg.y,
				size * 1.1,
				size * 0.22,
				hpFrac(world, owner),
				colorOf(owner),
				theme
			)
		}
		ctx.globalAlpha = 1
	}

	// --- MID / CLOSE zoom: vines + pegs (+ sparks only when zoomed in). ---
	private renderDetailed(
		ctx: CanvasRenderingContext2D,
		world: ReturnType<typeof getWorld>,
		inView: (x: number, y: number) => boolean,
		c0: number,
		c1: number,
		r0: number,
		r1: number,
		px: (n: number) => number,
		zoom: number,
		frame: number,
		colorOf: (o: Owner) => string,
		theme: ThemeColors
	): void {
		// Obstacles: solid dark rock cells (visible window only), drawn under
		// everything else.
		const cell = GRID.spacing
		ctx.globalAlpha = 1
		ctx.fillStyle = rockColor(theme)
		for (let r = r0; r <= r1; r++) {
			for (let c = c0; c <= c1; c++) {
				const peg = world.pegById.get(`peg:${c},${r}`)
				if (peg?.blocked) ctx.fillRect(peg.x - cell / 2, peg.y - cell / 2, cell, cell)
			}
		}

		// Faint grid dots only at open visible cells.
		ctx.globalAlpha = 0.05
		ctx.fillStyle = theme.text
		for (let r = r0; r <= r1; r++) {
			for (let c = c0; c <= c1; c++) {
				const peg = world.pegById.get(`peg:${c},${r}`)
				if (peg?.blocked) continue
				const x = GRID.x0 + c * GRID.spacing
				const y = GRID.y0 + r * GRID.spacing
				ctx.fillRect(x - px(0.7), y - px(0.7), px(1.4), px(1.4))
			}
		}
		ctx.globalAlpha = 1

		// Owned-peg territory tint (visible cells only).
		for (let r = r0; r <= r1; r++) {
			for (let c = c0; c <= c1; c++) {
				const peg = world.pegById.get(`peg:${c},${r}`)
				if (!peg) continue
				const owner = pegOwner(peg)
				if (!owner) continue
				const strength = chargeStrength(peg, owner)
				ctx.globalAlpha = 0.16 * strength
				ctx.fillStyle = colorOf(owner)
				ctx.beginPath()
				ctx.arc(peg.x, peg.y, px(14), 0, Math.PI * 2)
				ctx.fill()
				ctx.globalAlpha = 0.5 + 0.5 * strength
				ctx.fillRect(peg.x - px(3), peg.y - px(3), px(6), px(6))
			}
		}
		ctx.globalAlpha = 1

		// Vines — culled to the viewport via each strand's cell bucket. STROKE
		// WIDTH scales with the vine's subtree size (trunks fat, leaves thin) so a
		// player can see where the chokes are. All vines render at their NORMAL full
		// color — the cuttable cue is CONTEXTUAL (only the single vine under the
		// cursor; drawn separately below). We iterate all strands but reject
		// off-screen ones with a cheap cell-range test before any work.
		ctx.lineCap = 'round'
		ctx.lineJoin = 'round'
		const widthOf = (strand: (typeof world.strands)[number]) =>
			1.6 + THICKNESS_SCALE * Math.log(1 + (strand.owner ? vineSubtreeSize(world, strand) : 1))
		for (const strand of world.strands) {
			const c = strand.cell % GRID.cols
			const r = (strand.cell / GRID.cols) | 0
			if (c < c0 - 1 || c > c1 + 1 || r < r0 - 1 || r > r1 + 1) continue
			const owner = strand.owner
			ctx.globalAlpha = owner ? 0.7 : 0.3
			ctx.strokeStyle = owner ? colorOf(owner) : theme.text
			ctx.lineWidth = px(owner ? widthOf(strand) : 1.4)
			ctx.beginPath()
			ctx.moveTo(strand.points[0].x, strand.points[0].y)
			for (let i = 1; i < strand.points.length; i++) {
				ctx.lineTo(strand.points[i].x, strand.points[i].y)
			}
			ctx.stroke()
		}
		ctx.globalAlpha = 1

		// Contextual cuttable cue — only the single vine under the cursor:
		//  • in-reach enemy vine  → redraw in a brighter blue tint (+1px): cuttable.
		//  • out-of-reach enemy   → muted/desaturated stroke + a small ✕: can't cut.
		//  • own/neutral          → no cue.
		// One vine, so at most one extra solid stroke — no per-vine cost on the map.
		const hovered = hoveredVine$.get()
		if (hovered && hovered.kind !== 'other') {
			const strand = world.strandById.get(hovered.strandId)
			if (strand && strand.owner === 'b') {
				const pts = strand.points
				const inReach = hovered.kind === 'enemy-in-reach'
				ctx.globalAlpha = inReach ? 0.95 : 0.55
				ctx.strokeStyle = inReach ? lighten(colorOf('b'), 0.55) : desaturate(colorOf('b'), theme)
				ctx.lineWidth = px(widthOf(strand) + (inReach ? 1 : 0))
				ctx.beginPath()
				ctx.moveTo(pts[0].x, pts[0].y)
				for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y)
				ctx.stroke()
				if (!inReach) {
					// Small ✕ at the vine midpoint to read as "can't cut here".
					const m = pts[(pts.length / 2) | 0]
					const s = px(5)
					ctx.globalAlpha = 0.8
					ctx.strokeStyle = theme.text
					ctx.lineWidth = px(1.5)
					ctx.beginPath()
					ctx.moveTo(m.x - s, m.y - s)
					ctx.lineTo(m.x + s, m.y + s)
					ctx.moveTo(m.x + s, m.y - s)
					ctx.lineTo(m.x - s, m.y + s)
					ctx.stroke()
				}
				ctx.globalAlpha = 1
			}
		}

		// Growth tips — small glowing buds at the active tendril frontier, pulsing
		// in time so the discrete growth waves read. Culled to visible cells.
		for (const tip of world.tips) {
			const peg = world.pegById.get(tip.pegId)
			if (!peg || peg.col < c0 - 1 || peg.col > c1 + 1 || peg.row < r0 - 1 || peg.row > r1 + 1) {
				continue
			}
			const pulse = 0.6 + 0.4 * Math.sin(frame * 0.12)
			ctx.globalAlpha = 0.5 * pulse
			ctx.fillStyle = colorOf(tip.owner)
			ctx.beginPath()
			ctx.arc(peg.x, peg.y, px(7), 0, Math.PI * 2)
			ctx.fill()
			ctx.globalAlpha = 0.9
			ctx.beginPath()
			ctx.arc(peg.x, peg.y, px(2.5), 0, Math.PI * 2)
			ctx.fill()
		}
		ctx.globalAlpha = 1

		// Sparks — only when zoomed in. Drawn for the bounded pool the runner
		// maintains; we skip any whose vine is off-screen (cheap guard).
		if (zoom >= VINE_ZOOM) {
			for (const spark of world.sparks) {
				const strand = world.strandById.get(spark.strandId)
				if (!strand) continue
				const c = strand.cell % GRID.cols
				const r = (strand.cell / GRID.cols) | 0
				if (c < c0 - 1 || c > c1 + 1 || r < r0 - 1 || r > r1 + 1) continue
				const p = sparkPos(strand, spark.dir, spark.dist)
				const flick = 0.6 + 0.4 * Math.sin(frame * 0.4 + spark.dist * 0.1)
				// Glow casing.
				ctx.globalAlpha = 0.5 * flick
				ctx.fillStyle = colorOf(spark.owner)
				ctx.beginPath()
				ctx.arc(p.x, p.y, px(5), 0, Math.PI * 2)
				ctx.fill()
				// Bright core.
				ctx.globalAlpha = 0.85
				ctx.fillStyle = theme.white.solid
				ctx.beginPath()
				ctx.arc(p.x, p.y, px(2), 0, Math.PI * 2)
				ctx.fill()
			}
			ctx.globalAlpha = 1
		}

		// Cut flashes — the subtle "snip" at each severed vine: a small bright ring
		// that quickly expands and fades, plus a brief central spark. Culled to the
		// visible cell window; ages out in the sim.
		for (const flash of world.flashes) {
			const c = flash.cell % GRID.cols
			const r = (flash.cell / GRID.cols) | 0
			if (c < c0 - 1 || c > c1 + 1 || r < r0 - 1 || r > r1 + 1) continue
			const t = Math.min(1, (world.tick - flash.born) / CUT_FLASH_TICKS) // 0..1 over life
			const fade = 1 - t
			// Expanding ring.
			ctx.globalAlpha = 0.7 * fade
			ctx.strokeStyle = theme.white.solid
			ctx.lineWidth = px(2 * fade)
			ctx.beginPath()
			ctx.arc(flash.x, flash.y, px(3 + 12 * t), 0, Math.PI * 2)
			ctx.stroke()
			// Bright central spark, fading fastest.
			ctx.globalAlpha = 0.9 * fade * fade
			ctx.fillStyle = theme.white.solid
			ctx.beginPath()
			ctx.arc(flash.x, flash.y, px(3 * fade), 0, Math.PI * 2)
			ctx.fill()
		}
		ctx.globalAlpha = 1

		// Cores with HP rings, on top of everything. Size is screen-constant (via
		// px) so the HP read stays legible. Drawn when on (or near) screen.
		for (const owner of ['a', 'b'] as Owner[]) {
			const peg = world.pegById.get(world.sources[owner])
			if (!peg || !inView(peg.x, peg.y)) continue
			drawCore(ctx, peg.x, peg.y, px(15), px(4), hpFrac(world, owner), colorOf(owner), theme)
		}
		ctx.globalAlpha = 1
	}
}

// Parse #rgb / #rrggbb / rgb()/rgba() to [r,g,b]. Only used for the single
// hovered-vine tint, so the per-call parse cost is irrelevant (≤1 vine/frame).
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

// Lighten a color toward white by fraction `t` (0..1) — the in-reach cuttable tint.
function lighten(color: string, t: number): string {
	const [r, g, b] = parseRgb(color)
	const mix = (v: number) => Math.round(v + (255 - v) * t)
	return `rgb(${mix(r)}, ${mix(g)}, ${mix(b)})`
}

// Desaturate a color toward its grey (luminance) and blend toward the theme text
// — the muted "can't cut here" treatment for an out-of-reach hovered enemy vine.
function desaturate(color: string, theme: ThemeColors): string {
	const [r, g, b] = parseRgb(color)
	const grey = Math.round(0.3 * r + 0.59 * g + 0.11 * b)
	const [tr, tg, tb] = parseRgb(theme.text)
	const mix = (c: number) => Math.round(0.5 * grey + 0.5 * c) // half grey, half toward text
	return `rgb(${mix(tr)}, ${mix(tg)}, ${mix(tb)})`
}

// HP fraction [0..1] for a core.
function hpFrac(world: ReturnType<typeof getWorld>, owner: Owner): number {
	return Math.max(0, Math.min(1, world.coreHp[owner] / CORE_HP))
}

// Dark rock color for obstacles, tuned per theme.
function rockColor(theme: ThemeColors): string {
	return theme === DEFAULT_THEME.colors.dark ? '#0c0e12' : '#3a3f47'
}

// Draw a core: a filled square in its color, ringed by an HP arc (full circle at
// full HP, shrinking as HP drops). `radius` is the core block half-size, `ringW`
// the ring stroke width — both already in page units.
function drawCore(
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	radius: number,
	ringW: number,
	hp: number,
	color: string,
	theme: ThemeColors
) {
	ctx.globalAlpha = 1
	ctx.fillStyle = color
	ctx.fillRect(x - radius * 0.7, y - radius * 0.7, radius * 1.4, radius * 1.4)
	ctx.lineWidth = ringW * 0.6
	ctx.strokeStyle = theme.background
	ctx.strokeRect(x - radius * 0.7, y - radius * 0.7, radius * 1.4, radius * 1.4)

	// HP ring: dim full-circle track + bright remaining arc (turns red when low).
	const rr = radius * 1.5
	ctx.lineWidth = ringW
	ctx.globalAlpha = 0.25
	ctx.strokeStyle = theme.text
	ctx.beginPath()
	ctx.arc(x, y, rr, 0, Math.PI * 2)
	ctx.stroke()
	ctx.globalAlpha = 1
	ctx.strokeStyle = hp > 0.3 ? color : '#ef4444'
	ctx.beginPath()
	ctx.arc(x, y, rr, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * hp)
	ctx.stroke()
	ctx.globalAlpha = 1
}
