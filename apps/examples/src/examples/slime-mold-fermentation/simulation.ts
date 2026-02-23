import { Editor, TLShapeId, createShapeId } from 'tldraw'

// --- Types ---

interface GrowingVein {
	arrowId: TLShapeId
	fromX: number
	fromY: number
	dx: number
	dy: number
	progress: number
	targetSugarId: TLShapeId
}

export type PaintMode = 'sugar' | 'salt' | 'spore'

export interface SimState {
	sugarIds: Set<TLShapeId>
	saltIds: Set<TLShapeId>
	sporeIds: TLShapeId[]
	veins: GrowingVein[]
	completedVeinIds: TLShapeId[]
	connectedSugar: Set<TLShapeId>
	connectedTime: Map<TLShapeId, number>
	frontier: { x: number; y: number }[]
	time: number
	active: boolean
}

// --- Constants ---

const VEIN_GROW_SPEED = 0.018
const MAX_BRANCHES = 2
const MAX_GROWING_VEINS = 8
const FERMENT_COLORS = ['yellow', 'orange', 'light-red', 'red', 'violet', 'light-violet'] as const
const FERMENT_TICK_INTERVAL = 90
const PULSE_TICK_INTERVAL = 20

// --- State management ---

export function createSimState(): SimState {
	return {
		sugarIds: new Set(),
		saltIds: new Set(),
		sporeIds: [],
		veins: [],
		completedVeinIds: [],
		connectedSugar: new Set(),
		connectedTime: new Map(),
		frontier: [],
		time: 0,
		active: false,
	}
}

// --- Shape creation ---

export function placeSugar(state: SimState, editor: Editor, x: number, y: number) {
	const id = createShapeId()
	const w = 16 + Math.random() * 8
	const h = 16 + Math.random() * 8
	editor.createShape({
		id,
		type: 'geo',
		x: x - w / 2,
		y: y - h / 2,
		rotation: (Math.random() - 0.5) * 0.3,
		props: {
			geo: 'ellipse',
			w,
			h,
			color: 'yellow',
			fill: 'semi',
			dash: 'draw',
			size: 's',
		},
	})
	state.sugarIds.add(id)
	editor.selectNone()
}

export function placeSalt(state: SimState, editor: Editor, x: number, y: number) {
	const id = createShapeId()
	const w = 16 + Math.random() * 10
	const h = 14 + Math.random() * 8
	editor.createShape({
		id,
		type: 'geo',
		x: x - w / 2,
		y: y - h / 2,
		rotation: (Math.random() - 0.5) * 0.4,
		opacity: 0.85,
		props: {
			geo: 'rectangle',
			w,
			h,
			color: 'grey',
			fill: 'solid',
			dash: 'solid',
			size: 's',
		},
	})
	state.saltIds.add(id)
	editor.selectNone()
}

export function dropSpore(state: SimState, editor: Editor, x: number, y: number) {
	// Place a small star marker at the spore drop point
	const id = createShapeId()
	editor.createShape({
		id,
		type: 'geo',
		x: x - 16,
		y: y - 16,
		props: {
			geo: 'star',
			w: 32,
			h: 32,
			color: 'light-green',
			fill: 'solid',
			dash: 'draw',
			size: 's',
		},
	})
	state.sporeIds.push(id)
	editor.selectNone()

	// Add to the growth frontier
	state.frontier.push({ x, y })
	state.active = true
}

// --- Simulation helpers ---

function getShapeCenter(editor: Editor, id: TLShapeId): { x: number; y: number } | null {
	const bounds = editor.getShapePageBounds(id)
	if (!bounds) return null
	return { x: bounds.center.x, y: bounds.center.y }
}

function pathBlockedBySalt(
	editor: Editor,
	from: { x: number; y: number },
	to: { x: number; y: number },
	saltIds: Set<TLShapeId>
): boolean {
	const steps = 8
	for (let i = 1; i < steps; i++) {
		const t = i / steps
		const px = from.x + (to.x - from.x) * t
		const py = from.y + (to.y - from.y) * t
		for (const saltId of saltIds) {
			const bounds = editor.getShapePageBounds(saltId)
			if (!bounds) continue
			if (px >= bounds.minX && px <= bounds.maxX && py >= bounds.minY && py <= bounds.maxY) {
				return true
			}
		}
	}
	return false
}

