import { TLContent } from 'tldraw'

// ---- Types ----

interface PathNode {
	x: number
	y: number
}

interface PathEdge {
	a: number
	b: number
}

interface PathNetwork {
	nodes: PathNode[]
	edges: PathEdge[]
}

interface Carrier {
	x: number
	y: number
	edgeIndex: number
	progress: number // 0..1 along current edge
	forward: boolean
	speed: number
	pkg: Package | null
	deliverTarget: { x: number; y: number } | null
}

interface Package {
	content: TLContent
	bounds: { x: number; y: number; w: number; h: number }
	x: number
	y: number
}

interface FoldAnimation {
	startTime: number
	bounds: { x: number; y: number; w: number; h: number }
	targetX: number
	targetY: number
	content: TLContent
	done: boolean
}

interface UnfoldAnimation {
	startTime: number
	bounds: { x: number; y: number; w: number; h: number }
	x: number
	y: number
	content: TLContent
	done: boolean
	placed: boolean
}

export interface SimState {
	network: PathNetwork
	carriers: Carrier[]
	pendingPackages: Package[]
	foldAnimations: FoldAnimation[]
	unfoldAnimations: UnfoldAnimation[]
	clipboardContent: TLContent | null
	clipboardBounds: { x: number; y: number; w: number; h: number } | null
	time: number
}

// ---- Network generation ----

function buildNetwork(): PathNetwork {
	const nodes: PathNode[] = []
	const edges: PathEdge[] = []
	const spacing = 300
	const jitter = 80
	const cols = Math.ceil(4000 / spacing)
	const rows = Math.ceil(4000 / spacing)

	// Create jittered grid
	const grid: number[][] = []
	for (let r = 0; r < rows; r++) {
		grid[r] = []
		for (let c = 0; c < cols; c++) {
			const x = -2000 + c * spacing + (Math.random() - 0.5) * jitter
			const y = -2000 + r * spacing + (Math.random() - 0.5) * jitter
			grid[r][c] = nodes.length
			nodes.push({ x, y })
		}
	}

	// Connect horizontal neighbors
	for (let r = 0; r < rows; r++) {
		for (let c = 0; c < cols - 1; c++) {
			if (Math.random() < 0.7) {
				edges.push({ a: grid[r][c], b: grid[r][c + 1] })
			}
		}
	}

	// Connect vertical neighbors
	for (let r = 0; r < rows - 1; r++) {
		for (let c = 0; c < cols; c++) {
			if (Math.random() < 0.7) {
				edges.push({ a: grid[r][c], b: grid[r + 1][c] })
			}
		}
	}

	// Add some diagonal connections
	for (let r = 0; r < rows - 1; r++) {
		for (let c = 0; c < cols - 1; c++) {
			if (Math.random() < 0.2) {
				edges.push({ a: grid[r][c], b: grid[r + 1][c + 1] })
			}
		}
	}

	return { nodes, edges }
}

function createCarriers(network: PathNetwork, count: number): Carrier[] {
	const carriers: Carrier[] = []
	for (let i = 0; i < count; i++) {
		const edgeIndex = Math.floor(Math.random() * network.edges.length)
		const edge = network.edges[edgeIndex]
		const nodeA = network.nodes[edge.a]
		const progress = Math.random()
		const nodeB = network.nodes[edge.b]
		carriers.push({
			x: nodeA.x + (nodeB.x - nodeA.x) * progress,
			y: nodeA.y + (nodeB.y - nodeA.y) * progress,
			edgeIndex,
			progress,
			forward: Math.random() > 0.5,
			speed: 0.005 + Math.random() * 0.005,
			pkg: null,
			deliverTarget: null,
		})
	}
	return carriers
}

// ---- State management ----

export function createSimState(): SimState {
	const network = buildNetwork()
	return {
		network,
		carriers: createCarriers(network, 10),
		pendingPackages: [],
		foldAnimations: [],
		unfoldAnimations: [],
		clipboardContent: null,
		clipboardBounds: null,
		time: 0,
	}
}

export function startFold(
	state: SimState,
	content: TLContent,
	bounds: { x: number; y: number; w: number; h: number }
) {
	// Find nearest network node to center of bounds
	const cx = bounds.x + bounds.w / 2
	const cy = bounds.y + bounds.h / 2
	let nearest = state.network.nodes[0]
	let bestDist = Infinity
	for (const node of state.network.nodes) {
		const dx = node.x - cx
		const dy = node.y - cy
		const d = dx * dx + dy * dy
		if (d < bestDist) {
			bestDist = d
			nearest = node
		}
	}

	state.clipboardContent = content
	state.clipboardBounds = bounds

	state.foldAnimations.push({
		startTime: state.time,
		bounds,
		targetX: nearest.x,
		targetY: nearest.y,
		content,
		done: false,
	})
}

