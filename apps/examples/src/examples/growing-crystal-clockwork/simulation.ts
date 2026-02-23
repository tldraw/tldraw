// ---- Types ----

export interface Crystal {
	id: number
	x: number
	y: number
	radius: number
	maxRadius: number
	sides: number
	rotation: number
	rotationSpeed: number
	hue: number
	saturation: number
	lightness: number
	opacity: number
	growthRate: number
	gearTeeth: number
	gearTransition: number
	connected: boolean
}

export interface Crack {
	segments: { x1: number; y1: number; x2: number; y2: number }[]
	age: number
}

export interface SimState {
	crystals: Crystal[]
	cracks: Crack[]
	connections: [number, number][]
	nextId: number
}

// ---- State management ----

const MAX_CRYSTALS = 80

export function createSimState(): SimState {
	return { crystals: [], cracks: [], connections: [], nextId: 0 }
}

export function addCrystal(state: SimState, x: number, y: number, isVein = false) {
	if (state.crystals.length >= MAX_CRYSTALS) return
	const sides = 5 + Math.floor(Math.random() * 4)
	const maxRadius = isVein ? 15 + Math.random() * 20 : 30 + Math.random() * 50
	state.crystals.push({
		id: state.nextId++,
		x,
		y,
		radius: 2,
		maxRadius,
		sides,
		rotation: Math.random() * Math.PI * 2,
		rotationSpeed: 0,
		hue: 160 + Math.random() * 140,
		saturation: 70 + Math.random() * 30,
		lightness: 50 + Math.random() * 15,
		opacity: 0,
		growthRate: isVein ? 0.3 : 0.15 + Math.random() * 0.15,
		gearTeeth: Math.max(8, Math.round(maxRadius * 0.3)),
		gearTransition: 0,
		connected: false,
	})
}

export function addCrack(state: SimState, x: number, y: number) {
	const segments: Crack['segments'] = []
	const count = 4 + Math.floor(Math.random() * 4)
	for (let i = 0; i < count; i++) {
		const base = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5
		let cx = x,
			cy = y
		const segs = 2 + Math.floor(Math.random() * 3)
		const len = 20 + Math.random() * 40
		for (let j = 0; j < segs; j++) {
			const a = base + (Math.random() - 0.5) * 0.8
			const d = len / segs
			const nx = cx + Math.cos(a) * d
			const ny = cy + Math.sin(a) * d
			segments.push({ x1: cx, y1: cy, x2: nx, y2: ny })
			cx = nx
			cy = ny
		}
	}
	state.cracks.push({ segments, age: 0 })
}

export function boostNearby(state: SimState, x: number, y: number) {
	for (const c of state.crystals) {
		const dx = c.x - x
		const dy = c.y - y
		if (Math.sqrt(dx * dx + dy * dy) < 80) {
			c.growthRate = Math.min(c.growthRate + 0.1, 1.5)
		}
	}
}

// ---- Simulation tick ----

function alreadyConnected(state: SimState, a: number, b: number) {
	return state.connections.some(([x, y]) => (x === a && y === b) || (x === b && y === a))
}

export function tick(state: SimState) {
	for (const c of state.crystals) {
		if (c.radius < c.maxRadius) c.radius = Math.min(c.radius + c.growthRate, c.maxRadius)
		if (c.opacity < 1) c.opacity = Math.min(c.opacity + 0.02, 1)
		c.rotation += c.rotationSpeed
		if (c.connected && c.gearTransition < 1) c.gearTransition = Math.min(c.gearTransition + 0.03, 1)
	}

	for (let i = 0; i < state.crystals.length; i++) {
		for (let j = i + 1; j < state.crystals.length; j++) {
			const a = state.crystals[i]
			const b = state.crystals[j]
			if (alreadyConnected(state, a.id, b.id)) continue
			if (a.radius < 8 || b.radius < 8) continue
			const dx = a.x - b.x
			const dy = a.y - b.y
			const dist = Math.sqrt(dx * dx + dy * dy)
			if (dist < a.radius + b.radius + 5) {
				state.connections.push([a.id, b.id])
				a.connected = true
				b.connected = true
				const base = 0.01
				if (a.rotationSpeed === 0 && b.rotationSpeed === 0) {
					a.rotationSpeed = base
					b.rotationSpeed = -base * (a.gearTeeth / b.gearTeeth)
				} else if (a.rotationSpeed !== 0) {
					b.rotationSpeed = -a.rotationSpeed * (a.gearTeeth / b.gearTeeth)
				} else {
					a.rotationSpeed = -b.rotationSpeed * (b.gearTeeth / a.gearTeeth)
				}
			}
		}
	}

	for (const crack of state.cracks) crack.age++
	state.cracks = state.cracks.filter((c) => c.age < 150)
}

// ---- Rendering ----

