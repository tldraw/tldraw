/** Action executors — each modifies the store and returns a text summary. */

import { encodePoints } from '../b64-points.js'
import {
	convertFocusedShapeToTldrawRecord,
	FocusedShape,
	TldrawRecord,
} from '../focused-shape.js'
import {
	addBindings,
	addShape,
	clearAll,
	deleteShape,
	getAllShapes,
	getNextIndex,
	getShapeById,
	setTitle,
	updateShape,
} from '../store.js'

// ─── Rich text helper ─────────────────────────────────────────────────────────

function toRichText(text: string): { type: string; content: unknown[] } {
	return {
		type: 'doc',
		content: [
			{
				type: 'paragraph',
				content: text ? [{ type: 'text', text }] : [],
			},
		],
	}
}

// ─── create_shapes ────────────────────────────────────────────────────────────

export function executeCreateShapes(
	shapes: FocusedShape[],
	title?: string
): string {
	if (title !== undefined) {
		setTitle(title)
	}

	const created: string[] = []
	for (const shape of shapes) {
		const index = getNextIndex()
		const { record, bindings } = convertFocusedShapeToTldrawRecord(shape, index)
		addShape(shape.shapeId, record)
		if (bindings.length > 0) {
			addBindings(bindings)
		}
		created.push(`${shape._type} "${shape.shapeId}"`)
	}

	// Second pass: set parent IDs for frame children
	for (const shape of shapes) {
		if (shape._type === 'frame' && 'children' in shape && shape.children?.length) {
			for (const childId of shape.children) {
				updateShape(childId, { parentId: `shape:${shape.shapeId}` })
			}
		}
	}

	return `Created ${created.length} shape(s): ${created.join(', ')}`
}

// ─── update_shapes ────────────────────────────────────────────────────────────

interface UpdateSpec {
	shapeId: string
	x?: number
	y?: number
	w?: number
	h?: number
	color?: string
	fill?: string
	dash?: string
	size?: string
	font?: string
	text?: string
	textAlign?: string
	name?: string
}

export function executeUpdateShapes(updates: UpdateSpec[]): string {
	const updated: string[] = []
	for (const upd of updates) {
		const record = getShapeById(upd.shapeId)
		if (!record) continue

		const recordUpdates: Partial<TldrawRecord> = {}
		const propUpdates: Record<string, unknown> = {}

		if (upd.x !== undefined) recordUpdates.x = upd.x
		if (upd.y !== undefined) recordUpdates.y = upd.y
		if (upd.w !== undefined) propUpdates.w = upd.w
		if (upd.h !== undefined) propUpdates.h = upd.h
		if (upd.color !== undefined) propUpdates.color = upd.color
		if (upd.fill !== undefined) {
			// Map focused fill names to tldraw fill names
			const fillMap: Record<string, string> = {
				none: 'none',
				solid: 'lined-fill',
				background: 'semi',
				tint: 'solid',
				pattern: 'pattern',
			}
			propUpdates.fill = fillMap[upd.fill] ?? upd.fill
		}
		if (upd.dash !== undefined) propUpdates.dash = upd.dash
		if (upd.size !== undefined) propUpdates.size = upd.size
		if (upd.font !== undefined) propUpdates.font = upd.font
		if (upd.text !== undefined) propUpdates.richText = toRichText(upd.text)
		if (upd.textAlign !== undefined) propUpdates.align = upd.textAlign
		if (upd.name !== undefined) propUpdates.name = upd.name

		if (Object.keys(propUpdates).length > 0) {
			recordUpdates.props = propUpdates
		}

		updateShape(upd.shapeId, recordUpdates)
		updated.push(upd.shapeId)
	}
	if (updated.length === 0) {
		return 'No matching shapes found to update.'
	}
	return `Updated ${updated.length} shape(s): ${updated.join(', ')}`
}

// ─── delete_shapes ────────────────────────────────────────────────────────────

export function executeDeleteShapes(shapeIds: string[]): string {
	const deleted: string[] = []
	for (const id of shapeIds) {
		if (getShapeById(id)) {
			deleteShape(id)
			deleted.push(id)
		}
	}
	if (deleted.length === 0) {
		return 'No matching shapes found to delete.'
	}
	return `Deleted ${deleted.length} shape(s): ${deleted.join(', ')}`
}

// ─── move_shapes ──────────────────────────────────────────────────────────────

interface MoveSpec {
	shapeId: string
	x: number
	y: number
}

export function executeMoveShapes(moves: MoveSpec[]): string {
	const moved: string[] = []
	for (const move of moves) {
		const record = getShapeById(move.shapeId)
		if (!record) continue

		updateShape(move.shapeId, { x: move.x, y: move.y })
		moved.push(`${move.shapeId} → (${move.x}, ${move.y})`)
	}
	if (moved.length === 0) {
		return 'No matching shapes found to move.'
	}
	return `Moved ${moved.length} shape(s): ${moved.join(', ')}`
}