export function requestUnfold(state: SimState, x: number, y: number): boolean {
	if (!state.clipboardContent || !state.clipboardBounds) return false

	// Find carrier with a package, or the nearest idle carrier with a pending package
	let deliverer: Carrier | null = null
	let bestDist = Infinity

	for (const carrier of state.carriers) {
		if (carrier.pkg) {
			const dx = carrier.x - x
			const dy = carrier.y - y
			const d = dx * dx + dy * dy
			if (d < bestDist) {
				bestDist = d
				deliverer = carrier
			}
		}
	}

	if (deliverer) {
		deliverer.deliverTarget = { x, y }
		return true
	}

	// No carrier has a package — start unfold directly
	state.unfoldAnimations.push({
		startTime: state.time,
		bounds: state.clipboardBounds,
		x,
		y,
		content: state.clipboardContent,
		done: false,
		placed: false,
	})
	return true
}

// ---- Simulation tick ----

function findConnectedEdges(network: PathNetwork, nodeIndex: number): number[] {
	const result: number[] = []
	for (let i = 0; i < network.edges.length; i++) {
		const e = network.edges[i]
		if (e.a === nodeIndex || e.b === nodeIndex) {
			result.push(i)
		}
	}
	return result
}

function advanceCarrier(carrier: Carrier, network: PathNetwork) {
	// If carrier is delivering, move toward target
	if (carrier.deliverTarget) {
		const dx = carrier.deliverTarget.x - carrier.x
		const dy = carrier.deliverTarget.y - carrier.y
		const dist = Math.sqrt(dx * dx + dy * dy)
		const moveSpeed = 4
		if (dist < moveSpeed) {
			carrier.x = carrier.deliverTarget.x
			carrier.y = carrier.deliverTarget.y
			return // arrived
		}
		carrier.x += (dx / dist) * moveSpeed
		carrier.y += (dy / dist) * moveSpeed
		return
	}

	// Normal patrol along edges
	const step = carrier.pkg ? carrier.speed * 1.5 : carrier.speed
	carrier.progress += carrier.forward ? step : -step

	if (carrier.progress >= 1 || carrier.progress <= 0) {
		// Reached a node — pick a new edge
		carrier.progress = Math.max(0, Math.min(1, carrier.progress))
		const edge = network.edges[carrier.edgeIndex]
		const nodeIndex = carrier.forward ? edge.b : edge.a
		const connected = findConnectedEdges(network, nodeIndex)

		if (connected.length === 0) {
			carrier.forward = !carrier.forward
			return
		}

		// Pick a random connected edge that isn't the current one
		const candidates = connected.filter((i) => i !== carrier.edgeIndex)
		const nextEdgeIndex =
			candidates.length > 0
				? candidates[Math.floor(Math.random() * candidates.length)]
				: carrier.edgeIndex

		const nextEdge = network.edges[nextEdgeIndex]
		carrier.edgeIndex = nextEdgeIndex

		if (nextEdge.a === nodeIndex) {
			carrier.forward = true
			carrier.progress = 0
		} else {
			carrier.forward = false
			carrier.progress = 1
		}
	}

	// Update position
	const edge = network.edges[carrier.edgeIndex]
	const nodeA = network.nodes[edge.a]
	const nodeB = network.nodes[edge.b]
	carrier.x = nodeA.x + (nodeB.x - nodeA.x) * carrier.progress
	carrier.y = nodeA.y + (nodeB.y - nodeA.y) * carrier.progress
}

