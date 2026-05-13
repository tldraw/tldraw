import { TLBinding, TLDocument, TLRecord, TLShape } from '@tldraw/tlschema'

export interface PreviewBounds {
	x: number
	y: number
	w: number
	h: number
}

/**
 * Parse a `bounds=x,y,w,h` query value. Returns null if missing/invalid.
 */
export function parsePreviewBounds(raw: string | null): PreviewBounds | null {
	if (!raw) return null
	const parts = raw.split(',').map(Number)
	if (parts.length !== 4) return null
	const [x, y, w, h] = parts
	if (![x, y, w, h].every(Number.isFinite)) return null
	if (w <= 0 || h <= 0) return null
	return { x, y, w, h }
}

/**
 * Look at `TLDocument.meta.previewViewport` on the document record in `records`,
 * if present and well-formed. Documents opt in to per-doc preview viewports by
 * writing this field (e.g. via the `Set preview to viewport` UI).
 */
export function readPreviewBoundsFromDocument(records: TLRecord[]): PreviewBounds | null {
	const doc = records.find((r) => r.typeName === 'document') as TLDocument | undefined
	const candidate = (doc?.meta as Record<string, unknown> | undefined)?.previewViewport
	if (!candidate || typeof candidate !== 'object') return null
	const { x, y, w, h } = candidate as Record<string, unknown>
	if (
		typeof x !== 'number' ||
		typeof y !== 'number' ||
		typeof w !== 'number' ||
		typeof h !== 'number'
	) {
		return null
	}
	if (w <= 0 || h <= 0) return null
	return { x, y, w, h }
}

/**
 * Conservative server-side filter: keep records likely to appear inside the given
 * page-space bounds. Heuristic — covers shapes with explicit `w`/`h` or point lists;
 * keeps arrows / groups / unknown shapes / non-shape records unconditionally.
 *
 * Bindings whose `fromId` or `toId` references a filtered-out shape are dropped, so
 * the store loads cleanly without orphan binding references.
 */
export function filterRecordsToBounds(records: TLRecord[], bounds: PreviewBounds): TLRecord[] {
	const shapesById = new Map<string, TLShape>()
	for (const r of records) {
		if (r.typeName === 'shape') shapesById.set(r.id, r as TLShape)
	}

	const bindingsByFromId = new Map<string, TLBinding[]>()
	for (const r of records) {
		if (r.typeName !== 'binding') continue
		const b = r as TLBinding
		const arr = bindingsByFromId.get(b.fromId)
		if (arr) arr.push(b)
		else bindingsByFromId.set(b.fromId, [b])
	}

	const keptShapeIds = new Set<string>()

	// Pass 1: non-arrow shapes whose local aabb intersects bounds.
	for (const record of records) {
		if (record.typeName !== 'shape') continue
		const shape = record as TLShape
		if (shape.type === 'arrow') continue
		if (shapeIntersectsBounds(shape, bounds)) {
			keptShapeIds.add(record.id)
		}
	}

	// Pass 2: arrows — compute rough page-space segment using binding targets
	// (or stored local terminals when unbound). Drop arrows whose segment
	// doesn't cross the bounds. Keep binding-target shapes for surviving arrows
	// so they render at their true positions.
	for (const record of records) {
		if (record.typeName !== 'shape') continue
		const shape = record as TLShape
		if (shape.type !== 'arrow') continue
		if (arrowIntersectsBounds(shape, bounds, shapesById, bindingsByFromId)) {
			keptShapeIds.add(record.id)
			for (const b of bindingsByFromId.get(record.id) ?? []) {
				keptShapeIds.add(b.toId)
			}
		}
	}

	return records.filter((record) => {
		if (record.typeName === 'shape') {
			return keptShapeIds.has(record.id)
		}
		if (record.typeName === 'binding') {
			const b = record as TLBinding
			return keptShapeIds.has(b.fromId) && keptShapeIds.has(b.toId)
		}
		return true
	})
}

