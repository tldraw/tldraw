import { useEffect, useRef } from 'react'
import { DEFAULT_THEME, useEditor } from 'tldraw'
import { Player, Segment, castColumns, projectToCamera } from './engine'
import { enemies$, getWorld, walls$ } from './game-state'
import { Enemy } from './sim'
import { sketchCircle } from './sketch'

// A picture-in-picture first-person view of the same world the top-down game
// runs in. It raycasts the wall segments and billboards the enemies, looking
// wherever the player is moving — no separate controls. This is the payoff of
// keeping the simulation renderer-agnostic: the FP view is just a second
// renderer over the same `Player` + `Segment[]` data.

const W = 380
const H = 230
const COLUMNS = 130
const COL_W = W / COLUMNS
// Wall apparent height = WALL_K / depth, so a wall ~70 units away fills the view.
const WALL_K = H * 70
// Enemy sprite diameter = SPRITE_K * radius / depth. Tuned so a close enemy
// (~70 units away, radius 14) is about half the view tall, and one at the
// spawn ring (~720 units) is still a clearly visible blob, not a speck.
const SPRITE_K = 560

function renderScene(
	ctx: CanvasRenderingContext2D,
	player: Player,
	walls: Segment[],
	enemies: Enemy[],
	isDark: boolean
) {
	const theme = isDark ? DEFAULT_THEME.colors.dark : DEFAULT_THEME.colors.light
	const horizon = H * 0.5

	// Ceiling/sky and floor.
	ctx.fillStyle = theme.blue.semi
	ctx.fillRect(0, 0, W, horizon)
	ctx.fillStyle = theme.grey.semi
	ctx.fillRect(0, horizon, W, H - horizon)

	// Perspective floor lines for a sense of ground and speed.
	ctx.strokeStyle = theme.grey.solid
	ctx.globalAlpha = 0.18
	ctx.lineWidth = 1
	for (let i = 1; i <= 6; i++) {
		const y = horizon + (H - horizon) * (i / 7) ** 2
		ctx.beginPath()
		ctx.moveTo(0, y)
		ctx.lineTo(W, y)
		ctx.stroke()
	}
	ctx.globalAlpha = 1

	// Wall columns, with a per-column depth buffer for sprite occlusion.
	const columns = castColumns(player, walls, COLUMNS)
	const zbuffer = new Array<number>(COLUMNS)
	for (let i = 0; i < COLUMNS; i++) {
		const col = columns[i]
		zbuffer[i] = col.dist
		if (col.dist === Infinity) continue
		const h = Math.min(H, WALL_K / col.dist)
		const y = horizon - h / 2
		const x = i * COL_W
		ctx.fillStyle = theme.grey.solid
		ctx.fillRect(x, y, COL_W + 1, h)
		// Fog with distance + darken grazing faces, so corners read.
		const shade = Math.min(0.72, (col.dist / 1000) * 0.72 + col.faceShade * 0.28)
		ctx.fillStyle = `rgba(0,0,0,${shade})`
		ctx.fillRect(x, y, COL_W + 1, h)
	}

	// Billboard the enemies: project, drop the ones behind us, draw far-to-near.
	const sprites = enemies
		.map((e) => ({ e, ...projectToCamera(player, e.x, e.y) }))
		.filter((s) => s.depth > 0.5)
		.sort((a, b) => b.depth - a.depth)

	ctx.lineJoin = 'round'
	for (const s of sprites) {
		const screenX = (W / 2) * (1 + s.lateral / s.depth)
		const col = Math.floor(screenX / COL_W)
		// Hidden behind a nearer wall.
		if (col >= 0 && col < COLUMNS && s.depth > zbuffer[col]) continue

		const size = Math.min(H * 1.4, (SPRITE_K * s.e.radius) / s.depth)
		// Stand the sprite on the floor: its base sits a touch below the horizon.
		const cy = horizon + size * 0.12
		sketchCircle(ctx, screenX, cy, size / 2, s.e.id)
		ctx.fillStyle = theme.red.semi
		ctx.fill()
		ctx.lineWidth = Math.max(1, size * 0.04)
		ctx.strokeStyle = theme.red.solid
		ctx.stroke()
	}

	// Crosshair.
	ctx.strokeStyle = theme.text
	ctx.globalAlpha = 0.4
	ctx.lineWidth = 1.5
	ctx.beginPath()
	ctx.moveTo(W / 2 - 6, horizon)
	ctx.lineTo(W / 2 + 6, horizon)
	ctx.moveTo(W / 2, horizon - 6)
	ctx.lineTo(W / 2, horizon + 6)
	ctx.stroke()
	ctx.globalAlpha = 1
}

export function RaycastView() {
	const editor = useEditor()
	const canvasRef = useRef<HTMLCanvasElement>(null)

	useEffect(() => {
		const canvas = canvasRef.current
		if (!canvas) return
		const ctx = canvas.getContext('2d')
		if (!ctx) return
		const dpr = Math.min(2, window.devicePixelRatio || 1)
		canvas.width = W * dpr
		canvas.height = H * dpr
		ctx.scale(dpr, dpr)

		// Redraw each tick, after the sim has stepped this frame.
		const draw = () => {
			renderScene(
				ctx,
				getWorld().player,
				walls$.get(),
				enemies$.get(),
				editor.getColorMode() === 'dark'
			)
		}
		editor.on('tick', draw)
		return () => {
			editor.off('tick', draw)
		}
	}, [editor])

	return (
		<div className="vs-fp">
			<span className="vs-fp__label">First person</span>
			<canvas ref={canvasRef} style={{ width: W, height: H }} />
		</div>
	)
}
