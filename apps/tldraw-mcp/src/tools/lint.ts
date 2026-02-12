/** Canvas lint — detects common layout issues and returns warnings. */

import { BindingInfo, TldrawRecord } from '../focused-shape.js'
import { getAllBindings, getAllShapes, getShapeById } from '../store.js'

export interface LintIssue {
	severity: 'warning' | 'error'
	shapeId?: string
	message: string
}

interface Bounds {
	id: string
	x: number
	y: number
	w: number
	h: number
}

function getShapeBounds(id: string, record: TldrawRecord): Bounds {
	return {
		id,
		x: (record.x ?? 0) as number,
		y: (record.y ?? 0) as number,
		w: (record.props?.w ?? 0) as number,
		h: (record.props?.h ?? 0) as number,
	}
}

function boundsOverlap(a: Bounds, b: Bounds): boolean {
	if (a.w === 0 || a.h === 0 || b.w === 0 || b.h === 0) return false
	return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
}

/** Check for shapes at identical positions (likely duplicates). */
function checkDuplicatePositions(shapes: TldrawRecord[]): LintIssue[] {
	const issues: LintIssue[] = []
	const seen = new Map<string, string>()

	for (const shape of shapes) {
		const key = `${shape.type}:${shape.x}:${shape.y}`
		const simpleId = (shape.id as string).replace('shape:', '')
		const existing = seen.get(key)
		if (existing) {
			issues.push({
				severity: 'warning',
				shapeId: simpleId,
				message: `"${simpleId}" is at the same position as "${existing}" — possible duplicate`,
			})
		} else {
			seen.set(key, simpleId)
		}
	}
	return issues
}

/** Check for significantly overlapping shapes (>50% overlap of smaller shape). */
function checkOverlaps(shapes: TldrawRecord[]): LintIssue[] {
	const issues: LintIssue[] = []
	const boundsList: Bounds[] = []

	for (const shape of shapes) {
		if (shape.type === 'arrow' || shape.type === 'line') continue
		const simpleId = (shape.id as string).replace('shape:', '')
		const b = getShapeBounds(simpleId, shape)
		if (b.w > 0 && b.h > 0) boundsList.push(b)
	}

	const reported = new Set<string>()
	for (let i = 0; i < boundsList.length; i++) {
		for (let j = i + 1; j < boundsList.length; j++) {
			const a = boundsList[i]
			const b = boundsList[j]
			if (!boundsOverlap(a, b)) continue

			const pairKey = [a.id, b.id].sort().join(':')
			if (reported.has(pairKey)) continue

			// Calculate overlap area
			const ox = Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x))
			const oy = Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y))
			const overlapArea = ox * oy
			const smallerArea = Math.min(a.w * a.h, b.w * b.h)

			if (smallerArea > 0 && overlapArea / smallerArea > 0.5) {
				reported.add(pairKey)
				issues.push({
					severity: 'warning',
					message: `"${a.id}" and "${b.id}" overlap significantly`,
				})
			}
		}
	}
	return issues
}

/** Check for disconnected arrows (fromId/toId references missing shapes). */
function checkDisconnectedArrows(bindings: BindingInfo[]): LintIssue[] {
	const issues: LintIssue[] = []
	for (const binding of bindings) {
		const targetSimpleId = binding.targetShapeId.replace('shape:', '')
		if (!getShapeById(targetSimpleId)) {
			const arrowSimpleId = binding.arrowShapeId.replace('shape:', '')
			issues.push({
				severity: 'error',
				shapeId: arrowSimpleId,
				message: `Arrow "${arrowSimpleId}" references missing shape "${targetSimpleId}"`,
			})
		}
	}
	return issues
}

/** Run all lint checks and return issues. */
export function lintCanvas(): LintIssue[] {
	const shapes = getAllShapes()
	const bindings = getAllBindings()
	const issues: LintIssue[] = []

	issues.push(...checkDuplicatePositions(shapes))
	issues.push(...checkOverlaps(shapes))
	issues.push(...checkDisconnectedArrows(bindings))

	return issues
}
