import { Editor, TLShapeId } from 'tldraw'

// ---- Types ----

interface Portal {
	id: TLShapeId
	cx: number
	cy: number
	w: number
	h: number
	depth: number
	color: string
}

interface PlacedObject {
	portalCX: number
	portalCY: number
	offsetX: number
	offsetY: number
	depth: number
	color: string
	size: number
	birthTime: number
}

interface DropAnimation {
	startTime: number
	fromX: number
	fromY: number
	toX: number
	toY: number
	depth: number
	color: string
	size: number
	done: boolean
}

interface AmbientParticle {
	x: number
	y: number
	z: number
	size: number
	hue: number
	speed: number
}

export interface SimState {
	portals: Portal[]
	placedObjects: PlacedObject[]
	dropAnimations: DropAnimation[]
	ambientParticles: AmbientParticle[]
	droppedShapeIds: Set<string>
	time: number
}

// ---- Constants ----

const MIN_PORTAL_SIZE = 80
const DROP_DURATION = 30

const DEPTH_BY_COLOR: Record<string, number> = {
	'light-blue': 1.0,
	blue: 2.0,
	'light-green': 2.5,
	green: 3.0,
	'light-violet': 2.5,
	violet: 3.5,
	yellow: 4.0,
	orange: 5.0,
	'light-red': 5.0,
	red: 6.0,
	white: 1.5,
	grey: 3.0,
	black: 4.0,
}

const COLOR_RGB: Record<string, string> = {
	'light-blue': '135, 206, 250',
	blue: '66, 133, 244',
	green: '52, 168, 83',
	yellow: '251, 188, 4',
	orange: '234, 134, 30',
	red: '234, 67, 53',
	violet: '160, 100, 220',
	'light-violet': '200, 170, 240',
	'light-green': '129, 201, 149',
	'light-red': '255, 140, 140',
	black: '60, 60, 60',
	grey: '160, 160, 160',
	white: '220, 220, 220',
}

function getRgb(color: string): string {
	return COLOR_RGB[color] ?? '100, 150, 220'
}

function depthScale(depth: number): number {
	return 1 / (1 + depth * 0.15)
}

// ---- Initialization ----

export function createSimState(): SimState {
	const particles: AmbientParticle[] = []
	for (let i = 0; i < 150; i++) {
		particles.push({
			x: (Math.random() - 0.5) * 2000 + 400,
			y: (Math.random() - 0.5) * 1500 + 300,
			z: 0.5 + Math.random() * 6,
			size: 1 + Math.random() * 2.5,
			hue: Math.random() * 360,
			speed: 0.2 + Math.random() * 0.5,
		})
	}

	return {
		portals: [],
		placedObjects: [],
		dropAnimations: [],
		ambientParticles: particles,
		droppedShapeIds: new Set(),
		time: 0,
	}
}

// ---- Portal sync ----

export function syncPortals(state: SimState, editor: Editor) {
	const shapes = editor.getCurrentPageShapes()
	const portals: Portal[] = []

	for (const shape of shapes) {
		if (shape.type !== 'geo') continue
		const bounds = editor.getShapePageBounds(shape.id)
		if (!bounds) continue
		if (bounds.w < MIN_PORTAL_SIZE || bounds.h < MIN_PORTAL_SIZE) continue

		const color = (shape.props as { color?: string }).color ?? 'blue'
		const depth = DEPTH_BY_COLOR[color] ?? 3.0

		portals.push({
			id: shape.id,
			cx: bounds.x + bounds.w / 2,
			cy: bounds.y + bounds.h / 2,
			w: bounds.w,
			h: bounds.h,
			depth,
			color,
		})
	}

	state.portals = portals
}

// ---- Drop detection ----

export function checkDrops(state: SimState, editor: Editor): TLShapeId[] {
	const shapes = editor.getCurrentPageShapes()
	const toDelete: TLShapeId[] = []
	const portalIds = new Set(state.portals.map((p) => p.id as string))
	const isDragging = editor.inputs.isDragging
	const selectedIds = new Set(editor.getSelectedShapeIds().map(String))

	for (const shape of shapes) {
		const sid = shape.id as string
		if (portalIds.has(sid)) continue
		if (state.droppedShapeIds.has(sid)) continue
		if (shape.type === 'group') continue

		// Don't absorb shapes currently being dragged
		if (isDragging && selectedIds.has(sid)) continue

		const bounds = editor.getShapePageBounds(shape.id)
		if (!bounds) continue

		const cx = bounds.x + bounds.w / 2
		const cy = bounds.y + bounds.h / 2

		for (const portal of state.portals) {
			const inX = Math.abs(cx - portal.cx) < portal.w * 0.4
			const inY = Math.abs(cy - portal.cy) < portal.h * 0.4

			if (inX && inY) {
				state.droppedShapeIds.add(sid)

				const color = (shape.props as { color?: string })?.color ?? 'blue'

				state.dropAnimations.push({
					startTime: state.time,
					fromX: cx,
					fromY: cy,
					toX: portal.cx,
					toY: portal.cy,
					depth: portal.depth,
					color,
					size: Math.max(bounds.w, bounds.h),
					done: false,
				})

				toDelete.push(shape.id)
				break
			}
		}
	}

	return toDelete
}

