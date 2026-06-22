import { useEffect, useRef } from 'react'
import { DEFAULT_THEME, TLThemeDefaultColors, useEditor } from 'tldraw'
import { STATION_R } from './constants'
import { getWorld } from './game-state'
import { cameraFromHeading, castColumns, Segment } from './raycast'
import { linePoints } from './sim'

// A first-person "ride the line" view. The camera sits on the lead train and
// faces its direction of travel; the walls are the station shapes already on the
// canvas, read with the same getShapeGeometry trick the 3D engine example uses.
// It's a separate canvas (the strips move every frame), but the 3D *world* is
// your real tldraw shapes — edit the map and the ride changes with it.

const W = 280
const H = 180
const COLUMNS = 90
// Wall apparent height = HEIGHT_K / distance, tuned so a station roughly a
// platform away fills the panel.
const HEIGHT_K = 14000
const FOG_DIST = 620

// The station outlines as wall segments, skipping the one the camera is inside
// (so you're not boxed in while stopped at a platform).
function buildSegments(
	editor: ReturnType<typeof useEditor>,
	camX: number,
	camY: number
): Segment[] {
	const segments: Segment[] = []
	for (const shape of editor.getCurrentPageShapes()) {
		if (shape.meta?.mm !== 'station') continue
		const bounds = editor.getShapePageBounds(shape)
		if (bounds) {
			const { x: cx, y: cy } = bounds.center
			if (Math.hypot(cx - camX, cy - camY) < STATION_R + 6) continue
		}
		const geometry = editor.getShapeGeometry(shape)
		const verts = editor.getShapePageTransform(shape).applyToPoints(geometry.vertices)
		for (let i = 0; i < verts.length; i++) {
			const a = verts[i]
			const b = verts[(i + 1) % verts.length]
			segments.push({ ax: a.x, ay: a.y, bx: b.x, by: b.y, color: 'black' })
		}
	}
	return segments
}

function RideView() {
	const editor = useEditor()
	const canvasRef = useRef<HTMLCanvasElement>(null)

	useEffect(() => {
		const canvas = canvasRef.current
		if (!canvas) return
		const ctx = canvas.getContext('2d')
		if (!ctx) return

		const dpr = window.devicePixelRatio || 1
		canvas.width = W * dpr
		canvas.height = H * dpr
		ctx.scale(dpr, dpr)

		const draw = () => {
			const theme = (
				editor.getColorMode() === 'dark' ? DEFAULT_THEME.colors.dark : DEFAULT_THEME.colors.light
			) as TLThemeDefaultColors

			// Sky over ground.
			ctx.fillStyle = theme['light-blue'].semi
			ctx.fillRect(0, 0, W, H / 2)
			ctx.fillStyle = theme.grey.semi
			ctx.fillRect(0, H / 2, W, H / 2)

			const world = getWorld()
			const train = world.trains[0]
			const line = train && world.lines.find((l) => l.id === train.lineId)
			const pts = line ? linePoints(world, line) : []
			const a = train ? pts[train.fromIdx] : undefined
			const b = train ? pts[train.toIdx] : undefined

			if (!train || !a || !b) {
				ctx.fillStyle = theme.text
				ctx.font = '13px sans-serif'
				ctx.textAlign = 'center'
				ctx.fillText('Draw a line to ride it', W / 2, H / 2)
				ctx.textAlign = 'left'
				return
			}

			const x = a.x + (b.x - a.x) * train.t
			const y = a.y + (b.y - a.y) * train.t
			let hx = b.x - a.x
			let hy = b.y - a.y
			if (Math.hypot(hx, hy) < 0.001) {
				hx = 1
				hy = 0
			}

			const cam = cameraFromHeading(x, y, hx, hy)
			const columns = castColumns(cam, buildSegments(editor, x, y), COLUMNS)
			const colW = W / COLUMNS

			for (let i = 0; i < COLUMNS; i++) {
				const c = columns[i]
				if (!isFinite(c.dist)) continue
				// Cap height below the full panel so a sliver of horizon always shows,
				// keeping depth legible even when a station is right ahead.
				const h = Math.min(H * 0.9, HEIGHT_K / c.dist)
				const y0 = (H - h) / 2
				// Atmospheric fog: near walls darker, distant walls fade toward the sky.
				// Edge-on faces darken a touch so corners read.
				const fog = Math.max(0, Math.min(1, c.dist / FOG_DIST))
				const lightness = (32 + 50 * fog) * (1 - 0.22 * c.faceShade)
				ctx.fillStyle = `hsl(212 14% ${lightness}%)`
				ctx.fillRect(i * colW, y0, colW + 1, h)
			}
		}

		// A second tick listener (after the sim has stepped) keeps the ride in sync.
		editor.on('tick', draw)
		draw()
		return () => {
			editor.off('tick', draw)
		}
	}, [editor])

	return (
		<div className="mm-ride">
			<canvas ref={canvasRef} style={{ width: W, height: H }} />
			<span className="mm-ride__label">Riding the line</span>
		</div>
	)
}

export default RideView
