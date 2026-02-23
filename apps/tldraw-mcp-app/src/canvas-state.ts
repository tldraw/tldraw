import { structuredClone } from 'tldraw'
import {
	convertFocusedShapeToTldrawRecord,
	convertTldrawRecordToFocusedShape,
	type FocusedShape,
	type FocusedShapeUpdate,
	type TldrawRecord,
} from './focused-shape.js'

export interface CanvasSnapshot {
	canvasId: string
	canvasNumber: number
	activeCanvasId: string
	activeCanvasNumber: number
	availableCanvasIds: string[]
	canvases: CanvasInfo[]
	version: number
	shapes: TldrawRecord[]
	focusedShapes: FocusedShape[]
	[key: string]: unknown
}

export interface CanvasInfo {
	canvasId: string
	canvasNumber: number
	version: number
	shapeCount: number
	isActive: boolean
}

interface CanvasData {
	version: number
	shapesById: Map<string, TldrawRecord>
}

const canvases = new Map<string, CanvasData>()
let canvasCounter = 0
let activeCanvasId = createCanvas()

function createCanvas(source?: CanvasData): string {
	canvasCounter += 1
	const canvasId = `canvas-${canvasCounter}`
	const next = source ? cloneCanvasData(source) : createEmptyCanvasData()
	canvases.set(canvasId, next)
	return canvasId
}

function createEmptyCanvasData(): CanvasData {
	return {
		version: 0,
		shapesById: new Map(),
	}
}

function cloneCanvasData(source: CanvasData): CanvasData {
	const clonedShapes = new Map<string, TldrawRecord>()
	for (const [id, record] of source.shapesById.entries()) {
		clonedShapes.set(id, cloneRecord(record))
	}

	return {
		version: source.version,
		shapesById: clonedShapes,
	}
}

function getCanvasDataOrThrow(canvasId: string): CanvasData {
	const data = canvases.get(canvasId)
	if (!data) {
		throw new Error(`Unknown canvas id: ${canvasId}`)
	}
	return data
}

function getCanvasNumber(canvasId: string): number {
	const match = canvasId.match(/(\d+)$/)
	return match ? Number(match[1]) : 0
}

function resolveCanvasId(canvasId?: string): string {
	if (!canvasId) return activeCanvasId
	const trimmed = canvasId.trim()
	if (!trimmed) return activeCanvasId
	if (!canvases.has(trimmed)) {
		throw new Error(`Unknown canvas id: ${canvasId}`)
	}
	return trimmed
}