function findNearestTargets(
	editor: Editor,
	from: { x: number; y: number },
	state: SimState,
	maxCount: number
): { id: TLShapeId; pos: { x: number; y: number }; dist: number }[] {
	const candidates: { id: TLShapeId; pos: { x: number; y: number }; dist: number }[] = []

	for (const id of state.sugarIds) {
		if (state.connectedSugar.has(id)) continue
		if (state.veins.some((v) => v.targetSugarId === id)) continue
		const pos = getShapeCenter(editor, id)
		if (!pos) continue
		const dist = Math.hypot(pos.x - from.x, pos.y - from.y)
		if (pathBlockedBySalt(editor, from, pos, state.saltIds)) continue
		candidates.push({ id, pos, dist })
	}

	candidates.sort((a, b) => a.dist - b.dist)
	return candidates.slice(0, maxCount)
}

// --- Main tick ---

export function tick(state: SimState, editor: Editor) {
	if (!state.active) return
	state.time++

	editor.run(() => {
		// Grow existing veins
		for (let i = state.veins.length - 1; i >= 0; i--) {
			const vein = state.veins[i]
			vein.progress = Math.min(1, vein.progress + VEIN_GROW_SPEED)

			// Update arrow end position to extend toward target
			editor.updateShape({
				id: vein.arrowId,
				type: 'arrow',
				props: {
					end: {
						x: vein.dx * vein.progress,
						y: vein.dy * vein.progress,
					},
				},
			})

			// Vein reached its target
			if (vein.progress >= 1) {
				state.completedVeinIds.push(vein.arrowId)

				if (!state.connectedSugar.has(vein.targetSugarId)) {
					state.connectedSugar.add(vein.targetSugarId)
					state.connectedTime.set(vein.targetSugarId, state.time)

					// Make the sugar shape look "activated"
					editor.updateShape({
						id: vein.targetSugarId,
						type: 'geo',
						props: { fill: 'solid' },
					})

					// Add target to frontier for further branching
					const targetCenter = getShapeCenter(editor, vein.targetSugarId)
					if (targetCenter) {
						state.frontier.push(targetCenter)
					}
				}

				state.veins.splice(i, 1)
			}
		}

		// Grow new veins from the frontier
		if (state.veins.length < MAX_GROWING_VEINS && state.frontier.length > 0) {
			const source = state.frontier.shift()!
			const targets = findNearestTargets(editor, source, state, MAX_BRANCHES)

			for (const target of targets) {
				const arrowId = createShapeId()
				const dx = target.pos.x - source.x
				const dy = target.pos.y - source.y

				editor.createShape({
					id: arrowId,
					type: 'arrow',
					x: source.x,
					y: source.y,
					props: {
						start: { x: 0, y: 0 },
						end: { x: dx * 0.01, y: dy * 0.01 },
						color: 'green',
						size: 'm',
						dash: 'draw',
						arrowheadStart: 'none',
						arrowheadEnd: 'none',
						bend: (Math.random() - 0.5) * 40,
					},
				})

				state.veins.push({
					arrowId,
					fromX: source.x,
					fromY: source.y,
					dx,
					dy,
					progress: 0.01,
					targetSugarId: target.id,
				})
			}
		}

		// Animate fermentation: shift sugar colors over time
		if (state.time % FERMENT_TICK_INTERVAL === 0) {
			for (const [sugarId, connectTime] of state.connectedTime) {
				const elapsed = state.time - connectTime
				const colorIdx = Math.min(
					FERMENT_COLORS.length - 1,
					Math.floor(elapsed / (FERMENT_TICK_INTERVAL * 2))
				)
				const color = FERMENT_COLORS[colorIdx]

				// Morph fully fermented sugars into cloud shapes
				if (colorIdx >= FERMENT_COLORS.length - 1) {
					editor.updateShape({
						id: sugarId,
						type: 'geo',
						props: { color, geo: 'cloud' as const },
					})
				} else {
					editor.updateShape({
						id: sugarId,
						type: 'geo',
						props: { color },
					})
				}
			}
		}

		// Pulse completed veins between green and light-green
		if (state.time % PULSE_TICK_INTERVAL === 0) {
			const color = Math.floor(state.time / PULSE_TICK_INTERVAL) % 2 === 0 ? 'green' : 'light-green'
			for (const veinId of state.completedVeinIds) {
				editor.updateShape({
					id: veinId,
					type: 'arrow',
					props: { color },
				})
			}
		}
	})
}

// --- Cleanup ---

export function clearAll(state: SimState, editor: Editor) {
	const ids = [
		...state.sugarIds,
		...state.saltIds,
		...state.sporeIds,
		...state.completedVeinIds,
		...state.veins.map((v) => v.arrowId),
	]
	if (ids.length > 0) {
		editor.deleteShapes(ids)
	}
	Object.assign(state, createSimState())
}