export function tick(state: SimState) {
	state.time++

	// Advance carriers
	for (const carrier of state.carriers) {
		advanceCarrier(carrier, state.network)

		// Check if delivering carrier arrived
		if (carrier.deliverTarget && carrier.pkg) {
			const dx = carrier.x - carrier.deliverTarget.x
			const dy = carrier.y - carrier.deliverTarget.y
			if (dx * dx + dy * dy < 25) {
				// Arrived — start unfold animation
				state.unfoldAnimations.push({
					startTime: state.time,
					bounds: carrier.pkg.bounds,
					x: carrier.deliverTarget.x,
					y: carrier.deliverTarget.y,
					content: carrier.pkg.content,
					done: false,
					placed: false,
				})
				carrier.pkg = null
				carrier.deliverTarget = null
			}
		}
	}

	// Assign pending packages to nearest idle carrier
	const toRemove: number[] = []
	for (let i = 0; i < state.pendingPackages.length; i++) {
		const pkg = state.pendingPackages[i]
		let nearest: Carrier | null = null
		let bestDist = Infinity
		for (const carrier of state.carriers) {
			if (carrier.pkg !== null) continue
			const dx = carrier.x - pkg.x
			const dy = carrier.y - pkg.y
			const d = dx * dx + dy * dy
			if (d < bestDist) {
				bestDist = d
				nearest = carrier
			}
		}
		if (nearest) {
			nearest.pkg = pkg
			toRemove.push(i)
		}
	}
	for (let i = toRemove.length - 1; i >= 0; i--) {
		state.pendingPackages.splice(toRemove[i], 1)
	}

	// Process fold animations
	const FOLD_DURATION = 36 // ~600ms at 60fps
	for (const anim of state.foldAnimations) {
		const elapsed = state.time - anim.startTime
		if (elapsed >= FOLD_DURATION && !anim.done) {
			anim.done = true
			// Create a pending package at the target
			state.pendingPackages.push({
				content: anim.content,
				bounds: anim.bounds,
				x: anim.targetX,
				y: anim.targetY,
			})
		}
	}
	state.foldAnimations = state.foldAnimations.filter(
		(a) => state.time - a.startTime < FOLD_DURATION + 30
	)

	// Process unfold animations — mark done after duration
	const UNFOLD_DURATION = 48 // ~800ms at 60fps
	for (const anim of state.unfoldAnimations) {
		const elapsed = state.time - anim.startTime
		if (elapsed >= UNFOLD_DURATION && !anim.done) {
			anim.done = true
		}
	}
	state.unfoldAnimations = state.unfoldAnimations.filter(
		(a) => state.time - a.startTime < UNFOLD_DURATION + 30
	)
}

// ---- Rendering ----

function drawPathways(ctx: CanvasRenderingContext2D, network: PathNetwork) {
	ctx.strokeStyle = 'rgba(100, 120, 160, 0.06)'
	ctx.lineWidth = 1
	for (const edge of network.edges) {
		const a = network.nodes[edge.a]
		const b = network.nodes[edge.b]
		ctx.beginPath()
		ctx.moveTo(a.x, a.y)
		ctx.lineTo(b.x, b.y)
		ctx.stroke()
	}
}

function drawCarriers(ctx: CanvasRenderingContext2D, carriers: Carrier[], time: number) {
	for (const carrier of carriers) {
		const hasPackage = carrier.pkg !== null
		const pulse = Math.sin(time * 0.1) * 0.3 + 0.7

		if (hasPackage) {
			// Glow for carrying carriers
			const glow = ctx.createRadialGradient(carrier.x, carrier.y, 0, carrier.x, carrier.y, 16)
			glow.addColorStop(0, `rgba(255, 160, 60, ${0.3 * pulse})`)
			glow.addColorStop(1, 'rgba(255, 160, 60, 0)')
			ctx.beginPath()
			ctx.arc(carrier.x, carrier.y, 16, 0, Math.PI * 2)
			ctx.fillStyle = glow
			ctx.fill()
		}

		// Carrier dot
		ctx.beginPath()
		ctx.arc(carrier.x, carrier.y, hasPackage ? 4 : 3, 0, Math.PI * 2)
		ctx.fillStyle = hasPackage
			? `rgba(255, 180, 80, ${0.7 + 0.3 * pulse})`
			: `rgba(100, 140, 200, ${0.4 + 0.2 * pulse})`
		ctx.fill()

		// Package square on carrier
		if (hasPackage) {
			ctx.fillStyle = `rgba(255, 200, 100, ${0.8 * pulse})`
			ctx.fillRect(carrier.x - 4, carrier.y - 4, 8, 8)
		}
	}
}

function drawPendingPackages(ctx: CanvasRenderingContext2D, packages: Package[], time: number) {
	const pulse = Math.sin(time * 0.15) * 0.3 + 0.7
	for (const pkg of packages) {
		ctx.fillStyle = `rgba(255, 200, 100, ${0.6 * pulse})`
		ctx.fillRect(pkg.x - 4, pkg.y - 4, 8, 8)

		// Pulsing ring
		const ringR = 8 + Math.sin(time * 0.1) * 3
		ctx.strokeStyle = `rgba(255, 200, 100, ${0.3 * pulse})`
		ctx.lineWidth = 1
		ctx.beginPath()
		ctx.arc(pkg.x, pkg.y, ringR, 0, Math.PI * 2)
		ctx.stroke()
	}
}

