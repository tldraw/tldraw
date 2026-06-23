import { useEffect, useRef } from 'react'
import './echolocation.css'

// --- the bare atom ---------------------------------------------------------
// A ball moves invisibly. Draw a stroke -> it fires a burst of fast "echoes"
// that travel along the direction you drew. When an echo passes through the
// ball, the ball flashes and bounces off the stroke. Nothing else yet.

const BG = '#f9fafb'
const INK = '#0f0f0f'

const BALL_SPEED = 200 // px/s, constant — only direction changes
const BALL_RADIUS = 9
const ECHO_COUNT = 3 // echoes per stroke
const ECHO_SPEED = 2000 // px/s — whip-fast
const ECHO_LIFE = 0.5 // seconds an echo lives once it starts moving
const ECHO_STAGGER = 0.05 // seconds between echoes in a burst
const ECHO_GROWTH = 1.1 // how much an echo scales up over its life (0 = none)
const TRAIL_LEN = 22

interface Pt {
	x: number
	y: number
}

interface Echo {
	pts: Pt[] // the drawn stroke, in canvas space
	cx: number // stroke centroid, the point it scales out from
	cy: number
	dir: Pt // unit vector the echo travels along
	dist: number // how far it has travelled
	age: number // seconds since spawn (includes its stagger delay)
	delay: number // seconds before it starts moving
	hit: boolean // an echo only connects once
}

interface Ball {
	x: number
	y: number
	vx: number
	vy: number
	flash: number // 0..1, decays — how visible the ball is right now
	trail: Pt[]
}

function len(x: number, y: number) {
	return Math.hypot(x, y)
}

// distance from point p to segment ab
function distToSeg(p: Pt, a: Pt, b: Pt) {
	const abx = b.x - a.x
	const aby = b.y - a.y
	const apx = p.x - a.x
	const apy = p.y - a.y
	const ab2 = abx * abx + aby * aby
	const t = ab2 === 0 ? 0 : Math.max(0, Math.min(1, (apx * abx + apy * aby) / ab2))
	const cx = a.x + abx * t
	const cy = a.y + aby * t
	return { d: len(p.x - cx, p.y - cy), nx: abx, ny: aby }
}

// where an echo's point sits right now: scaled out from its centroid, then
// translated along its travel direction.
function echoPoint(echo: Echo, p: Pt, scale: number, ox: number, oy: number): Pt {
	return {
		x: echo.cx + (p.x - echo.cx) * scale + ox,
		y: echo.cy + (p.y - echo.cy) * scale + oy,
	}
}

