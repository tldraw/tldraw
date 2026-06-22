import { DEFAULT_THEME, OverlayUtil, TLOverlay } from 'tldraw'
import { ROWS, TILE } from '../constants'
import { frame$, tileKey, world } from '../game-state'
import { sketchBlob, variantFor } from '../sketch'

interface TLTerrainOverlay extends TLOverlay {
	props: { frame: number }
}

const BROWN = '#8a5a2b'

export class TerrainOverlayUtil extends OverlayUtil<TLTerrainOverlay> {
	static override type = 'unrailed-terrain'
	override options = { zIndex: 50 }

	override isActive(): boolean {
		return true
	}

	override getOverlays(): TLTerrainOverlay[] {
		return [
			{ id: 'unrailed-terrain:main', type: 'unrailed-terrain', props: { frame: frame$.get() } },
		]
	}

	override render(ctx: CanvasRenderingContext2D): void {
		const zoom = this.editor.getZoomLevel()
		const isDark = this.editor.getColorMode() === 'dark'
		const theme = isDark ? DEFAULT_THEME.colors.dark : DEFAULT_THEME.colors.light

		// Visible column window, derived from the train front.
		const trainCol = Math.floor(world.trainS / TILE)
		const minCol = trainCol - 10
		const maxCol = trainCol + 32

		// Faint grid (grass itself is the canvas background, see unrailed.css).
		ctx.save()
		ctx.lineWidth = 1 / zoom
		ctx.strokeStyle = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'
		ctx.beginPath()
		for (let c = minCol; c <= maxCol; c++) {
			ctx.moveTo(c * TILE, 0)
			ctx.lineTo(c * TILE, ROWS * TILE)
		}
		for (let r = 0; r <= ROWS; r++) {
			ctx.moveTo(minCol * TILE, r * TILE)
			ctx.lineTo(maxCol * TILE, r * TILE)
		}
		ctx.stroke()
		ctx.restore()

		// Water tiles.
		ctx.save()
		for (const w of world.water.values()) {
			if (w.col < minCol || w.col > maxCol) continue
			const bridged = world.bridged.has(tileKey(w.col, w.row))
			ctx.globalAlpha = bridged ? 0.35 : 1
			ctx.fillStyle = isDark ? '#2a4d6e' : theme.blue.semi
			ctx.fillRect(w.col * TILE, w.row * TILE, TILE, TILE)
			ctx.fillStyle = isDark ? 'rgba(180,210,240,0.25)' : 'rgba(80,130,190,0.35)'
			ctx.fillRect(w.col * TILE + TILE * 0.12, w.row * TILE + TILE * 0.4, TILE * 0.76, 2 / zoom)
		}
		ctx.globalAlpha = 1
		ctx.restore()

		// Trees and rocks.
		ctx.save()
		ctx.lineWidth = 2 / zoom
		ctx.lineJoin = 'round'
		for (const ob of world.obstacles.values()) {
			if (ob.col < minCol || ob.col > maxCol) continue
			const cx = (ob.col + 0.5) * TILE
			const cy = (ob.row + 0.5) * TILE
			const variant = variantFor(`${ob.col},${ob.row}`)
			if (ob.kind === 'tree') {
				ctx.fillStyle = BROWN
				ctx.fillRect(cx - TILE * 0.06, cy, TILE * 0.12, TILE * 0.32)
				sketchBlob(ctx, cx, cy - TILE * 0.06, TILE * 0.34, variant)
				ctx.fillStyle = isDark ? '#2f7d4f' : theme.green.solid
				ctx.fill()
				ctx.strokeStyle = isDark ? '#1f5236' : '#2f7d4f'
				ctx.stroke()
			} else {
				sketchBlob(ctx, cx, cy + TILE * 0.04, TILE * 0.3, variant)
				ctx.fillStyle = theme.grey.solid
				ctx.fill()
				ctx.strokeStyle = isDark ? '#3a3a3a' : '#6b6b6b'
				ctx.stroke()
			}
		}
		ctx.restore()
	}
}
