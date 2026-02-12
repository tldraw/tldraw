/** Map-based in-memory store for diagram shapes, bindings, and checkpoints. */

import { BindingInfo, TldrawRecord } from './focused-shape.js'

interface DiagramState {
	shapes: [string, TldrawRecord][]
	bindings: BindingInfo[]
	title?: string
	savedAt: string
}

const checkpoints = new Map<string, DiagramState>()

// ─── Current state ────────────────────────────────────────────────────────────
// Shape IDs: externally we use simple IDs (e.g. "box1"). The `shape:` prefix
// is only added at the tldraw record level (record.id = "shape:box1").
// The Map key is always the simple ID.

let shapes = new Map<string, TldrawRecord>()
let bindings: BindingInfo[] = []
let title: string | undefined
let nextIndex = 0

// ─── Shape operations ─────────────────────────────────────────────────────────

export function getShapeById(simpleId: string): TldrawRecord | undefined {
	return shapes.get(simpleId)
}

export function addShape(simpleId: string, record: TldrawRecord): void {
	shapes.set(simpleId, record)
}

export function deleteShape(simpleId: string): void {
	shapes.delete(simpleId)
	const fullId = `shape:${simpleId}`
	bindings = bindings.filter(
		(b) => b.arrowShapeId !== fullId && b.targetShapeId !== fullId
	)
}

export function updateShape(simpleId: string, partial: Partial<TldrawRecord>): void {
	const existing = shapes.get(simpleId)
	if (!existing) return

	// Deep-merge props if both exist
	if (partial.props && existing.props) {
		partial = {
			...partial,
			props: { ...existing.props, ...partial.props },
		}
	}
	shapes.set(simpleId, { ...existing, ...partial })
}

// ─── Binding operations ───────────────────────────────────────────────────────

export function addBinding(binding: BindingInfo): void {
	bindings.push(binding)
}

export function addBindings(newBindings: BindingInfo[]): void {
	bindings.push(...newBindings)
}

// ─── Index management ─────────────────────────────────────────────────────────

export function getNextIndex(): number {
	return nextIndex++
}

// ─── Accessors ────────────────────────────────────────────────────────────────

export function getAllShapes(): TldrawRecord[] {
	return Array.from(shapes.values())
}

export function getAllBindings(): BindingInfo[] {
	return [...bindings]
}

export function getTitle(): string | undefined {
	return title
}

export function setTitle(newTitle: string | undefined): void {
	title = newTitle
}

export function getShapeCount(): number {
	return shapes.size
}

// ─── Clear ────────────────────────────────────────────────────────────────────

export function clearAll(): void {
	shapes.clear()
	bindings = []
	title = undefined
	nextIndex = 0
}

// ─── Checkpoints ──────────────────────────────────────────────────────────────

export function saveCheckpoint(id: string): void {
	checkpoints.set(id, {
		shapes: Array.from(shapes.entries()),
		bindings: [...bindings],
		title,
		savedAt: new Date().toISOString(),
	})
}

export function loadCheckpoint(id: string): DiagramState | undefined {
	return checkpoints.get(id)
}

export function restoreCheckpoint(state: DiagramState): void {
	shapes = new Map(state.shapes)
	bindings = [...state.bindings]
	title = state.title
	nextIndex = shapes.size
}

export function listCheckpoints(): string[] {
	return Array.from(checkpoints.keys())
}