// ─── resize_shapes ────────────────────────────────────────────────────────────

export function executeResizeShapes(
	shapeIds: string[],
	scaleX: number,
	scaleY: number,
	originX: number,
	originY: number
): string {
	const resized: string[] = []
	for (const id of shapeIds) {
		const record = getShapeById(id)
		if (!record) continue

		const newX = originX + (record.x - originX) * scaleX
		const newY = originY + (record.y - originY) * scaleY

		const updates: Partial<TldrawRecord> = { x: newX, y: newY }

		if (record.props?.w !== undefined && record.props?.h !== undefined) {
			updates.props = {
				w: record.props.w * Math.abs(scaleX),
				h: record.props.h * Math.abs(scaleY),
			}
		}

		updateShape(id, updates)
		resized.push(id)
	}
	if (resized.length === 0) {
		return 'No matching shapes found to resize.'
	}
	return `Resized ${resized.length} shape(s): ${resized.join(', ')}`
}

// ─── rotate_shapes ────────────────────────────────────────────────────────────

export function executeRotateShapes(
	shapeIds: string[],
	degrees: number,
	originX: number,
	originY: number
): string {
	const radians = (degrees * Math.PI) / 180
	const cos = Math.cos(radians)
	const sin = Math.sin(radians)
	const rotated: string[] = []

	for (const id of shapeIds) {
		const record = getShapeById(id)
		if (!record) continue

		// Rotate position around origin
		const dx = record.x - originX
		const dy = record.y - originY
		const newX = originX + dx * cos - dy * sin
		const newY = originY + dx * sin + dy * cos

		// Add rotation to existing
		const currentRotation = record.rotation ?? 0
		updateShape(id, {
			x: newX,
			y: newY,
			rotation: currentRotation + radians,
		})
		rotated.push(id)
	}
	if (rotated.length === 0) {
		return 'No matching shapes found to rotate.'
	}
	return `Rotated ${rotated.length} shape(s) by ${degrees}°: ${rotated.join(', ')}`
}

// ─── align_shapes ─────────────────────────────────────────────────────────────

type Alignment = 'left' | 'center-horizontal' | 'right' | 'top' | 'center-vertical' | 'bottom'

export function executeAlignShapes(
	shapeIds: string[],
	alignment: Alignment
): string {
	const records = shapeIds
		.map((id) => ({ id, record: getShapeById(id) }))
		.filter((r): r is { id: string; record: TldrawRecord } => r.record !== undefined)

	if (records.length < 2) {
		return 'Need at least 2 shapes to align.'
	}

	// Compute bounds for each shape
	const bounds = records.map(({ id, record }) => {
		const w = record.props?.w ?? 0
		const h = record.props?.h ?? 0
		return { id, x: record.x as number, y: record.y as number, w, h }
	})

	switch (alignment) {
		case 'left': {
			const minX = Math.min(...bounds.map((b) => b.x))
			for (const b of bounds) updateShape(b.id, { x: minX })
			break
		}
		case 'right': {
			const maxRight = Math.max(...bounds.map((b) => b.x + b.w))
			for (const b of bounds) updateShape(b.id, { x: maxRight - b.w })
			break
		}
		case 'center-horizontal': {
			const minX = Math.min(...bounds.map((b) => b.x))
			const maxRight = Math.max(...bounds.map((b) => b.x + b.w))
			const centerX = (minX + maxRight) / 2
			for (const b of bounds) updateShape(b.id, { x: centerX - b.w / 2 })
			break
		}
		case 'top': {
			const minY = Math.min(...bounds.map((b) => b.y))
			for (const b of bounds) updateShape(b.id, { y: minY })
			break
		}
		case 'bottom': {
			const maxBottom = Math.max(...bounds.map((b) => b.y + b.h))
			for (const b of bounds) updateShape(b.id, { y: maxBottom - b.h })
			break
		}
		case 'center-vertical': {
			const minY = Math.min(...bounds.map((b) => b.y))
			const maxBottom = Math.max(...bounds.map((b) => b.y + b.h))
			const centerY = (minY + maxBottom) / 2
			for (const b of bounds) updateShape(b.id, { y: centerY - b.h / 2 })
			break
		}
	}

	return `Aligned ${records.length} shape(s) to ${alignment}.`
}

// ─── distribute_shapes ────────────────────────────────────────────────────────

