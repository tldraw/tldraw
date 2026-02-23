import { useCallback, useEffect, useRef } from 'react'
import './geode-depth-minimap.css'

// ---- Types ----

interface Crystal {
	x: number
	y: number
	size: number
	color: string
	glow: string
	rotation: number
	sides: number
	brightness: number
}

interface CrystalLayer {
	depth: number
	crystals: Crystal[]
}

interface Shatter {
	x: number
	y: number
	radius: number
	maxRadius: number
	cracks: { angle: number; maxLen: number }[]
	t: number
}

interface State {
	mx: number
	my: number
	depth: number
	shatters: Shatter[]
	layers: CrystalLayer[] | null
	stone: HTMLCanvasElement | null
	w: number
	h: number
	frame: number
	ready: boolean
}

// ---- Constants ----

const NUM_LAYERS = 6
const LENS_R = 120
const PARALLAX = 0.08
const SHATTER_BASE_R = 80
const STONE_SCALE = 3

const PALETTES: [string, string][] = [
	['#e83e8c', '#ff6bab'],
	['#3b82f6', '#60a5fa'],
	['#8b5cf6', '#a78bfa'],
	['#10b981', '#34d399'],
	['#f59e0b', '#fbbf24'],
	['#06b6d4', '#22d3ee'],
	['#ec4899', '#f472b6'],
	['#14b8a6', '#2dd4bf'],
]

// ---- Noise ----

function hash(x: number, y: number) {
	let h = (x * 374761393 + y * 668265263) | 0
	h = ((h ^ (h >> 13)) * 1274126177) | 0
	return ((h ^ (h >> 16)) >>> 0) / 4294967296
}

function noise(x: number, y: number) {
	const ix = Math.floor(x)
	const iy = Math.floor(y)
	const fx = x - ix
	const fy = y - iy
	const sx = fx * fx * (3 - 2 * fx)
	const sy = fy * fy * (3 - 2 * fy)
	return (
		(hash(ix, iy) * (1 - sx) + hash(ix + 1, iy) * sx) * (1 - sy) +
		(hash(ix, iy + 1) * (1 - sx) + hash(ix + 1, iy + 1) * sx) * sy
	)
}

function fbm(x: number, y: number, oct: number) {
	let v = 0
	let a = 0.5
	let f = 1
	for (let i = 0; i < oct; i++) {
		v += a * noise(x * f, y * f)
		a *= 0.5
		f *= 2
	}
	return v
}

// ---- Seeded random ----

function rng(seed: number) {
	let s = seed
	return () => {
		s = (s * 1103515245 + 12345) & 0x7fffffff
		return s / 0x7fffffff
	}
}

// ---- Generate crystal layers ----

function generateLayers(w: number, h: number): CrystalLayer[] {
	const rand = rng(12345)
	return Array.from({ length: NUM_LAYERS }, (_, l) => {
		const depth = l / (NUM_LAYERS - 1)
		const crystals: Crystal[] = []
		const numClusters = 10 + Math.floor(depth * 15)

		for (let c = 0; c < numClusters; c++) {
			const cx = rand() * w
			const cy = rand() * h
			const clusterR = 30 + rand() * 90
			const palette = PALETTES[Math.floor(rand() * PALETTES.length)]
			const numInCluster = 3 + Math.floor(rand() * 10)

			for (let i = 0; i < numInCluster; i++) {
				const angle = rand() * Math.PI * 2
				const dist = rand() * clusterR
				crystals.push({
					x: cx + Math.cos(angle) * dist,
					y: cy + Math.sin(angle) * dist,
					size: 4 + rand() * 20 * (1 + depth * 0.5),
					color: palette[0],
					glow: palette[1],
					rotation: rand() * Math.PI * 2,
					sides: 4 + Math.floor(rand() * 4),
					brightness: 0.4 + rand() * 0.6,
				})
			}
		}

		return { depth, crystals }
	})
}

// ---- Render stone texture to offscreen canvas ----

