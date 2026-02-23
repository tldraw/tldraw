import { Editor, TLShapeId, createShapeId } from 'tldraw'

// ---- Types ----

type GeoType =
	| 'rectangle'
	| 'ellipse'
	| 'star'
	| 'diamond'
	| 'triangle'
	| 'cloud'
	| 'hexagon'
	| 'heart'
type ShapeColor =
	| 'red'
	| 'orange'
	| 'yellow'
	| 'green'
	| 'light-green'
	| 'blue'
	| 'violet'
	| 'light-violet'
	| 'light-red'
type FillType = 'solid' | 'semi'

interface ShapeSnapshot {
	geo: GeoType
	color: ShapeColor
	w: number
	h: number
	fill: FillType
}

interface HistoryNode {
	ghostId: TLShapeId
	rootId: TLShapeId
	props: ShapeSnapshot
	ghostX: number
	ghostY: number
	fertilized: boolean
}

interface Plant {
	id: TLShapeId
	x: number
	y: number
	currentProps: ShapeSnapshot
	history: HistoryNode[]
}

interface CompostParticle {
	id: TLShapeId
	fromX: number
	fromY: number
	toX: number
	toY: number
	midX: number
	midY: number
	progress: number
	traits: ShapeSnapshot
	targetIdx: number
}

export interface SimState {
	plants: Plant[]
	particles: CompostParticle[]
	time: number
	mutationTimer: number
}

// ---- Constants ----

const GEOS: GeoType[] = [
	'rectangle',
	'ellipse',
	'star',
	'diamond',
	'triangle',
	'cloud',
	'hexagon',
	'heart',
]
const COLORS: ShapeColor[] = [
	'red',
	'orange',
	'yellow',
	'green',
	'light-green',
	'blue',
	'violet',
	'light-violet',
]
const FILLS: FillType[] = ['solid', 'semi']

export const ROOT_SPACING = 70
const MAX_HISTORY = 5
const MUTATION_INTERVAL = 100
const PARTICLE_SPEED = 0.014

// ---- Helpers ----

function pick<T>(arr: T[]): T {
	return arr[Math.floor(Math.random() * arr.length)]
}

function randomProps(): ShapeSnapshot {
	return {
		geo: pick(GEOS),
		color: pick(COLORS),
		w: 50 + Math.random() * 30,
		h: 50 + Math.random() * 30,
		fill: pick(FILLS),
	}
}

// ---- State ----

export function createSimState(): SimState {
	return { plants: [], particles: [], time: 0, mutationTimer: 0 }
}

// ---- Scene setup ----

export function seedScene(state: SimState, editor: Editor) {
	const positions = [
		{ x: 200, y: 180 },
		{ x: 450, y: 140 },
		{ x: 700, y: 190 },
		{ x: 130, y: 350 },
		{ x: 370, y: 330 },
		{ x: 600, y: 360 },
		{ x: 280, y: 500 },
	]

	editor.run(() => {
		for (const pos of positions) {
			const id = createShapeId()
			const props = randomProps()
			editor.createShape({
				id,
				type: 'geo',
				x: pos.x - props.w / 2,
				y: pos.y - props.h / 2,
				props: {
					geo: props.geo,
					w: props.w,
					h: props.h,
					color: props.color,
					fill: props.fill,
					dash: 'draw',
					size: 'm',
				},
			})
			state.plants.push({ id, x: pos.x, y: pos.y, currentProps: props, history: [] })
		}
	})
	editor.selectNone()
}

// ---- Mutation ----

function addHistoryAndMutate(
	state: SimState,
	editor: Editor,
	idx: number,
	newProps: ShapeSnapshot,
	fertilized: boolean
) {
	const plant = state.plants[idx]
	if (plant.history.length >= MAX_HISTORY) return

	const ghostX = plant.x + (Math.random() - 0.5) * 24
	const ghostY = plant.y + (plant.history.length + 1) * ROOT_SPACING

	const ghostId = createShapeId()
	const rootId = createShapeId()

	// Ghost: faded version of current state
	editor.createShape({
		id: ghostId,
		type: 'geo',
		x: ghostX - plant.currentProps.w * 0.35,
		y: ghostY - plant.currentProps.h * 0.35,
		opacity: 0.25,
		props: {
			geo: plant.currentProps.geo,
			w: plant.currentProps.w * 0.7,
			h: plant.currentProps.h * 0.7,
			color: plant.currentProps.color,
			fill: plant.currentProps.fill,
			dash: 'draw',
			size: 's',
		},
	})

	// Root arrow from previous node to ghost
	const prev = plant.history.length > 0 ? plant.history[plant.history.length - 1] : null
	const fromX = prev ? prev.ghostX : plant.x
	const fromY = prev ? prev.ghostY : plant.y

	editor.createShape({
		id: rootId,
		type: 'arrow',
		x: fromX,
		y: fromY,
		props: {
			start: { x: 0, y: 0 },
			end: { x: ghostX - fromX, y: ghostY - fromY },
			color: fertilized ? 'orange' : 'light-green',
			size: 's',
			dash: 'draw',
			arrowheadStart: 'none',
			arrowheadEnd: 'none',
			bend: (Math.random() - 0.5) * 50,
		},
	})

	plant.history.push({
		ghostId,
		rootId,
		props: { ...plant.currentProps },
		ghostX,
		ghostY,
		fertilized,
	})

	// Apply new props
	plant.currentProps = newProps
	editor.updateShape({
		id: plant.id,
		type: 'geo',
		props: {
			geo: newProps.geo,
			w: newProps.w,
			h: newProps.h,
			color: newProps.color,
			fill: newProps.fill,
		},
	})
}