// ---- Tick ----

export function tick(state: SimState) {
	state.time++

	for (const anim of state.dropAnimations) {
		if (anim.done) continue
		const elapsed = state.time - anim.startTime
		if (elapsed >= DROP_DURATION) {
			anim.done = true
			state.placedObjects.push({
				portalCX: anim.toX,
				portalCY: anim.toY,
				offsetX: (anim.fromX - anim.toX) * 0.3,
				offsetY: (anim.fromY - anim.toY) * 0.3,
				depth: anim.depth,
				color: anim.color,
				size: anim.size * 0.3,
				birthTime: state.time,
			})
		}
	}

	state.dropAnimations = state.dropAnimations.filter(
		(a) => state.time - a.startTime < DROP_DURATION + 15
	)
}

// ---- Rendering ----

function easeInOut(t: number): number {
	return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2
}

function drawAmbientField(ctx: CanvasRenderingContext2D, state: SimState) {
	const t = state.time * 0.008

	for (const p of state.ambientParticles) {
		const dx = Math.sin(t * p.speed + p.x * 0.005) * 8
		const dy = Math.cos(t * p.speed * 0.7 + p.y * 0.005) * 6
		const scale = depthScale(p.z)
		const alpha = Math.max(0.02, 0.08 * scale)

		ctx.beginPath()
		ctx.arc(p.x + dx, p.y + dy, p.size * scale, 0, Math.PI * 2)
		ctx.fillStyle = `hsla(${p.hue}, 30%, 65%, ${alpha})`
		ctx.fill()
	}
}

function drawPortalOverlays(ctx: CanvasRenderingContext2D, state: SimState) {
	for (const portal of state.portals) {
		const rgb = getRgb(portal.color)
		const pulse = 0.6 + 0.4 * Math.sin(state.time * 0.04 + portal.depth)

		ctx.save()
		ctx.translate(portal.cx, portal.cy)

		// Depth tunnel rings
		const rings = Math.min(4, Math.ceil(portal.depth / 1.5))
		for (let i = 1; i <= rings; i++) {
			const ringScale = 1 - (i / (rings + 1)) * 0.6
			const ringAlpha = 0.08 * (1 - i / (rings + 1)) * pulse
			const rw = portal.w * 0.45 * ringScale
			const rh = portal.h * 0.45 * ringScale

			ctx.strokeStyle = `rgba(${rgb}, ${ringAlpha})`
			ctx.lineWidth = 0.5
			ctx.beginPath()
			ctx.ellipse(0, 0, rw, rh, 0, 0, Math.PI * 2)
			ctx.stroke()
		}

		// Outer glow
		const glowR = Math.max(portal.w, portal.h) * 0.55
		const glow = ctx.createRadialGradient(0, 0, glowR * 0.4, 0, 0, glowR)
		glow.addColorStop(0, `rgba(${rgb}, ${0.05 * pulse})`)
		glow.addColorStop(1, 'rgba(0, 0, 0, 0)')
		ctx.fillStyle = glow
		ctx.beginPath()
		ctx.arc(0, 0, glowR, 0, Math.PI * 2)
		ctx.fill()

		// Depth label
		ctx.font = '10px monospace'
		ctx.textAlign = 'center'
		ctx.fillStyle = `rgba(${rgb}, ${0.5 + 0.2 * pulse})`
		ctx.fillText(`z ${portal.depth.toFixed(1)}`, 0, -portal.h / 2 - 6)

		// Corner depth dots
		const dots = Math.min(5, Math.round(portal.depth))
		for (let i = 0; i < dots; i++) {
			const dotAlpha = (1 - i / 5) * 0.4 * pulse
			ctx.beginPath()
			ctx.arc(portal.w / 2 + 10, -portal.h / 2 + 6 + i * 8, 1.5, 0, Math.PI * 2)
			ctx.fillStyle = `rgba(${rgb}, ${dotAlpha})`
			ctx.fill()
		}

		ctx.restore()
	}
}