function renderStone(w: number, h: number): HTMLCanvasElement {
	const canvas = document.createElement('canvas')
	canvas.width = w
	canvas.height = h
	const ctx = canvas.getContext('2d')!
	const img = ctx.createImageData(w, h)
	const d = img.data

	for (let y = 0; y < h; y++) {
		for (let x = 0; x < w; x++) {
			const i = (y * w + x) * 4
			const n1 = fbm(x * 0.008, y * 0.008, 5)
			const n2 = fbm(x * 0.03, y * 0.03, 3)
			const n3 = fbm(x * 0.1, y * 0.1, 2)
			const base = 28 + n1 * 22 + n2 * 8 + n3 * 4

			// Subtle veins
			const vein = fbm(x * 0.02 + 100, y * 0.02 + 100, 3)
			const vb = vein > 0.62 ? (vein - 0.62) * 50 : 0

			d[i] = Math.min(255, base + n1 * 6 + vb * 0.5)
			d[i + 1] = Math.min(255, base - 1 + vb * 0.3)
			d[i + 2] = Math.min(255, base - n1 * 4 + vb * 0.6)
			d[i + 3] = 255
		}
	}

	ctx.putImageData(img, 0, 0)
	return canvas
}

// ---- Draw a single crystal ----

function drawCrystal(ctx: CanvasRenderingContext2D, c: Crystal, alpha: number, time: number) {
	const pulse = 1 + Math.sin(time * 0.002 + c.x * 0.01 + c.y * 0.01) * 0.15

	ctx.save()
	ctx.translate(c.x, c.y)
	ctx.rotate(c.rotation)
	ctx.globalAlpha = alpha * c.brightness

	// Outer glow
	ctx.shadowColor = c.glow
	ctx.shadowBlur = c.size * pulse

	// Crystal polygon
	ctx.beginPath()
	for (let i = 0; i <= c.sides; i++) {
		const angle = (i / c.sides) * Math.PI * 2
		const r = c.size * (0.7 + 0.3 * Math.cos(angle * 2.7 + c.rotation))
		const px = Math.cos(angle) * r
		const py = Math.sin(angle) * r
		if (i === 0) ctx.moveTo(px, py)
		else ctx.lineTo(px, py)
	}
	ctx.closePath()

	// Gradient fill
	const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, c.size)
	grad.addColorStop(0, c.glow)
	grad.addColorStop(0.4, c.color)
	grad.addColorStop(1, c.color + '66')
	ctx.fillStyle = grad
	ctx.fill()

	// Bright center highlight
	ctx.globalAlpha = alpha * 0.6 * pulse
	ctx.shadowBlur = c.size * 0.5
	ctx.beginPath()
	ctx.arc(0, 0, c.size * 0.15, 0, Math.PI * 2)
	ctx.fillStyle = '#fff'
	ctx.fill()

	ctx.restore()
}

// ---- Easing ----

function easeOut(t: number) {
	return 1 - (1 - t) ** 4
}

// ---- Depth indicator ----

function drawDepthIndicator(
	ctx: CanvasRenderingContext2D,
	w: number,
	h: number,
	depth: number,
	time: number
) {
	const x = w - 30
	const top = h * 0.3
	const bot = h * 0.7
	const barH = bot - top

	ctx.save()
	ctx.globalAlpha = 0.4

	// Track line
	ctx.strokeStyle = '#555'
	ctx.lineWidth = 2
	ctx.beginPath()
	ctx.moveTo(x, top)
	ctx.lineTo(x, bot)
	ctx.stroke()

	// Labels
	ctx.fillStyle = '#777'
	ctx.font = '10px monospace'
	ctx.textAlign = 'center'
	ctx.fillText('shallow', x, top - 8)
	ctx.fillText('deep', x, bot + 14)

	// Depth dot
	const dotY = top + depth * barH
	ctx.globalAlpha = 0.7
	ctx.fillStyle = '#44aaff'
	ctx.shadowColor = '#44aaff'
	ctx.shadowBlur = 8 + Math.sin(time * 0.004) * 3
	ctx.beginPath()
	ctx.arc(x, dotY, 5, 0, Math.PI * 2)
	ctx.fill()

	ctx.restore()
}

// ---- Check if a crystal is near any visible region ----

function isCrystalVisible(
	cx: number,
	cy: number,
	cSize: number,
	mx: number,
	my: number,
	hasLens: boolean,
	shatters: Shatter[]
): boolean {
	const margin = cSize * 2
	if (hasLens) {
		const dx = cx - mx
		const dy = cy - my
		if (dx * dx + dy * dy < (LENS_R + margin) * (LENS_R + margin)) return true
	}
	for (const sh of shatters) {
		const dx = cx - sh.x
		const dy = cy - sh.y
		const r = sh.radius + margin
		if (dx * dx + dy * dy < r * r) return true
	}
	return false
}