export function executeDistributeShapes(
	shapeIds: string[],
	direction: 'horizontal' | 'vertical'
): string {
	const records = shapeIds
		.map((id) => ({ id, record: getShapeById(id) }))
		.filter((r): r is { id: string; record: TldrawRecord } => r.record !== undefined)

	if (records.length < 3) {
		return 'Need at least 3 shapes to distribute.'
	}

	const bounds = records.map(({ id, record }) => ({
		id,
		x: record.x as number,
		y: record.y as number,
		w: (record.props?.w ?? 0) as number,
		h: (record.props?.h ?? 0) as number,
	}))

	if (direction === 'horizontal') {
		bounds.sort((a, b) => a.x - b.x)
		const first = bounds[0]
		const last = bounds[bounds.length - 1]
		const totalSpan = last.x + last.w - first.x
		const totalShapeWidth = bounds.reduce((sum, b) => sum + b.w, 0)
		const gap = (totalSpan - totalShapeWidth) / (bounds.length - 1)

		let currentX = first.x
		for (const b of bounds) {
			updateShape(b.id, { x: currentX })
			currentX += b.w + gap
		}
	} else {
		bounds.sort((a, b) => a.y - b.y)
		const first = bounds[0]
		const last = bounds[bounds.length - 1]
		const totalSpan = last.y + last.h - first.y
		const totalShapeHeight = bounds.reduce((sum, b) => sum + b.h, 0)
		const gap = (totalSpan - totalShapeHeight) / (bounds.length - 1)

		let currentY = first.y
		for (const b of bounds) {
			updateShape(b.id, { y: currentY })
			currentY += b.h + gap
		}
	}

	return `Distributed ${records.length} shape(s) ${direction}ly.`
}

// ─── label_shape ──────────────────────────────────────────────────────────────

export function executeLabelShape(shapeId: string, text: string): string {
	const record = getShapeById(shapeId)
	if (!record) {
		return `Shape "${shapeId}" not found.`
	}

	updateShape(shapeId, { props: { richText: toRichText(text) } })
	return `Updated label on "${shapeId}" to "${text}".`
}

// ─── draw_pen ─────────────────────────────────────────────────────────────────

interface DrawPoint {
	x: number
	y: number
	z?: number
}

export function executeDrawPen(
	shapeId: string,
	points: DrawPoint[],
	color?: string,
	fill?: string,
	closed?: boolean,
	style?: string
): string {
	if (points.length === 0) {
		return 'No points provided for draw shape.'
	}

	// Compute bounding box to position shape
	const xs = points.map((p) => p.x)
	const ys = points.map((p) => p.y)
	const minX = Math.min(...xs)
	const minY = Math.min(...ys)

	// Make points relative to shape position
	const relativePoints = points.map((p) => ({
		x: p.x - minX,
		y: p.y - minY,
		z: p.z ?? 0.5,
	}))

	const index = getNextIndex()
	const record: TldrawRecord = {
		id: `shape:${shapeId}`,
		type: 'draw',
		typeName: 'shape',
		parentId: 'page:page',
		index: `a${(index + 1).toString()}`,
		isLocked: false,
		opacity: 1,
		rotation: 0,
		meta: {},
		x: minX,
		y: minY,
		props: {
			color: color ?? 'black',
			dash: style ?? 'draw',
			size: 's',
			fill: fill ?? 'none',
			segments: [{ type: 'free', path: encodePoints(relativePoints) }],
			isClosed: closed ?? false,
			isComplete: true,
			isPen: false,
			scale: 1,
		},
	}

	addShape(shapeId, record)
	return `Created draw shape "${shapeId}" with ${points.length} point(s).`
}

// ─── group_shapes ─────────────────────────────────────────────────────────────

export function executeGroupShapes(shapeIds: string[], groupId: string): string {
	const validIds = shapeIds.filter((id) => getShapeById(id))
	if (validIds.length === 0) {
		return 'No matching shapes found to group.'
	}

	const index = getNextIndex()
	const record: TldrawRecord = {
		id: `shape:${groupId}`,
		type: 'group',
		typeName: 'shape',
		parentId: 'page:page',
		index: `a${(index + 1).toString()}`,
		isLocked: false,
		opacity: 1,
		rotation: 0,
		x: 0,
		y: 0,
		meta: {},
		props: {},
	}
	addShape(groupId, record)

	for (const childId of validIds) {
		updateShape(childId, { parentId: `shape:${groupId}` })
	}

	return `Grouped ${validIds.length} shape(s) into "${groupId}".`
}

// ─── ungroup_shapes ───────────────────────────────────────────────────────────

export function executeUngroupShapes(groupId: string): string {
	const group = getShapeById(groupId)
	if (!group || group.type !== 'group') {
		return `Group "${groupId}" not found.`
	}

	const allShapes = getAllShapes()
	const fullGroupId = `shape:${groupId}`
	let ungroupedCount = 0
	for (const shape of allShapes) {
		if (shape.parentId === fullGroupId) {
			const childSimpleId = (shape.id as string).replace('shape:', '')
			updateShape(childSimpleId, { parentId: 'page:page' })
			ungroupedCount++
		}
	}

	deleteShape(groupId)
	return `Ungrouped ${ungroupedCount} shape(s) from "${groupId}".`
}

// ─── clear_canvas ─────────────────────────────────────────────────────────────

export function executeClearCanvas(): string {
	const count = getAllShapes().length
	clearAll()
	return `Cleared canvas (removed ${count} shape(s)).`
}