function drawPlacedObjects(ctx: CanvasRenderingContext2D, state: SimState) {
	const t = state.time * 0.01

	for (const obj of state.placedObjects) {
		const age = state.time - obj.birthTime
		const fadeIn = Math.min(1, age / 15)
		const scale = depthScale(obj.depth)
		const rgb = getRgb(obj.color)

		// Gentle drift
		const drift = Math.sin(t * 1.5 + obj.birthTime * 0.1) * 4 * scale
		const bob = Math.cos(t * 1.1 + obj.birthTime * 0.07) * 3 * scale

		const x = obj.portalCX + obj.offsetX * scale + drift
		const y = obj.portalCY + obj.offsetY * scale + bob
		const r = Math.max(2, obj.size * scale)

		// Glow
		const glow = ctx.createRadialGradient(x, y, 0, x, y, r * 3)
		glow.addColorStop(0, `rgba(${rgb}, ${0.15 * fadeIn * scale})`)
		glow.addColorStop(1, 'rgba(0, 0, 0, 0)')
		ctx.fillStyle = glow
		ctx.beginPath()
		ctx.arc(x, y, r * 3, 0, Math.PI * 2)
		ctx.fill()

		// Object circle
		ctx.beginPath()
		ctx.arc(x, y, r, 0, Math.PI * 2)
		ctx.fillStyle = `rgba(${rgb}, ${0.7 * fadeIn * (0.4 + scale * 0.6)})`
		ctx.fill()
		ctx.strokeStyle = `rgba(${rgb}, ${0.9 * fadeIn * scale})`
		ctx.lineWidth = 0.8
		ctx.stroke()
	}
}

function drawDropAnimations(ctx: CanvasRenderingContext2D, state: SimState) {
	for (const anim of state.dropAnimations) {
		const elapsed = state.time - anim.startTime
		const t = Math.min(1, elapsed / DROP_DURATION)
		const et = easeInOut(t)
		const rgb = getRgb(anim.color)

		// Interpolate toward portal center
		const x = anim.fromX + (anim.toX - anim.fromX) * et
		const y = anim.fromY + (anim.toY - anim.fromY) * et

		// Shrink by depth
		const targetScale = depthScale(anim.depth) * 0.3
		const currentSize = anim.size * (1 - et * (1 - targetScale))
		const alpha = 1 - et * 0.6

		// Spiral motion
		const angle = et * Math.PI * 3
		const spiralR = (1 - et) * 15
		const sx = x + Math.cos(angle) * spiralR
		const sy = y + Math.sin(angle) * spiralR

		// Object
		ctx.beginPath()
		ctx.arc(sx, sy, currentSize / 2, 0, Math.PI * 2)
		ctx.fillStyle = `rgba(${rgb}, ${alpha * 0.5})`
		ctx.fill()
		ctx.strokeStyle = `rgba(${rgb}, ${alpha * 0.8})`
		ctx.lineWidth = 1
		ctx.stroke()

		// Trail
		ctx.setLineDash([2, 4])
		ctx.strokeStyle = `rgba(${rgb}, ${alpha * 0.2})`
		ctx.lineWidth = 0.5
		ctx.beginPath()
		ctx.moveTo(anim.fromX, anim.fromY)
		ctx.lineTo(sx, sy)
		ctx.stroke()
		ctx.setLineDash([])

		// Portal entry glow
		if (t > 0.6) {
			const gt = (t - 0.6) / 0.4
			const glowAlpha = 0.25 * (1 - gt)
			const glowR = 15 + gt * 30
			const glow = ctx.createRadialGradient(anim.toX, anim.toY, 0, anim.toX, anim.toY, glowR)
			glow.addColorStop(0, `rgba(${rgb}, ${glowAlpha})`)
			glow.addColorStop(1, 'rgba(0, 0, 0, 0)')
			ctx.fillStyle = glow
			ctx.beginPath()
			ctx.arc(anim.toX, anim.toY, glowR, 0, Math.PI * 2)
			ctx.fill()
		}
	}
}

function drawDepthLines(ctx: CanvasRenderingContext2D, state: SimState) {
	if (state.portals.length < 2) return

	const sorted = [...state.portals].sort((a, b) => a.depth - b.depth)

	for (let i = 0; i < sorted.length - 1; i++) {
		const a = sorted[i]
		const b = sorted[i + 1]
		const rgb = getRgb(a.color)
		const alpha = 0.06 + 0.02 * Math.sin(state.time * 0.02 + i)

		ctx.setLineDash([3, 8])
		ctx.strokeStyle = `rgba(${rgb}, ${alpha})`
		ctx.lineWidth = 0.5
		ctx.beginPath()
		ctx.moveTo(a.cx, a.cy)
		ctx.lineTo(b.cx, b.cy)
		ctx.stroke()
		ctx.setLineDash([])
	}
}

export function render(
	ctx: CanvasRenderingContext2D,
	state: SimState,
	width: number,
	height: number,
	camera: { x: number; y: number; z: number }
) {
	ctx.clearRect(0, 0, width, height)

	ctx.save()
	ctx.translate(camera.x, camera.y)
	ctx.scale(camera.z, camera.z)

	drawAmbientField(ctx, state)
	drawDepthLines(ctx, state)
	drawPortalOverlays(ctx, state)
	drawPlacedObjects(ctx, state)
	drawDropAnimations(ctx, state)

	ctx.restore()
}