// ---- Main component ----

export default function GeodeDepthMinimapExample() {
	const canvasRef = useRef<HTMLCanvasElement>(null)
	const stateRef = useRef<State>({
		mx: -1000,
		my: -1000,
		depth: 0.5,
		shatters: [],
		layers: null,
		stone: null,
		w: 0,
		h: 0,
		frame: 0,
		ready: false,
	})

	const init = useCallback((w: number, h: number) => {
		const s = stateRef.current
		s.stone = renderStone(Math.ceil(w / STONE_SCALE), Math.ceil(h / STONE_SCALE))
		s.layers = generateLayers(w, h)
		s.w = w
		s.h = h
		s.ready = true
	}, [])

	useEffect(() => {
		const cvs = canvasRef.current!
		const ctx = cvs.getContext('2d')!
		const s = stateRef.current

		// Size canvas to container
		const resize = () => {
			const rect = cvs.parentElement!.getBoundingClientRect()
			cvs.width = rect.width
			cvs.height = rect.height
			s.w = rect.width
			s.h = rect.height
			s.ready = false
		}

		resize()
		window.addEventListener('resize', resize)

		// Animation loop
		const tick = (time: number) => {
			if (!s.ready) init(s.w, s.h)
			if (!s.layers || !s.stone) {
				s.frame = requestAnimationFrame(tick)
				return
			}

			const { w, h, mx, my, depth, shatters, layers, stone } = s

			ctx.clearRect(0, 0, w, h)

			// [1] Draw stone background
			ctx.imageSmoothingEnabled = true
			ctx.imageSmoothingQuality = 'high'
			ctx.drawImage(stone, 0, 0, stone.width, stone.height, 0, 0, w, h)

			// [2] Clip to lens + shatter regions, draw crystals
			const hasLens = mx > -500
			if (hasLens || shatters.length > 0) {
				ctx.save()
				ctx.beginPath()
				if (hasLens) {
					ctx.arc(mx, my, LENS_R, 0, Math.PI * 2)
				}
				for (const sh of shatters) {
					ctx.moveTo(sh.x + sh.radius, sh.y)
					ctx.arc(sh.x, sh.y, Math.max(1, sh.radius), 0, Math.PI * 2)
				}
				ctx.clip()

				// Dark cavern background
				ctx.fillStyle = '#08080f'
				ctx.fillRect(0, 0, w, h)

				// Crystal layers with parallax
				const centerX = w / 2
				const centerY = h / 2
				for (const layer of layers) {
					const alpha = Math.max(0.1, 1 - Math.abs(layer.depth - depth) * 2.5)
					const px = (mx - centerX) * layer.depth * PARALLAX
					const py = (my - centerY) * layer.depth * PARALLAX

					ctx.save()
					ctx.translate(px, py)
					for (const crystal of layer.crystals) {
						if (
							isCrystalVisible(
								crystal.x + px,
								crystal.y + py,
								crystal.size,
								mx,
								my,
								hasLens,
								shatters
							)
						) {
							drawCrystal(ctx, crystal, alpha, time)
						}
					}
					ctx.restore()
				}

				ctx.restore()
			}

			// [3] Lens ring glow
			if (hasLens) {
				ctx.save()
				ctx.globalAlpha = 0.4 + Math.sin(time * 0.003) * 0.1
				ctx.strokeStyle = '#88ccff'
				ctx.lineWidth = 2
				ctx.shadowColor = '#44aaff'
				ctx.shadowBlur = 15
				ctx.beginPath()
				ctx.arc(mx, my, LENS_R, 0, Math.PI * 2)
				ctx.stroke()

				// Inner ring
				ctx.globalAlpha = 0.15
				ctx.strokeStyle = '#aaddff'
				ctx.lineWidth = 1
				ctx.shadowBlur = 8
				ctx.beginPath()
				ctx.arc(mx, my, LENS_R - 6, 0, Math.PI * 2)
				ctx.stroke()
				ctx.restore()
			}

			// [4] Shatter animations
			for (const sh of shatters) {
				if (sh.t < 1) {
					sh.t = Math.min(1, sh.t + 0.035)
					sh.radius = sh.maxRadius * easeOut(sh.t)
				}

				// Crack lines
				ctx.save()
				ctx.globalAlpha = sh.t < 1 ? 0.6 + (1 - sh.t) * 0.4 : 0.25
				ctx.strokeStyle = '#ffaa44'
				ctx.lineWidth = sh.t < 1 ? 2 : 1
				ctx.shadowColor = '#ff8800'
				ctx.shadowBlur = sh.t < 1 ? 12 : 4
				for (const crack of sh.cracks) {
					const len = crack.maxLen * Math.min(1, sh.t * 2.5)
					ctx.beginPath()
					ctx.moveTo(sh.x, sh.y)
					ctx.lineTo(sh.x + Math.cos(crack.angle) * len, sh.y + Math.sin(crack.angle) * len)
					ctx.stroke()
				}
				ctx.restore()

				// Edge glow
				if (sh.radius > 2) {
					ctx.save()
					ctx.globalAlpha = sh.t < 1 ? 0.3 : 0.15
					ctx.strokeStyle = '#ffcc66'
					ctx.lineWidth = 2
					ctx.shadowColor = '#ff8800'
					ctx.shadowBlur = 10
					ctx.beginPath()
					ctx.arc(sh.x, sh.y, sh.radius, 0, Math.PI * 2)
					ctx.stroke()
					ctx.restore()
				}
			}

			// [5] Depth indicator
			drawDepthIndicator(ctx, w, h, depth, time)

			s.frame = requestAnimationFrame(tick)
		}

		s.frame = requestAnimationFrame(tick)

		// Event handlers
		const onMove = (e: MouseEvent) => {
			const rect = cvs.getBoundingClientRect()
			s.mx = e.clientX - rect.left
			s.my = e.clientY - rect.top
		}

		const onLeave = () => {
			s.mx = -1000
			s.my = -1000
		}

		const onWheel = (e: WheelEvent) => {
			e.preventDefault()
			s.depth = Math.max(0, Math.min(1, s.depth + e.deltaY * 0.002))
		}

		const onClick = (e: MouseEvent) => {
			const rect = cvs.getBoundingClientRect()
			const x = e.clientX - rect.left
			const y = e.clientY - rect.top
			const rand = rng(Date.now())
			s.shatters.push({
				x,
				y,
				radius: 0,
				maxRadius: SHATTER_BASE_R + rand() * 40,
				cracks: Array.from({ length: 8 + Math.floor(rand() * 5) }, () => ({
					angle: rand() * Math.PI * 2,
					maxLen: SHATTER_BASE_R * (0.6 + rand() * 0.8),
				})),
				t: 0,
			})
		}

		cvs.addEventListener('mousemove', onMove)
		cvs.addEventListener('mouseleave', onLeave)
		cvs.addEventListener('wheel', onWheel, { passive: false })
		cvs.addEventListener('click', onClick)

		return () => {
			cancelAnimationFrame(s.frame)
			window.removeEventListener('resize', resize)
			cvs.removeEventListener('mousemove', onMove)
			cvs.removeEventListener('mouseleave', onLeave)
			cvs.removeEventListener('wheel', onWheel)
			cvs.removeEventListener('click', onClick)
		}
	}, [init])

	return (
		<div className="geode-depth-minimap">
			<canvas ref={canvasRef} />
			<div className="geode-instructions">
				<span>Move cursor to reveal crystals</span>
				<span>Scroll to change depth</span>
				<span>Click to shatter rock</span>
			</div>
		</div>
	)
}

/*
[1]
Stone texture is pre-rendered to an offscreen canvas at reduced resolution using
fractal Brownian motion noise, then stretched to fill the viewport. This gives a
natural-looking dark stone surface with subtle veins and color variation.

[2]
The clip path creates a union of the lens circle (at cursor) and all shatter
circles. Within this clipped region, the stone is overwritten with a dark cavern
background and crystal layers are drawn with parallax offsets based on depth.

[3]
The lens ring is drawn outside the clip so it renders as a crisp glow border
around the x-ray viewport. The pulsing effect uses a time-based sine wave.

[4]
Shatter animations expand a circle from the click point using eased interpolation.
Crack lines radiate outward and fade once the animation completes, while the
exposed crystal region remains permanent.

[5]
A minimal depth indicator on the right side shows the current focus depth
controlled by the scroll wheel. Layers closer to the focus depth appear brighter.
*/