function drawCracks(ctx: CanvasRenderingContext2D, cracks: Crack[]) {
	for (const crack of cracks) {
		const alpha = Math.max(0, 1 - crack.age / 150)
		if (alpha <= 0) continue
		for (const s of crack.segments) {
			ctx.beginPath()
			ctx.moveTo(s.x1, s.y1)
			ctx.lineTo(s.x2, s.y2)
			ctx.strokeStyle = `rgba(140, 220, 255, ${alpha * 0.7})`
			ctx.lineWidth = 2.5
			ctx.shadowColor = `rgba(100, 200, 255, ${alpha})`
			ctx.shadowBlur = 10
			ctx.stroke()
			ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.5})`
			ctx.lineWidth = 0.8
			ctx.stroke()
		}
		ctx.shadowBlur = 0
	}
}

function drawGlow(ctx: CanvasRenderingContext2D, c: Crystal) {
	if (c.opacity <= 0 || c.radius < 3) return
	const r = c.radius * 2.5
	const g = ctx.createRadialGradient(c.x, c.y, c.radius * 0.3, c.x, c.y, r)
	g.addColorStop(0, `hsla(${c.hue}, ${c.saturation}%, ${c.lightness}%, ${0.25 * c.opacity})`)
	g.addColorStop(1, `hsla(${c.hue}, ${c.saturation}%, ${c.lightness}%, 0)`)
	ctx.beginPath()
	ctx.arc(c.x, c.y, r, 0, Math.PI * 2)
	ctx.fillStyle = g
	ctx.fill()
}

function drawCrystal(ctx: CanvasRenderingContext2D, c: Crystal) {
	if (c.opacity <= 0 || c.radius < 2) return
	const { x, y, radius, sides, rotation, hue, saturation, lightness, opacity } = c

	// Gear teeth
	if (c.gearTransition > 0) {
		const th = radius * 0.15 * c.gearTransition
		const outerR = radius + th
		const innerR = radius - th * 0.3
		const n = c.gearTeeth
		ctx.beginPath()
		for (let i = 0; i < n * 2; i++) {
			const a = rotation + (Math.PI * 2 * i) / (n * 2)
			const r = i % 2 === 0 ? outerR : innerR
			if (i === 0) ctx.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r)
			else ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r)
		}
		ctx.closePath()
		ctx.fillStyle = `hsla(${hue}, ${saturation - 10}%, ${lightness - 15}%, ${opacity * 0.6})`
		ctx.fill()
		ctx.strokeStyle = `hsla(${hue}, ${saturation}%, ${lightness + 10}%, ${opacity * 0.4})`
		ctx.lineWidth = 0.5
		ctx.stroke()
	}

	// Body polygon
	const grad = ctx.createRadialGradient(x - radius * 0.2, y - radius * 0.2, 0, x, y, radius)
	grad.addColorStop(0, `hsla(${hue}, ${saturation}%, ${lightness + 20}%, ${opacity})`)
	grad.addColorStop(0.6, `hsla(${hue}, ${saturation}%, ${lightness}%, ${opacity})`)
	grad.addColorStop(1, `hsla(${hue}, ${saturation}%, ${lightness - 10}%, ${opacity})`)
	ctx.beginPath()
	for (let i = 0; i < sides; i++) {
		const a = rotation + (Math.PI * 2 * i) / sides
		if (i === 0) ctx.moveTo(x + Math.cos(a) * radius, y + Math.sin(a) * radius)
		else ctx.lineTo(x + Math.cos(a) * radius, y + Math.sin(a) * radius)
	}
	ctx.closePath()
	ctx.fillStyle = grad
	ctx.fill()
	ctx.strokeStyle = `hsla(${hue}, ${saturation}%, ${lightness + 25}%, ${opacity * 0.8})`
	ctx.lineWidth = 1.5
	ctx.stroke()

	// Facet lines
	ctx.strokeStyle = `hsla(${hue}, ${saturation}%, ${lightness + 15}%, ${opacity * 0.15})`
	ctx.lineWidth = 0.5
	for (let i = 0; i < sides; i++) {
		const a = rotation + (Math.PI * 2 * i) / sides
		ctx.beginPath()
		ctx.moveTo(x, y)
		ctx.lineTo(x + Math.cos(a) * radius, y + Math.sin(a) * radius)
		ctx.stroke()
	}

	// Inner highlight facet
	const ir = radius * 0.4
	ctx.beginPath()
	for (let i = 0; i < sides; i++) {
		const a = rotation + Math.PI / sides + (Math.PI * 2 * i) / sides
		if (i === 0) ctx.moveTo(x + Math.cos(a) * ir, y + Math.sin(a) * ir)
		else ctx.lineTo(x + Math.cos(a) * ir, y + Math.sin(a) * ir)
	}
	ctx.closePath()
	ctx.fillStyle = `hsla(${hue}, ${saturation - 10}%, ${lightness + 30}%, ${opacity * 0.25})`
	ctx.fill()
}

function drawConnections(ctx: CanvasRenderingContext2D, state: SimState) {
	for (const [aId, bId] of state.connections) {
		const a = state.crystals.find((c) => c.id === aId)
		const b = state.crystals.find((c) => c.id === bId)
		if (!a || !b) continue
		const alpha = Math.min(a.opacity, b.opacity) * 0.12
		ctx.beginPath()
		ctx.moveTo(a.x, a.y)
		ctx.lineTo(b.x, b.y)
		ctx.strokeStyle = `rgba(150, 220, 255, ${alpha})`
		ctx.lineWidth = 2
		ctx.stroke()
	}
}

export function render(
	ctx: CanvasRenderingContext2D,
	state: SimState,
	width: number,
	height: number,
	camera: { x: number; y: number; z: number }
) {
	ctx.fillStyle = '#0d0d1a'
	ctx.fillRect(0, 0, width, height)

	ctx.save()
	ctx.translate(camera.x, camera.y)
	ctx.scale(camera.z, camera.z)

	drawConnections(ctx, state)
	drawCracks(ctx, state.cracks)
	for (const c of state.crystals) drawGlow(ctx, c)
	for (const c of state.crystals) drawCrystal(ctx, c)

	ctx.restore()
}
