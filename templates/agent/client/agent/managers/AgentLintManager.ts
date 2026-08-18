import {
	Box,
	getArrowBindings,
	intersectPolygonPolygon,
	RecordsDiff,
	TLArrowShape,
	TLRecord,
	TLShape,
	TLShapeId,
} from 'tldraw'
import { convertTldrawIdToSimpleId } from '../../../shared/format/convertTldrawShapeToFocusedShape'
import { AgentCanvasLint } from '../../../shared/types/AgentCanvasLint'
import { BaseAgentManager } from './BaseAgentManager'

function getLintKey(lint: AgentCanvasLint): string {
	return `${lint.type}:${[...lint.shapeIds].sort().join(',')}`
}

/**
 * Tracks shapes the agent created during a prompt chain and computes lints on
 * them. Cleared when a new top-level prompt starts (nested prompts keep it).
 */
export class AgentLintManager extends BaseAgentManager {
	private createdShapeIds = new Set<TLShapeId>()

	/** Lints already shown to the agent; not surfaced again in later prompts. */
	private surfacedLintKeys = new Set<string>()

	reset(): void {
		this.createdShapeIds.clear()
		this.surfacedLintKeys.clear()
	}

	/** Called at the start of a new prompt chain. */
	clearCreatedShapes(): void {
		this.reset()
	}

	trackShapesFromDiff(diff: RecordsDiff<TLRecord>): void {
		for (const [id, record] of Object.entries(diff.added)) {
			if (record.typeName === 'shape') {
				this.createdShapeIds.add(id as TLShapeId)
			}
		}
		for (const id of Object.keys(diff.removed)) {
			this.createdShapeIds.delete(id as TLShapeId)
		}
	}

	getCreatedShapeIds(): TLShapeId[] {
		return Array.from(this.createdShapeIds)
	}

	/** Created shapes that still exist. */
	getCreatedShapes() {
		const { editor } = this.agent
		return this.getCreatedShapeIds()
			.map((id) => editor.getShape(id))
			.filter((shape) => shape !== undefined)
	}

	unlockCreatedShapes(): void {
		const { editor } = this.agent
		const lockedShapes = this.getCreatedShapes().filter((shape) => shape.isLocked)
		if (lockedShapes.length === 0) return

		editor.run(
			() => {
				for (const shape of lockedShapes) {
					editor.updateShape({ id: shape.id, type: shape.type, isLocked: false })
				}
			},
			{ ignoreShapeLock: true, history: 'ignore' }
		)
	}

	hasUnsurfacedLints(shapes: TLShape[]): boolean {
		return this.getUnsurfacedLintsForShapes(shapes).length > 0
	}

	getUnsurfacedLintsForShapes(shapes: TLShape[]): AgentCanvasLint[] {
		return this.detectCanvasLints(shapes).filter(
			(lint) => !this.surfacedLintKeys.has(getLintKey(lint))
		)
	}

	/** Call when scheduling a lint-fixing prompt. */
	markLintsAsSurfaced(lints: AgentCanvasLint[]): void {
		for (const lint of lints) {
			this.surfacedLintKeys.add(getLintKey(lint))
		}
	}

	detectCanvasLints(shapes: TLShape[]): AgentCanvasLint[] {
		return [
			...this.getShapesWithGrowY(shapes).map(
				(shape): AgentCanvasLint => ({
					type: 'growY-on-shape',
					shapeIds: [convertTldrawIdToSimpleId(shape.id)],
				})
			),
			...this.getOverlappingTextGroups(shapes).map(
				(group): AgentCanvasLint => ({
					type: 'overlapping-text',
					shapeIds: group.map((shape) => convertTldrawIdToSimpleId(shape.id)),
				})
			),
			...this.getFriendlessArrows(shapes).map(
				(arrow): AgentCanvasLint => ({
					type: 'friendless-arrow',
					shapeIds: [convertTldrawIdToSimpleId(arrow.id)],
				})
			),
		]
	}

	/**
	 * Shapes whose text overflows their bounds and that overlap a geo shape.
	 */
	private getShapesWithGrowY(shapes: TLShape[]): TLShape[] {
		const geoShapes = shapes.filter((shape) => shape.type === 'geo')
		return shapes.filter(
			(shape) =>
				'growY' in shape.props &&
				shape.props.growY > 5 && // 0 would flag shapes that don't need changing
				geoShapes.some((geoShape) => this.shapesOverlap(shape, geoShape))
		)
	}

	/**
	 * Groups of non-arrow shapes with text whose geometry overlaps.
	 */
	private getOverlappingTextGroups(shapes: TLShape[]): TLShape[][] {
		const { editor } = this.agent
		const shapesWithText = shapes.filter((shape) => {
			if (shape.type === 'arrow') return false
			const text = editor.getShapeUtil(shape).getText(shape)
			return text !== undefined && text.length > 0
		})

		if (shapesWithText.length < 2) return []

		// Union-find over overlapping pairs
		const parent = new Map<TLShape, TLShape>()

		const find = (shape: TLShape): TLShape => {
			if (!parent.has(shape)) {
				parent.set(shape, shape)
			}
			const p = parent.get(shape)!
			if (p !== shape) {
				parent.set(shape, find(p))
			}
			return parent.get(shape)!
		}

		const union = (shapeA: TLShape, shapeB: TLShape) => {
			const rootA = find(shapeA)
			const rootB = find(shapeB)
			if (rootA !== rootB) {
				parent.set(rootB, rootA)
			}
		}

		for (let i = 0; i < shapesWithText.length; i++) {
			for (let j = i + 1; j < shapesWithText.length; j++) {
				if (this.shapesOverlap(shapesWithText[i], shapesWithText[j])) {
					union(shapesWithText[i], shapesWithText[j])
				}
			}
		}

		const rootGroups = new Map<TLShape, TLShape[]>()
		for (const shape of shapesWithText) {
			const root = find(shape)
			const group = rootGroups.get(root)
			if (group) {
				group.push(shape)
			} else {
				rootGroups.set(root, [shape])
			}
		}

		return Array.from(rootGroups.values()).filter((group) => group.length >= 2)
	}

	/** Arrows missing a start or end binding. */
	private getFriendlessArrows(shapes: TLShape[]): TLArrowShape[] {
		const { editor } = this.agent
		return shapes
			.filter((shape): shape is TLArrowShape => shape.type === 'arrow')
			.filter((arrow) => {
				const bindings = getArrowBindings(editor, arrow)
				return !bindings.start || !bindings.end
			})
	}

	private shapesOverlap(shapeA: TLShape, shapeB: TLShape): boolean {
		const { editor } = this.agent

		const boundsA = editor.getShapePageBounds(shapeA)
		const boundsB = editor.getShapePageBounds(shapeB)
		if (!boundsA || !boundsB || !Box.Collides(boundsA, boundsB)) {
			return false
		}

		const pageTransformA = editor.getShapePageTransform(shapeA)
		const verticesA = pageTransformA.applyToPoints(editor.getShapeGeometry(shapeA).vertices)
		const clipPathA = editor.getShapeUtil(shapeA.type).getClipPath?.(shapeA)
		const polygonA = clipPathA
			? intersectPolygonPolygon(pageTransformA.applyToPoints(clipPathA), verticesA)
			: verticesA
		if (!polygonA || polygonA.length === 0) return false

		const polygonAInShapeBSpace = editor
			.getShapePageTransform(shapeB)
			.clone()
			.invert()
			.applyToPoints(polygonA)
		return editor.getShapeGeometry(shapeB).overlapsPolygon(polygonAInShapeBSpace)
	}
}
