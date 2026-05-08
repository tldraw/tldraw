// Click-to-command helpers. The "command flow" lives here because selecting
// and commanding share the same lookup helpers (find the unit / building /
// resource at a page point), and both are scoped to the human player only —
// AI players have their own controller in ai.ts.

import { Box, Editor, TLShapeId } from 'tldraw'
import { getBuildingKind, getBuildingOwner } from './building-config'
import {
	Command,
	ResourceNode,
	Unit,
	resources$,
	selectedBuildingId$,
	selectedUnitIds$,
	units$,
} from './game-state'
import { HUMAN_PLAYER_ID, PlayerId, isEnemyOf } from './players'
import { UNIT_CONFIG } from './unit-config'

interface Point {
	x: number
	y: number
}

const UNIT_HIT_PADDING = 4

export function findUnitAtPoint(point: Point, ownerFilter?: PlayerId): Unit | null {
	const units = units$.get()
	let hit: Unit | null = null
	let bestDist = Infinity
	for (const u of units) {
		if (ownerFilter && u.owner !== ownerFilter) continue
		if (u.gatherUntilMs > 0) continue
		const dx = u.x - point.x
		const dy = u.y - point.y
		const r = UNIT_CONFIG[u.kind].radius
		const distSq = dx * dx + dy * dy
		const radiusWithPad = r + UNIT_HIT_PADDING
		if (distSq <= radiusWithPad * radiusWithPad && distSq < bestDist) {
			hit = u
			bestDist = distSq
		}
	}
	return hit
}

export function findEnemyUnitAtPoint(point: Point, viewerId: PlayerId): Unit | null {
	const units = units$.get()
	let hit: Unit | null = null
	let bestDist = Infinity
	for (const u of units) {
		if (!isEnemyOf(viewerId, u.owner)) continue
		if (u.gatherUntilMs > 0) continue
		const dx = u.x - point.x
		const dy = u.y - point.y
		const r = UNIT_CONFIG[u.kind].radius
		const distSq = dx * dx + dy * dy
		const radiusWithPad = r + UNIT_HIT_PADDING
		if (distSq <= radiusWithPad * radiusWithPad && distSq < bestDist) {
			hit = u
			bestDist = distSq
		}
	}
	return hit
}

export function findResourceAtPoint(point: Point): ResourceNode | null {
	const resources = resources$.get()
	for (const r of resources) {
		if (r.remaining <= 0) continue
		const dx = r.x - point.x
		const dy = r.y - point.y
		const radius = r.radius + UNIT_HIT_PADDING
		if (dx * dx + dy * dy <= radius * radius) return r
	}
	return null
}

export function findBuildingAtPoint(
	editor: Editor,
	point: Point,
	ownerFilter?: PlayerId
): { id: TLShapeId; owner: PlayerId } | null {
	for (const shape of editor.getCurrentPageShapes()) {
		const kind = getBuildingKind(shape)
		if (!kind) continue
		const owner = getBuildingOwner(shape)
		if (!owner) continue
		if (ownerFilter && owner !== ownerFilter) continue
		const bounds = editor.getShapePageBounds(shape.id)
		if (!bounds) continue
		if (bounds.containsPoint(point as { x: number; y: number })) {
			return { id: shape.id, owner }
		}
	}
	return null
}

export function selectUnitsInBox(box: Box, additive: boolean) {
	const units = units$.get()
	const next = additive ? new Set(selectedUnitIds$.get()) : new Set<number>()
	for (const u of units) {
		if (u.owner !== HUMAN_PLAYER_ID) continue
		if (u.gatherUntilMs > 0) continue
		if (u.x >= box.minX && u.x <= box.maxX && u.y >= box.minY && u.y <= box.maxY) {
			next.add(u.id)
		}
	}
	if (next.size > 0) selectedBuildingId$.set(null)
	selectedUnitIds$.set(next)
}

export function selectSingleUnit(unitId: number, additive: boolean) {
	const next = additive ? new Set(selectedUnitIds$.get()) : new Set<number>()
	if (additive && next.has(unitId)) next.delete(unitId)
	else next.add(unitId)
	if (next.size > 0) selectedBuildingId$.set(null)
	selectedUnitIds$.set(next)
}

export function clearUnitSelection() {
	if (selectedUnitIds$.get().size > 0) selectedUnitIds$.set(new Set())
}

// Issue a command to every selected human unit. Spreads them slightly so they
// don't all stack on the same target point.
export function commandSelectedUnits(editor: Editor, target: Point): boolean {
	const ids = selectedUnitIds$.get()
	if (ids.size === 0) return false
	const allUnits = units$.get()
	const selected = allUnits.filter((u) => ids.has(u.id) && u.owner === HUMAN_PLAYER_ID)
	if (selected.length === 0) return false

	// Priority: enemy unit > resource (workers gather, fighters move) >
	// enemy building > empty ground.
	const enemy = findEnemyUnitAtPoint(target, HUMAN_PLAYER_ID)
	if (enemy) {
		applyCommandToAll(selected, () => ({
			type: 'attack',
			targetUnitId: enemy.id,
			targetBuildingId: null,
		}))
		return true
	}
	const resource = findResourceAtPoint(target)
	if (resource) {
		const workers = selected.filter((u) => u.kind === 'worker')
		const fighters = selected.filter((u) => u.kind !== 'worker')
		if (workers.length > 0) {
			applyCommandToAll(workers, () => ({ type: 'gather', resourceId: resource.id }))
		}
		if (fighters.length > 0) {
			applyMoveSpread(fighters, target.x, target.y)
		}
		return true
	}
	const enemyBuilding = findBuildingAtPoint(editor, target)
	if (enemyBuilding && enemyBuilding.owner !== HUMAN_PLAYER_ID) {
		applyCommandToAll(selected, () => ({
			type: 'attack',
			targetUnitId: null,
			targetBuildingId: enemyBuilding.id,
		}))
		return true
	}

	applyMoveSpread(selected, target.x, target.y)
	return true
}

function applyCommandToAll(selected: Unit[], makeCommand: (u: Unit) => Command) {
	const ids = new Set(selected.map((u) => u.id))
	units$.update((list) => list.map((u) => (ids.has(u.id) ? { ...u, command: makeCommand(u) } : u)))
}

function applyMoveSpread(selected: Unit[], cx: number, cy: number) {
	const targets = new Map<number, { x: number; y: number }>()
	const n = selected.length
	if (n === 1) {
		targets.set(selected[0].id, { x: cx, y: cy })
	} else {
		const ringSize = Math.ceil(Math.sqrt(n))
		const spacing = 28
		const start = -((ringSize - 1) * spacing) / 2
		let i = 0
		for (let row = 0; row < ringSize; row++) {
			for (let col = 0; col < ringSize; col++) {
				if (i >= n) break
				const u = selected[i++]
				targets.set(u.id, { x: cx + start + col * spacing, y: cy + start + row * spacing })
			}
		}
	}
	units$.update((list) =>
		list.map((u) => {
			const t = targets.get(u.id)
			if (!t) return u
			return { ...u, command: { type: 'move', x: t.x, y: t.y } }
		})
	)
}
