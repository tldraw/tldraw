import { DEFAULT_THEME, OverlayUtil, TLOverlay } from 'tldraw'
import { CRAFT_MS, TILE } from '../constants'
import { frame$, world } from '../game-state'
import { samplePath } from '../path'
import { sketchRoundRect } from '../sketch'

interface TLTrainOverlay extends TLOverlay {
	props: { frame: number }
}

const LOCO_LEN = TILE * 1.25
const WAGON_LEN = TILE * 1.15
const GAP = TILE * 0.2
const BODY_H = TILE * 0.6

// Draw a car centred on a sampled path point, rotated to the track heading.
function drawCar(
	ctx: CanvasRenderingContext2D,
	s: number,
	len: number,
	fill: string,
	stroke: string,
	zoom: number,
	body: (ctx: CanvasRenderingContext2D) => void
) {
	const p = samplePath(world.path, s)
	ctx.save()
	ctx.translate(p.x, p.y)
	ctx.rotate(p.angle)
	sketchRoundRect(ctx, -len / 2, -BODY_H / 2, len, BODY_H, TILE * 0.12)
	ctx.fillStyle = fill
	ctx.fill()
	ctx.strokeStyle = stroke
	ctx.stroke()
	// Wheels.
	ctx.fillStyle = '#2a2a2a'
	for (const wx of [-len / 2 + TILE * 0.28, len / 2 - TILE * 0.28]) {
		ctx.beginPath()
		ctx.arc(wx, BODY_H / 2, TILE * 0.11, 0, Math.PI * 2)
		ctx.fill()
	}
	body(ctx)
	ctx.restore()
}

export class TrainOverlayUtil extends OverlayUtil<TLTrainOverlay> {
	static override type = 'unrailed-train'
	override options = { zIndex: 200 }

	override isActive(): boolean {
		return true
	}

	override getOverlays(): TLTrainOverlay[] {
		return [{ id: 'unrailed-train:main', type: 'unrailed-train', props: { frame: frame$.get() } }]
	}

	override render(ctx: CanvasRenderingContext2D): void {
		const zoom = this.editor.getZoomLevel()
		const isDark = this.editor.getColorMode() === 'dark'
		const theme = isDark ? DEFAULT_THEME.colors.dark : DEFAULT_THEME.colors.light
		ctx.save()
		ctx.lineWidth = 2.5 / zoom
		ctx.lineJoin = 'round'

		// Crafting wagon (trails the locomotive).
		const wagonS = world.trainS - LOCO_LEN - GAP - WAGON_LEN / 2
		drawCar(
			ctx,
			wagonS,
			WAGON_LEN,
			theme.orange.solid,
			isDark ? '#a1591a' : '#b8651b',
			zoom,
			(c) => {
				const t = Math.max(0, Math.min(1, world.craftT / CRAFT_MS))
				const bw = WAGON_LEN - TILE * 0.24
				c.fillStyle = isDark ? 'rgba(0,0,0,0.35)' : 'rgba(255,255,255,0.55)'
				c.fillRect(-bw / 2, BODY_H * 0.1, bw, BODY_H * 0.2)
				c.fillStyle = theme.yellow.solid
				c.fillRect(-bw / 2, BODY_H * 0.1, bw * t, BODY_H * 0.2)
			}
		)

		// Locomotive (front).
		const locoS = world.trainS - LOCO_LEN / 2
		drawCar(ctx, locoS, LOCO_LEN, theme.blue.solid, isDark ? '#2c44a8' : '#2f4bc4', zoom, (c) => {
			c.fillStyle = isDark ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.85)'
			c.fillRect(-LOCO_LEN * 0.1, -BODY_H * 0.2, TILE * 0.3, TILE * 0.24)
			c.fillStyle = isDark ? '#1f2d6e' : '#26389c'
			c.fillRect(LOCO_LEN * 0.22, -BODY_H / 2 - TILE * 0.2, TILE * 0.16, TILE * 0.22)
		})

		// Smoke puffs above the locomotive front.
		const front = samplePath(world.path, world.trainS)
		const f = frame$.get()
		for (let i = 0; i < 3; i++) {
			const t = (f * 0.04 + i * 0.6) % 1.8
			ctx.globalAlpha = Math.max(0, 0.4 - t * 0.22)
			ctx.beginPath()
			ctx.arc(
				front.x - t * TILE * 0.4,
				front.y - TILE * 0.45 - t * TILE * 0.6,
				TILE * (0.1 + t * 0.12),
				0,
				Math.PI * 2
			)
			ctx.fillStyle = isDark ? '#cfd4e0' : '#9aa1b2'
			ctx.fill()
		}
		ctx.globalAlpha = 1
		ctx.restore()
	}
}
