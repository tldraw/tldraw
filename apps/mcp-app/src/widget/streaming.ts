import type { TLBindingCreate, TLShape } from 'tldraw'
import { structuredClone } from 'tldraw'
import {
	convertFocusedShapeToTldrawRecord,
	convertFocusedShapesToTldrawRecords,
	convertTldrawRecordToFocusedShape,
} from '../focused-shape-converters'
import {
	type FocusedShape,
	FocusedShapeSchema,
	FocusedShapeUpdateSchema,
} from '../focused-shape-schema'
import { healJsonArrayString } from '../parse-json'
import { deepMerge, isPlainObject, normalizeShapeId, toSimpleShapeId } from '../shared/utils'
import type { CanvasSnapshot } from './persistence'

export function parsePartialJsonArray(value: string): unknown[] {
	const trimmed = healJsonArrayString(value.trim())
	if (!trimmed.startsWith('[')) return []

	const candidates: string[] = [trimmed]
	if (!trimmed.endsWith(']')) {
		candidates.push(`${trimmed}]`)
	}

	const withoutTrailingBracket = trimmed.endsWith(']') ? trimmed.slice(0, -1) : trimmed
	const lastComma = withoutTrailingBracket.lastIndexOf(',')
	if (lastComma > 0) {
		candidates.push(`${withoutTrailingBracket.slice(0, lastComma)}]`)
	}

	const lastObjectEnd = withoutTrailingBracket.lastIndexOf('}')
	if (lastObjectEnd >= 0) {
		candidates.push(`${withoutTrailingBracket.slice(0, lastObjectEnd + 1)}]`)
	}

	for (const candidate of new Set(candidates)) {
		try {
			const parsed = JSON.parse(candidate)
			if (Array.isArray(parsed)) return parsed
		} catch {
			// Keep trying best-effort candidates.
		}
	}

	return []
}

function dropPotentiallyIncompleteTail<T>(items: T[]): T[] {
	if (items.length <= 1) return []
	return items.slice(0, -1)
}

export function extractToolArguments(input: unknown): Record<string, unknown> | null {
	if (!isPlainObject(input)) return null
	const args = input.arguments
	return isPlainObject(args) ? args : input
}

export function parsePreviewArray(value: unknown, isPartial: boolean): unknown[] {
	let parsedItems: unknown[] = []
	if (Array.isArray(value)) {
		parsedItems = value
	} else if (typeof value === 'string') {
		parsedItems = parsePartialJsonArray(value)
	} else {
		return []
	}

	return isPartial ? dropPotentiallyIncompleteTail(parsedItems) : parsedItems
}

export function parseNewBlankCanvasFlag(value: unknown, isPartial: boolean): boolean | null {
	if (typeof value === 'boolean') return value
	if (typeof value === 'number') return value !== 0
	if (typeof value === 'string') {
		const normalized = value.trim().toLowerCase()
		if (normalized.length === 0) return null
		if (['true', '1', 'yes', 'y', 'on'].includes(normalized)) return true
		if (['false', '0', 'no', 'n', 'off'].includes(normalized)) return false
		if (isPartial) {
			if ('true'.startsWith(normalized)) return true
			if ('false'.startsWith(normalized)) return false
		}
	}
	return null
}

export function toCreatePreviewShapes(
	value: unknown,
	isPartial: boolean
): { shapes: TLShape[]; bindings: TLBindingCreate[] } {
	const candidateItems = parsePreviewArray(value, isPartial)
	const validShapes: FocusedShape[] = []
	for (const item of candidateItems) {
		const parsed = FocusedShapeSchema.safeParse(item)
		if (parsed.success) validShapes.push(parsed.data)
	}
	return convertFocusedShapesToTldrawRecords(validShapes)
}

export function toUpdatePreviewShapes(
	value: unknown,
	isPartial: boolean,
	baseShapes: TLShape[]
): { shapes: TLShape[]; bindings: TLBindingCreate[] } {
	const candidateItems = parsePreviewArray(value, isPartial)
	if (candidateItems.length <= 0) return { shapes: [], bindings: [] }

	const baseShapesById = new Map<string, TLShape>()
	for (const shape of baseShapes) {
		baseShapesById.set(shape.id, shape)
	}

	const previewShapes: TLShape[] = []
	const previewBindings: TLBindingCreate[] = []
	for (const item of candidateItems) {
		const parsedUpdate = FocusedShapeUpdateSchema.safeParse(item)
		if (!parsedUpdate.success) continue

		const update = parsedUpdate.data
		const existingShape = baseShapesById.get(normalizeShapeId(update.shapeId))
		if (!existingShape) continue

		try {
			const existingFocused = convertTldrawRecordToFocusedShape(existingShape)
			const merged = deepMerge(existingFocused, {
				...update,
				shapeId: toSimpleShapeId(update.shapeId),
				_type: update._type ?? existingFocused._type,
			}) as FocusedShape
			const result = convertFocusedShapeToTldrawRecord(merged)
			previewShapes.push(result.shape)
			previewBindings.push(...result.bindings)
		} catch {
			// Ignore unsupported update previews.
		}
	}

	return { shapes: previewShapes, bindings: previewBindings }
}

export function toDeletePreviewSnapshot(
	value: unknown,
	isPartial: boolean,
	committed: CanvasSnapshot
): CanvasSnapshot | null {
	const candidateItems = parsePreviewArray(value, isPartial)
	const shapeIds = candidateItems.filter((item): item is string => typeof item === 'string')
	if (shapeIds.length <= 0) return null

	const idsToDelete = new Set(shapeIds.map((shapeId) => normalizeShapeId(shapeId)))
	const filteredShapes = committed.shapes.filter((shape) => !idsToDelete.has(shape.id))
	if (filteredShapes.length === committed.shapes.length) return null

	return {
		shapes: filteredShapes.map((shape) => structuredClone(shape)),
		assets: [],
	}
}

export function mergeShapesById(base: TLShape[], additions: TLShape[]): TLShape[] {
	const merged = new Map<string, TLShape>()
	for (const shape of base) {
		merged.set(shape.id, structuredClone(shape))
	}
	for (const shape of additions) {
		merged.set(shape.id, structuredClone(shape))
	}
	return [...merged.values()]
}