function naturalMutation(props: ShapeSnapshot): ShapeSnapshot {
	const next = { ...props }
	const r = Math.random()
	if (r < 0.33) {
		next.color = pick(COLORS)
	} else if (r < 0.66) {
		next.geo = pick(GEOS)
	} else {
		next.w = 50 + Math.random() * 30
		next.h = 50 + Math.random() * 30
	}
	return next
}

// ---- Composting ----

export function compostPlant(state: SimState, editor: Editor, plantIdx: number) {
	const plant = state.plants[plantIdx]
	if (plant.history.length === 0) return

	const undoneProps = { ...plant.currentProps }
	const hist = plant.history.pop()!

	// Revert to previous state
	plant.currentProps = { ...hist.props }
	editor.updateShape({
		id: plant.id,
		type: 'geo',
		props: {
			geo: hist.props.geo,
			w: hist.props.w,
			h: hist.props.h,
			color: hist.props.color,
			fill: hist.props.fill,
		},
	})

	// Remove ghost and root
	editor.deleteShapes([hist.ghostId, hist.rootId])

	// Spawn compost particles toward neighbors
	const neighbors = findNeighborIndices(state, plantIdx, 2 + Math.floor(Math.random() * 2))
	for (const ni of neighbors) {
		const neighbor = state.plants[ni]
		const pid = createShapeId()

		editor.createShape({
			id: pid,
			type: 'geo',
			x: plant.x - 7,
			y: plant.y - 7,
			opacity: 0.8,
			props: {
				geo: 'ellipse',
				w: 14,
				h: 14,
				color: undoneProps.color,
				fill: 'solid',
				dash: 'draw',
				size: 's',
			},
		})

		state.particles.push({
			id: pid,
			fromX: plant.x,
			fromY: plant.y,
			toX: neighbor.x,
			toY: neighbor.y,
			midX: (plant.x + neighbor.x) / 2,
			midY: Math.max(plant.y, neighbor.y) + 60 + Math.random() * 40,
			progress: 0,
			traits: undoneProps,
			targetIdx: ni,
		})
	}
}

function findNeighborIndices(state: SimState, idx: number, count: number): number[] {
	const p = state.plants[idx]
	return state.plants
		.map((s, i) => ({ i, d: Math.hypot(s.x - p.x, s.y - p.y) }))
		.filter((d) => d.i !== idx)
		.sort((a, b) => a.d - b.d)
		.slice(0, count)
		.map((d) => d.i)
}

function blendTrait(current: ShapeSnapshot, donor: ShapeSnapshot): ShapeSnapshot {
	const next = { ...current }
	const r = Math.random()
	if (r < 0.4) next.color = donor.color
	else if (r < 0.7) next.geo = donor.geo
	else next.fill = donor.fill
	return next
}

// ---- Tick ----

export function tick(state: SimState, editor: Editor) {
	if (state.plants.length === 0) return
	state.time++

	editor.run(() => {
		// Auto-mutate a random plant periodically
		state.mutationTimer++
		if (state.mutationTimer >= MUTATION_INTERVAL) {
			state.mutationTimer = 0
			const idx = Math.floor(Math.random() * state.plants.length)
			const newProps = naturalMutation(state.plants[idx].currentProps)
			addHistoryAndMutate(state, editor, idx, newProps, false)
		}

		// Animate compost particles along underground bezier arcs
		for (let i = state.particles.length - 1; i >= 0; i--) {
			const p = state.particles[i]
			p.progress += PARTICLE_SPEED
			const t = p.progress

			// Quadratic bezier: source -> underground midpoint -> target
			const x = (1 - t) * (1 - t) * p.fromX + 2 * (1 - t) * t * p.midX + t * t * p.toX
			const y = (1 - t) * (1 - t) * p.fromY + 2 * (1 - t) * t * p.midY + t * t * p.toY

			editor.updateShape({
				id: p.id,
				type: 'geo',
				x: x - 7,
				y: y - 7,
				opacity: 0.8 * (1 - t * 0.5),
			})

			if (t >= 1) {
				editor.deleteShapes([p.id])
				// Fertilize neighbor: blend a composted trait into it
				const blended = blendTrait(state.plants[p.targetIdx].currentProps, p.traits)
				addHistoryAndMutate(state, editor, p.targetIdx, blended, true)
				state.particles.splice(i, 1)
			}
		}

		// Pulse natural root arrows between green shades
		if (state.time % 30 === 0) {
			const phase = Math.floor(state.time / 30) % 2
			for (const plant of state.plants) {
				for (const h of plant.history) {
					if (!h.fertilized) {
						editor.updateShape({
							id: h.rootId,
							type: 'arrow',
							props: { color: phase === 0 ? 'light-green' : 'green' },
						})
					}
				}
			}
		}
	})
}

// ---- Utility ----

export function findPlantAtPoint(state: SimState, editor: Editor, px: number, py: number): number {
	for (let i = 0; i < state.plants.length; i++) {
		const bounds = editor.getShapePageBounds(state.plants[i].id)
		if (!bounds) continue
		if (px >= bounds.minX && px <= bounds.maxX && py >= bounds.minY && py <= bounds.maxY) {
			return i
		}
	}
	return -1
}

export function clearAll(state: SimState, editor: Editor) {
	const ids: TLShapeId[] = []
	for (const plant of state.plants) {
		ids.push(plant.id)
		for (const h of plant.history) {
			ids.push(h.ghostId, h.rootId)
		}
	}
	for (const p of state.particles) {
		ids.push(p.id)
	}
	if (ids.length > 0) editor.deleteShapes(ids)
	Object.assign(state, createSimState())
}