function arrowIntersectsBounds(
	arrow: TLShape,
	bounds: PreviewBounds,
	shapesById: Map<string, TLShape>,
	bindingsByFromId: Map<string, TLBinding[]>
): boolean {
	const props = arrow.props as Record<string, any>
	const start = {
		x: arrow.x + (props.start?.x ?? 0),
		y: arrow.y + (props.start?.y ?? 0),
	}
	const end = {
		x: arrow.x + (props.end?.x ?? 0),
		y: arrow.y + (props.end?.y ?? 0),
	}

	for (const b of bindingsByFromId.get(arrow.id) ?? []) {
		const target = shapesById.get(b.toId)
		if (!target) continue
		const aabb = getLocalAabb(target)
		const cx = target.x + (aabb ? aabb.x + aabb.w / 2 : 0)
		const cy = target.y + (aabb ? aabb.y + aabb.h / 2 : 0)
		const terminal = (b.props as Record<string, any> | undefined)?.terminal
		if (terminal === 'start') {
			start.x = cx
			start.y = cy
		} else if (terminal === 'end') {
			end.x = cx
			end.y = cy
		}
	}

	// Elbow arrows route through right-angle corners that sit on the start/end
	// AABB, so the chord AABB already covers their path. Arc arrows bulge
	// perpendicular to the chord by `|bend|` — pad the AABB by that amount.
	const bend = Math.abs(Number(props.bend) || 0)
	const minX = Math.min(start.x, end.x) - bend
	const maxX = Math.max(start.x, end.x) + bend
	const minY = Math.min(start.y, end.y) - bend
	const maxY = Math.max(start.y, end.y) + bend
	return (
		maxX > bounds.x && minX < bounds.x + bounds.w && maxY > bounds.y && minY < bounds.y + bounds.h
	)
}

function shapeIntersectsBounds(shape: TLShape, bounds: PreviewBounds): boolean {
	// Groups depend on children. Frames can be very large containers. Keep both.
	if (shape.type === 'group' || shape.type === 'frame') {
		return true
	}

	const sx = shape.x
	const sy = shape.y
	if (!Number.isFinite(sx) || !Number.isFinite(sy)) return true

	const localAabb = getLocalAabb(shape)
	if (!localAabb) return true

	let minX = sx + localAabb.x
	let minY = sy + localAabb.y
	let w = localAabb.w
	let h = localAabb.h

	if (shape.rotation) {
		// Conservative bounding circle around the local aabb, then re-aabb after rotation.
		const cx = minX + w / 2
		const cy = minY + h / 2
		const r = Math.sqrt(w * w + h * h) / 2
		minX = cx - r
		minY = cy - r
		w = 2 * r
		h = 2 * r
	}

	const maxX = bounds.x + bounds.w
	const maxY = bounds.y + bounds.h
	return minX < maxX && minX + w > bounds.x && minY < maxY && minY + h > bounds.y
}

/**
 * Local-space aabb of the shape — `x`/`y` relative to the shape's origin. Returns
 * null if we can't compute it cheaply (caller should keep the shape).
 */
function getLocalAabb(shape: TLShape): { x: number; y: number; w: number; h: number } | null {
	const props = shape.props as Record<string, any>

	switch (shape.type) {
		case 'geo':
		case 'image':
		case 'video':
		case 'embed':
		case 'bookmark': {
			const w = props.w
			const h = props.h
			if (!Number.isFinite(w) || !Number.isFinite(h)) return null
			return { x: 0, y: 0, w, h }
		}
		case 'note': {
			// Default tldraw note is 200×200 with optional growY for autosized content.
			const w = Number.isFinite(props.w) ? props.w : 200
			const h =
				(Number.isFinite(props.h) ? props.h : 200) +
				(Number.isFinite(props.growY) ? props.growY : 0)
			return { x: 0, y: 0, w, h }
		}
		case 'text': {
			const w = Number.isFinite(props.w) ? props.w : 200
			// Text height is computed from content; use w as a generous proxy.
			return { x: 0, y: 0, w, h: w }
		}
		case 'draw':
		case 'highlight': {
			const segments = props.segments as
				| Array<{ points: Array<{ x: number; y: number }> }>
				| undefined
			return aabbFromPoints(segments?.flatMap((s) => s.points ?? []))
		}
		case 'line': {
			const points = props.points
				? (Object.values(props.points) as Array<{ x: number; y: number }>)
				: null
			return aabbFromPoints(points)
		}
		default:
			return null
	}
}

function aabbFromPoints(
	points: Array<{ x: number; y: number }> | null | undefined
): { x: number; y: number; w: number; h: number } | null {
	if (!points || points.length === 0) return null
	let minX = Infinity
	let minY = Infinity
	let maxX = -Infinity
	let maxY = -Infinity
	for (const p of points) {
		if (!Number.isFinite(p?.x) || !Number.isFinite(p?.y)) continue
		if (p.x < minX) minX = p.x
		if (p.y < minY) minY = p.y
		if (p.x > maxX) maxX = p.x
		if (p.y > maxY) maxY = p.y
	}
	if (!Number.isFinite(minX)) return null
	return { x: minX, y: minY, w: maxX - minX, h: maxY - minY }
}
