import { OverlayUtil, TLOverlay } from 'tldraw'
import { CELL_SIZE, COLS, ROWS, visGrid } from '../fog'
import { fogVersion$ } from '../game-state'
import { MAP_BOUNDS } from '../map'

interface TLFogOverlay extends TLOverlay {
	props: {
		// Returned fresh each tick so the OverlayManager's computed cache breaks
		// and render() runs again.
		version: number
	}
}

// Single full-map fog overlay. Reads the visibility grid (mutated in place by
// fog.ts each game tick) and paints translucent dark rectangles over explored
// cells, opaque dark over unexplored ones, and nothing over visible cells.
export class FogOverlayUtil extends OverlayUtil<TLFogOverlay> {
	// Above all game objects so it covers enemy units / buildings hidden by
	// fog, but below interactive UI overlays (drag select, placement preview).
	static override type = 'tlc-fog'
	override options = { zIndex: 500 }

	override isActive(): boolean {
		// Always render so unexplored cells stay dark from the start.
		return true
	}

	override getOverlays(): TLFogOverlay[] {
		return [{ id: 'tlc-fog:main', type: 'tlc-fog', props: { version: fogVersion$.get() } }]
	}

	override render(ctx: CanvasRenderingContext2D): void {
		// Skip cells outside the camera viewport so we don't pay per-cell
		// fillRect costs for the whole map. The Canvas2D ctx is already in page
		// space; we walk visible cells only.
		const vp = this.editor.getViewportPageBounds()
		const c0 = Math.max(0, Math.floor((vp.minX - MAP_BOUNDS.minX) / CELL_SIZE))
		const c1 = Math.min(COLS, Math.ceil((vp.maxX - MAP_BOUNDS.minX) / CELL_SIZE))
		const r0 = Math.max(0, Math.floor((vp.minY - MAP_BOUNDS.minY) / CELL_SIZE))
		const r1 = Math.min(ROWS, Math.ceil((vp.maxY - MAP_BOUNDS.minY) / CELL_SIZE))
		ctx.save()
		// Two passes — opaque then semi — so we can batch fillRect calls per
		// alpha (no globalAlpha thrash mid-loop).
		ctx.fillStyle = '#0b0f14'
		for (let row = r0; row < r1; row++) {
			const yPx = MAP_BOUNDS.minY + row * CELL_SIZE
			const rowOffset = row * COLS
			for (let col = c0; col < c1; col++) {
				if (visGrid[rowOffset + col] !== 0) continue
				ctx.fillRect(MAP_BOUNDS.minX + col * CELL_SIZE, yPx, CELL_SIZE, CELL_SIZE)
			}
		}
		ctx.fillStyle = 'rgba(11, 15, 20, 0.55)'
		for (let row = r0; row < r1; row++) {
			const yPx = MAP_BOUNDS.minY + row * CELL_SIZE
			const rowOffset = row * COLS
			for (let col = c0; col < c1; col++) {
				if (visGrid[rowOffset + col] !== 1) continue
				ctx.fillRect(MAP_BOUNDS.minX + col * CELL_SIZE, yPx, CELL_SIZE, CELL_SIZE)
			}
		}
		ctx.restore()
	}

	override renderMinimap(ctx: CanvasRenderingContext2D): void {
		// Paint the same fog onto the minimap so the player's view of the map
		// is consistent across both surfaces. The minimap ctx is already in
		// page space; full-map walk is fine here.
		ctx.save()
		ctx.fillStyle = '#0b0f14'
		for (let row = 0; row < ROWS; row++) {
			const yPx = MAP_BOUNDS.minY + row * CELL_SIZE
			const rowOffset = row * COLS
			for (let col = 0; col < COLS; col++) {
				if (visGrid[rowOffset + col] !== 0) continue
				ctx.fillRect(MAP_BOUNDS.minX + col * CELL_SIZE, yPx, CELL_SIZE, CELL_SIZE)
			}
		}
		ctx.fillStyle = 'rgba(11, 15, 20, 0.55)'
		for (let row = 0; row < ROWS; row++) {
			const yPx = MAP_BOUNDS.minY + row * CELL_SIZE
			const rowOffset = row * COLS
			for (let col = 0; col < COLS; col++) {
				if (visGrid[rowOffset + col] !== 1) continue
				ctx.fillRect(MAP_BOUNDS.minX + col * CELL_SIZE, yPx, CELL_SIZE, CELL_SIZE)
			}
		}
		ctx.restore()
	}
}