function forkActiveCanvas(): { canvasId: string; data: CanvasData } {
	const active = getCanvasDataOrThrow(activeCanvasId)
	const nextCanvasId = createCanvas(active)
	activeCanvasId = nextCanvasId
	return {
		canvasId: nextCanvasId,
		data: getCanvasDataOrThrow(nextCanvasId),
	}
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function cloneRecord(record: TldrawRecord): TldrawRecord {
	return structuredClone(record)
}

function normalizeShapeId(id: string): string {
	return id.startsWith('shape:') ? id : `shape:${id}`
}

function toSimpleShapeId(id: string): string {
	return id.replace(/^shape:/, '')
}

function parseTldrawRecord(input: unknown): TldrawRecord | null {
	if (!isPlainObject(input)) return null
	if (typeof input.id !== 'string') return null
	if (typeof input.type !== 'string') return null

	return {
		...(input as TldrawRecord),
		id: normalizeShapeId(input.id),
	}
}

function bumpVersion(canvasId: string): void {
	const data = getCanvasDataOrThrow(canvasId)
	data.version += 1
}

function deepMerge(base: unknown, patch: unknown): unknown {
	if (!isPlainObject(base) || !isPlainObject(patch)) return patch

	const merged: Record<string, unknown> = { ...base }
	for (const [key, value] of Object.entries(patch)) {
		merged[key] = deepMerge(merged[key], value)
	}
	return merged
}

function getFocusedShapes(canvasId: string): FocusedShape[] {
	const data = getCanvasDataOrThrow(canvasId)
	const focused: FocusedShape[] = []
	for (const record of data.shapesById.values()) {
		try {
			focused.push(convertTldrawRecordToFocusedShape(record))
		} catch {
			// Ignore malformed records during focused conversion.
		}
	}
	return focused
}

function getCanvasInfos(): CanvasInfo[] {
	return Array.from(canvases.entries())
		.map(([canvasId, data]) => ({
			canvasId,
			canvasNumber: getCanvasNumber(canvasId),
			version: data.version,
			shapeCount: data.shapesById.size,
			isActive: canvasId === activeCanvasId,
		}))
		.sort((a, b) => a.canvasNumber - b.canvasNumber)
}

export function getCanvasSnapshot(canvasId?: string): CanvasSnapshot {
	const resolvedCanvasId = resolveCanvasId(canvasId)
	const data = getCanvasDataOrThrow(resolvedCanvasId)
	const canvasesInfo = getCanvasInfos()
	return {
		canvasId: resolvedCanvasId,
		canvasNumber: getCanvasNumber(resolvedCanvasId),
		activeCanvasId,
		activeCanvasNumber: getCanvasNumber(activeCanvasId),
		availableCanvasIds: canvasesInfo.map((canvas) => canvas.canvasId),
		canvases: canvasesInfo,
		version: data.version,
		shapes: Array.from(data.shapesById.values()).map((record) => cloneRecord(record)),
		focusedShapes: getFocusedShapes(resolvedCanvasId),
	}
}

export function prepareCanvasForView(): CanvasSnapshot {
	const { canvasId } = forkActiveCanvas()
	return getCanvasSnapshot(canvasId)
}

export function replaceCanvasSnapshot(shapes: unknown[], canvasId: string): CanvasSnapshot {
	const resolvedCanvasId = resolveCanvasId(canvasId)
	const data = getCanvasDataOrThrow(resolvedCanvasId)
	const next = new Map<string, TldrawRecord>()
	for (const input of shapes) {
		const record = parseTldrawRecord(input)
		if (!record) continue
		next.set(record.id as string, cloneRecord(record))
	}

	data.shapesById.clear()
	for (const [id, record] of next.entries()) {
		data.shapesById.set(id, record)
	}
	// Don't reset activeCanvasId here — widget pushes should only update
	// their own canvas, not hijack the global active pointer.
	bumpVersion(resolvedCanvasId)
	return getCanvasSnapshot(resolvedCanvasId)
}

export function createCanvasShapes(shapes: FocusedShape[]): {
	snapshot: CanvasSnapshot
	created: string[]
} {
	const data = getCanvasDataOrThrow(activeCanvasId)
	const created: string[] = []

	for (const shape of shapes) {
		try {
			const converted = convertFocusedShapeToTldrawRecord(shape)
			const id = normalizeShapeId(String(converted.id))
			const existing = data.shapesById.get(id)
			const record = cloneRecord(converted)
			if (existing && typeof existing.index === 'string') {
				record.index = existing.index
			}
			data.shapesById.set(id, record)
			created.push(toSimpleShapeId(id))
		} catch {
			// Skip invalid or unsupported create inputs.
		}
	}

	if (created.length > 0) {
		bumpVersion(activeCanvasId)
	}

	return { snapshot: getCanvasSnapshot(activeCanvasId), created }
}

export function updateCanvasShapes(updates: FocusedShapeUpdate[]): {
	snapshot: CanvasSnapshot
	updated: string[]
} {
	const data = getCanvasDataOrThrow(activeCanvasId)
	const updated: string[] = []

	for (const update of updates) {
		const id = normalizeShapeId(update.shapeId)
		if (!data.shapesById.has(id)) continue

		try {
			const existing = data.shapesById.get(id)
			if (!existing) continue

			const existingFocused = convertTldrawRecordToFocusedShape(existing)
			const merged = deepMerge(existingFocused, {
				...update,
				shapeId: toSimpleShapeId(id),
				_type: update._type ?? existingFocused._type,
			}) as FocusedShape

			const converted = convertFocusedShapeToTldrawRecord(merged)
			const record = cloneRecord(converted)
			if (typeof existing.index === 'string') {
				record.index = existing.index
			}
			data.shapesById.set(id, record)
			updated.push(toSimpleShapeId(id))
		} catch {
			// Skip invalid update inputs.
		}
	}

	if (updated.length > 0) {
		bumpVersion(activeCanvasId)
	}

	return { snapshot: getCanvasSnapshot(activeCanvasId), updated }
}

export function deleteCanvasShapes(shapeIds: string[]): {
	snapshot: CanvasSnapshot
	deleted: string[]
} {
	const data = getCanvasDataOrThrow(activeCanvasId)
	const deleted: string[] = []

	for (const shapeId of shapeIds) {
		const id = normalizeShapeId(shapeId)
		if (!data.shapesById.has(id)) continue
		data.shapesById.delete(id)
		deleted.push(toSimpleShapeId(id))
	}

	if (deleted.length > 0) {
		bumpVersion(activeCanvasId)
	}

	return { snapshot: getCanvasSnapshot(activeCanvasId), deleted }
}