export default function EcholocationExample() {
	const canvasRef = useRef<HTMLCanvasElement>(null)

	useEffect(() => {
		const canvas = canvasRef.current
		if (!canvas) return
		const ctx = canvas.getContext('2d')
		if (!ctx) return

		let W = canvas.clientWidth
		let H = canvas.clientHeight
		let dpr = Math.min(2, window.devicePixelRatio || 1)

		const resize = () => {
			const rect = canvas.getBoundingClientRect()
			W = rect.width
			H = rect.height
			dpr = Math.min(2, window.devicePixelRatio || 1)
			canvas.width = Math.round(W * dpr)
			canvas.height = Math.round(H * dpr)
			ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
		}
		resize()
		window.addEventListener('resize', resize)
		const ro = new ResizeObserver(resize)
		ro.observe(canvas)

		// world state
		const ball: Ball = {
			x: W / 2,
			y: H / 2,
			vx: BALL_SPEED * 0.6,
			vy: -BALL_SPEED * 0.8,
			flash: 0,
			trail: [],
		}
		const echoes: Echo[] = []

		// drawing state
		let drawing = false
		let stroke: Pt[] = []

		const pt = (e: PointerEvent): Pt => {
			const r = canvas.getBoundingClientRect()
			return { x: e.clientX - r.left, y: e.clientY - r.top }
		}

		const onDown = (e: PointerEvent) => {
			drawing = true
			stroke = [pt(e)]
			canvas.setPointerCapture(e.pointerId)
		}
		const onMove = (e: PointerEvent) => {
			if (!drawing) return
			stroke.push(pt(e))
		}
		const onUp = () => {
			if (!drawing) return
			drawing = false
			if (stroke.length < 2) return
			fireEchoes(stroke)
			stroke = []
		}

		function fireEchoes(pts: Pt[]) {
			// direction implied by the BEND of the stroke: the curve acts like a
			// dish and fires echoes out the way it cups (perpendicular to the
			// chord, toward the concave side).
			const a = pts[0]
			const b = pts[pts.length - 1]
			const cx = b.x - a.x
			const cy = b.y - a.y
			const cl = len(cx, cy) || 1
			const cux = cx / cl
			const cuy = cy / cl

			// apex = stroke point that bulges farthest off the chord. its signed
			// perpendicular distance tells us which side the curve bulges.
			let maxDist = 0
			let side = 0
			for (const p of pts) {
				const cross = cux * (p.y - a.y) - cuy * (p.x - a.x)
				if (Math.abs(cross) > maxDist) {
					maxDist = Math.abs(cross)
					side = Math.sign(cross)
				}
			}

			let dir: Pt
			if (maxDist < 8 || side === 0) {
				// nearly straight — no bend to read; fall back to the chord
				dir = { x: cux, y: cuy }
			} else {
				// convex side = the way the curve bulges, perpendicular to the chord
				dir = { x: -side * cuy, y: side * cux }
			}
			const frozen = pts.map((p) => ({ x: p.x, y: p.y }))
			let mx = 0
			let my = 0
			for (const p of frozen) {
				mx += p.x
				my += p.y
			}
			mx /= frozen.length
			my /= frozen.length
			for (let i = 0; i < ECHO_COUNT; i++) {
				echoes.push({
					pts: frozen,
					cx: mx,
					cy: my,
					dir,
					dist: 0,
					age: 0,
					delay: i * ECHO_STAGGER,
					hit: false,
				})
			}
		}

		canvas.addEventListener('pointerdown', onDown)
		canvas.addEventListener('pointermove', onMove)
		canvas.addEventListener('pointerup', onUp)
		canvas.addEventListener('pointercancel', onUp)

		// --- loop ---
		let raf = 0
		let last = performance.now()

		const step = (dt: number) => {
			// ball moves and bounces off the walls
			ball.x += ball.vx * dt
			ball.y += ball.vy * dt
			if (ball.x < BALL_RADIUS) {
				ball.x = BALL_RADIUS
				ball.vx = Math.abs(ball.vx)
			} else if (ball.x > W - BALL_RADIUS) {
				ball.x = W - BALL_RADIUS
				ball.vx = -Math.abs(ball.vx)
			}
			if (ball.y < BALL_RADIUS) {
				ball.y = BALL_RADIUS
				ball.vy = Math.abs(ball.vy)
			} else if (ball.y > H - BALL_RADIUS) {
				ball.y = H - BALL_RADIUS
				ball.vy = -Math.abs(ball.vy)
			}
			ball.flash = Math.max(0, ball.flash - dt * 1.6)
			ball.trail.push({ x: ball.x, y: ball.y })
			if (ball.trail.length > TRAIL_LEN) ball.trail.shift()

			// echoes travel and (maybe) connect
			for (let i = echoes.length - 1; i >= 0; i--) {
				const echo = echoes[i]
				echo.age += dt
				const moving = echo.age - echo.delay
				if (moving <= 0) continue
				echo.dist = moving * ECHO_SPEED
				if (moving > ECHO_LIFE) {
					echoes.splice(i, 1)
					continue
				}
				if (!echo.hit) {
					const ox = echo.dir.x * echo.dist
					const oy = echo.dir.y * echo.dist
					const scale = 1 + (moving / ECHO_LIFE) * ECHO_GROWTH
					for (let j = 0; j < echo.pts.length - 1; j++) {
						const a = echoPoint(echo, echo.pts[j], scale, ox, oy)
						const b = echoPoint(echo, echo.pts[j + 1], scale, ox, oy)
						const { d, nx, ny } = distToSeg(ball, a, b)
						if (d < BALL_RADIUS + 4) {
							// reflect ball velocity about the stroke's normal
							const nl = len(nx, ny) || 1
							const px = -ny / nl
							const py = nx / nl
							const dot = ball.vx * px + ball.vy * py
							ball.vx -= 2 * dot * px
							ball.vy -= 2 * dot * py
							// keep the ball lively at a constant speed
							const sp = len(ball.vx, ball.vy) || 1
							ball.vx = (ball.vx / sp) * BALL_SPEED
							ball.vy = (ball.vy / sp) * BALL_SPEED
							ball.flash = 1
							echo.hit = true
							break
						}
					}
				}
			}
		}

		const render = () => {
			ctx.fillStyle = BG
			ctx.fillRect(0, 0, W, H)

			// the ball: a faint hunch most of the time, a sharp flash on contact
			// trail
			for (let i = 0; i < ball.trail.length; i++) {
				const t = i / ball.trail.length
				const p = ball.trail[i]
				ctx.beginPath()
				ctx.fillStyle = `rgba(15,15,15,${0.04 * t})`
				ctx.arc(p.x, p.y, BALL_RADIUS * (0.4 + 0.6 * t), 0, Math.PI * 2)
				ctx.fill()
			}
			// body
			const vis = 0.1 + ball.flash * 0.85
			ctx.beginPath()
			ctx.fillStyle = `rgba(15,15,15,${vis})`
			ctx.arc(ball.x, ball.y, BALL_RADIUS, 0, Math.PI * 2)
			ctx.fill()

			// echoes
			ctx.lineCap = 'round'
			ctx.lineJoin = 'round'
			ctx.strokeStyle = INK
			for (const echo of echoes) {
				const moving = echo.age - echo.delay
				if (moving <= 0) continue
				const fade = 1 - moving / ECHO_LIFE
				const scale = 1 + (moving / ECHO_LIFE) * ECHO_GROWTH
				ctx.globalAlpha = Math.max(0, fade) * 0.7
				ctx.lineWidth = 2 + fade * 3
				const ox = echo.dir.x * echo.dist
				const oy = echo.dir.y * echo.dist
				const p0 = echoPoint(echo, echo.pts[0], scale, ox, oy)
				ctx.beginPath()
				ctx.moveTo(p0.x, p0.y)
				for (let j = 1; j < echo.pts.length; j++) {
					const p = echoPoint(echo, echo.pts[j], scale, ox, oy)
					ctx.lineTo(p.x, p.y)
				}
				ctx.stroke()
			}
			ctx.globalAlpha = 1

			// the live stroke being drawn
			if (drawing && stroke.length > 1) {
				ctx.strokeStyle = INK
				ctx.lineWidth = 5
				ctx.beginPath()
				ctx.moveTo(stroke[0].x, stroke[0].y)
				for (let j = 1; j < stroke.length; j++) ctx.lineTo(stroke[j].x, stroke[j].y)
				ctx.stroke()
			}
		}

		const frame = (now: number) => {
			const dt = Math.min(0.05, (now - last) / 1000)
			last = now
			step(dt)
			render()
			raf = requestAnimationFrame(frame)
		}
		raf = requestAnimationFrame(frame)

		return () => {
			cancelAnimationFrame(raf)
			ro.disconnect()
			window.removeEventListener('resize', resize)
			canvas.removeEventListener('pointerdown', onDown)
			canvas.removeEventListener('pointermove', onMove)
			canvas.removeEventListener('pointerup', onUp)
			canvas.removeEventListener('pointercancel', onUp)
		}
	}, [])

	return (
		<div className="echolocation">
			<canvas ref={canvasRef} className="echolocation__canvas" />
			<div className="echolocation__hint">draw a stroke to ping the ball</div>
		</div>
	)
}