function drawFoldAnimations(ctx: CanvasRenderingContext2D, anims: FoldAnimation[], time: number) {
	const FOLD_DURATION = 36
	for (const anim of anims) {
		const elapsed = time - anim.startTime
		const t = Math.min(1, elapsed / FOLD_DURATION)

		// Easing
		const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2

		const { bounds } = anim
		const cx = bounds.x + bounds.w / 2
		const cy = bounds.y + bounds.h / 2

		// Shrinking phase (0..0.6) — rect shrinks from full bounds to 12x12
		// Sink phase (0.6..1.0) — small rect moves to target and fades
		if (t < 0.6) {
			const st = t / 0.6
			const se = st < 0.5 ? 2 * st * st : 1 - Math.pow(-2 * st + 2, 2) / 2
			const w = bounds.w * (1 - se) + 12 * se
			const h = bounds.h * (1 - se) + 12 * se
			const rx = cx - w / 2
			const ry = cy - h / 2

			ctx.setLineDash([4, 4])
			ctx.strokeStyle = `rgba(200, 180, 255, ${0.6 * (1 - se * 0.5)})`
			ctx.lineWidth = 1.5
			ctx.strokeRect(rx, ry, w, h)
			ctx.setLineDash([])

			// Ripple ring
			const ringR = 20 + se * 40
			ctx.strokeStyle = `rgba(200, 180, 255, ${0.3 * (1 - se)})`
			ctx.lineWidth = 1
			ctx.beginPath()
			ctx.arc(cx, cy, ringR, 0, Math.PI * 2)
			ctx.stroke()
		} else {
			const st = (t - 0.6) / 0.4
			const se = st < 0.5 ? 2 * st * st : 1 - Math.pow(-2 * st + 2, 2) / 2
			// Move from center to target
			const x = cx + (anim.targetX - cx) * se
			const y = cy + (anim.targetY - cy) * se
			const alpha = 0.5 * (1 - se)

			ctx.fillStyle = `rgba(255, 200, 100, ${alpha})`
			ctx.fillRect(x - 6, y - 6, 12, 12)

			// Trail
			ctx.strokeStyle = `rgba(255, 200, 100, ${alpha * 0.4})`
			ctx.lineWidth = 1
			ctx.setLineDash([2, 4])
			ctx.beginPath()
			ctx.moveTo(cx, cy)
			ctx.lineTo(x, y)
			ctx.stroke()
			ctx.setLineDash([])
		}
	}
}

function drawUnfoldAnimations(
	ctx: CanvasRenderingContext2D,
	anims: UnfoldAnimation[],
	time: number
) {
	const UNFOLD_DURATION = 48
	for (const anim of anims) {
		const elapsed = time - anim.startTime
		const t = Math.min(1, elapsed / UNFOLD_DURATION)

		const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2

		const { bounds } = anim

		// Rise phase (0..0.3) — package appears and brightens
		// Unfold phase (0.3..1.0) — expands from 12x12 to full bounds
		if (t < 0.3) {
			const st = t / 0.3
			const alpha = st * 0.8

			ctx.fillStyle = `rgba(255, 200, 100, ${alpha})`
			ctx.fillRect(anim.x - 6, anim.y - 6, 12, 12)

			// Rising ring
			const ringR = 12 - st * 4
			ctx.strokeStyle = `rgba(255, 200, 100, ${alpha * 0.5})`
			ctx.lineWidth = 1
			ctx.beginPath()
			ctx.arc(anim.x, anim.y, ringR, 0, Math.PI * 2)
			ctx.stroke()
		} else {
			const st = (t - 0.3) / 0.7
			const se = st < 0.5 ? 2 * st * st : 1 - Math.pow(-2 * st + 2, 2) / 2

			const w = 12 + (bounds.w - 12) * se
			const h = 12 + (bounds.h - 12) * se
			const rx = anim.x - w / 2
			const ry = anim.y - h / 2
			const alpha = 0.6 * (1 - se * 0.7)

			ctx.setLineDash([4, 4])
			ctx.strokeStyle = `rgba(100, 200, 255, ${alpha})`
			ctx.lineWidth = 1.5
			ctx.strokeRect(rx, ry, w, h)
			ctx.setLineDash([])

			// Bloom glow at completion
			if (se > 0.8) {
				const bt = (se - 0.8) / 0.2
				const bloomR = bounds.w * 0.3 + bt * bounds.w * 0.5
				const bloomAlpha = 0.2 * (1 - bt)
				const bloom = ctx.createRadialGradient(anim.x, anim.y, 0, anim.x, anim.y, bloomR)
				bloom.addColorStop(0, `rgba(100, 200, 255, ${bloomAlpha})`)
				bloom.addColorStop(1, 'rgba(100, 200, 255, 0)')
				ctx.beginPath()
				ctx.arc(anim.x, anim.y, bloomR, 0, Math.PI * 2)
				ctx.fillStyle = bloom
				ctx.fill()
			}
		}
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

	drawPathways(ctx, state.network)
	drawPendingPackages(ctx, state.pendingPackages, state.time)
	drawCarriers(ctx, state.carriers, state.time)
	drawFoldAnimations(ctx, state.foldAnimations, state.time)
	drawUnfoldAnimations(ctx, state.unfoldAnimations, state.time)

	ctx.restore()
}
