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

/**
 * Generate a unique key for a lint based on its type and shape IDs.
 */
function getLintKey(lint: AgentCanvasLint): string {
	const sortedIds = [...lint.shapeIds].sort().join(',')
	return `${lint.type}:${sortedIds}`
}

/**
 * Tracks shapes created by the agent during a prompt chain and computes lints on them.
 * This is cleared when starting a new top-level prompt (not nested prompts).
 */
export class AgentLintManager extends BaseAgentManager {
	/**
	 * Set of shape IDs created during the current prompt chain.
	 * Persists across nested prompts but clears when a new top-level prompt starts.
	 */
	private createdShapeIds: Set<TLShapeId> = new Set()

	/**
	 * Set of lint keys that have already been surfaced to the agent.
	 * These won't be shown again in subsequent prompts.
	 */
	private surfacedLintKeys: Set<string> = new Set()

	/**
	 * Reset the lint manager to its initial state.
	 */
	reset(): void {
		this.createdShapeIds.clear()
		this.surfacedLintKeys.clear()
	}

	/**
	 * Clear tracking of created shapes (called at start of new prompt chain).
	 * Also clears surfaced lints since we're starting fresh.
	 */
	clearCreatedShapes(): void {
		this.createdShapeIds.clear()
		this.surfacedLintKeys.clear()
	}

	/**
	 * Track shapes created from a diff.
	 * Should be called after each action is applied.
	 */
	trackShapesFromDiff(diff: RecordsDiff<TLRecord>): void {
		for (const [id, record] of Object.entries(diff.added)) {
			if (record.typeName === 'shape') {
				this.createdShapeIds.add(id as TLShapeId)
			}
		}

		// Track removed shapes and remove from created set
		for (const id of Object.keys(diff.removed)) {
			this.createdShapeIds.delete(id as TLShapeId)
		}
	}

	/**
	 * Get all shape IDs created during the current prompt chain.
	 */
	getCreatedShapeIds(): TLShapeId[] {
		return Array.from(this.createdShapeIds)
	}

	/**
	 * Get shapes created during the prompt chain that still exist.
	 */
	getCreatedShapes() {
		const { editor } = this.agent
		return this.getCreatedShapeIds()
			.map((id) => editor.getShape(id))
			.filter((shape) => shape !== undefined)
	}

	/**
	 * Unlock all shapes created during the current prompt chain.
	 * Called when the prompt completes to make shapes editable again.
	 */
	unlockCreatedShapes(): void {
		const { editor } = this.agent
		const createdShapes = this.getCreatedShapes()
		const lockedShapes = createdShapes.filter((shape) => shape.isLocked)
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

	/**
	 * Check if there are any unsurfaced lints for the given shapes.
	 */
	hasUnsurfacedLints(shapes: TLShape[]): boolean {
		return this.getUnsurfacedLintsForShapes(shapes).length > 0
	}

	/**
	 * Get unsurfaced lints for a specific set of shapes.
	 */
	getUnsurfacedLintsForShapes(shapes: TLShape[]): AgentCanvasLint[] {
		const lints = this.detectCanvasLints(shapes)
		return lints.filter((lint) => !this.surfacedLintKeys.has(getLintKey(lint)))
	}

	/**
	 * Mark the given lints as surfaced.
	 * Call this when scheduling a lint-fixing prompt.
	 */
	markLintsAsSurfaced(lints: AgentCanvasLint[]): void {
		for (const lint of lints) {
			this.surfacedLintKeys.add(getLintKey(lint))
		}
	}

	// ============================================================================
	// Lint Detection Functions
	// ============================================================================

	/**
	 * Detect all canvas lints on a set of shapes.
	 */
	detectCanvasLints(shapes: TLShape[]): AgentCanvasLint[] {
		const lints: AgentCanvasLint[] = []

		// Collect shapes for each lint type
		const growYShapes = this.getShapesWithGrowY(shapes)
		const overlappingTextGroups = this.getOverlappingTextGroups(shapes)
		const friendlessArrows = this.getFriendlessArrows(shapes)

		// Convert shapes to lints (converting shape IDs to strings)
		for (const shape of growYShapes) {
			lints.push({
				type: 'growY-on-shape',
				shapeIds: [convertTldrawIdToSimpleId(shape.id)],
			})
		}

		for (const group of overlappingTextGroups) {
			lints.push({
				type: 'overlapping-text',
				shapeIds: group.map((shape) => convertTldrawIdToSimpleId(shape.id)),
			})
		}

		for (const arrow of friendlessArrows) {
			lints.push({
				type: 'friendless-arrow',
				shapeIds: [convertTldrawIdToSimpleId(arrow.id)],
			})
		}

		return lints
	}

	/**
	 * Get shapes where text exceeds the shape bounds (growY > 0) and overlaps with geo shapes.
	 */
	private getShapesWithGrowY(shapes: TLShape[]): TLShape[] {
		const shapesWithGrowY = shapes.filter((shape) => {
			if ('growY' in shape.props) {
				return shape.props.growY > 5 // use 5 because 0 flags shapes that don't need to be changed
			}
			return false
		})

		// Get all geo shapes to check for overlaps
		const geoShapes = shapes.filter((shape) => shape.type === 'geo')

		// Only return shapes that overlap with any geo shape
		const result: TLShape[] = []
		for (const shape of shapesWithGrowY) {
			const overlapsWithGeo = geoShapes.some((geoShape) => this.shapesOverlap(shape, geoShape))
			if (overlapsWithGeo) {
				result.push(shape)
			}
		}
		return result
	}

	/**
	 * Get groups of shapes with overlapping text.
	 */
	private getOverlappingTextGroups(shapes: TLShape[]): TLShape[][] {
		const { editor } = this.agent
		const groups: TLShape[][] = []
		const shapesWithText = shapes.filter((shape) => {
			// Exclude arrows from overlapping text detection
			if (shape.type === 'arrow') return false
			const util = editor.getShapeUtil(shape)
			const text = util.getText(shape)
			return text !== undefined && text.length > 0
		})

		if (shapesWithText.length < 2) {
			return groups
		}

		// Use union-find to group overlapping shapes
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

		// Check all pairs for overlaps using geometry-based detection
		for (let i = 0; i < shapesWithText.length; i++) {
			const shapeA = shapesWithText[i]
			for (let j = i + 1; j < shapesWithText.length; j++) {
				const shapeB = shapesWithText[j]
				if (this.shapesOverlap(shapeA, shapeB)) {
					union(shapeA, shapeB)
				}
			}
		}

		// Group shapes by their root
		const rootGroups = new Map<TLShape, TLShape[]>()
		for (const shape of shapesWithText) {
			const root = find(shape)
			if (!rootGroups.has(root)) {
				rootGroups.set(root, [])
			}
			rootGroups.get(root)!.push(shape)
		}

		// Collect groups with 2+ shapes (overlapping)
		for (const [, group] of rootGroups) {
			if (group.length >= 2) {
				groups.push(group)
			}
		}

		return groups
	}

	/**
	 * Get arrows that are not connected to anything.
	 */
	private getFriendlessArrows(shapes: TLShape[]): TLArrowShape[] {
		const { editor } = this.agent
		const arrowShapes = shapes.filter((shape) => shape.type === 'arrow') as TLArrowShape[]

		const friendlessArrows = arrowShapes.filter((arrow) => {
			const bindings = getArrowBindings(editor, arrow)
			// An arrow is "friendless" if it has no start or end binding
			return !bindings.start || !bindings.end
		})

		return friendlessArrows
	}

	// ============================================================================
	// Helper Functions
	// ============================================================================

	/**
	 * Check if two shapes overlap using geometry-based detection.
	 */
	private shapesOverlap(shapeA: TLShape, shapeB: TLShape): boolean {
		const { editor } = this.agent

		// Quick bounds check first for early exit
		const boundsA = editor.getShapePageBounds(shapeA)
		const boundsB = editor.getShapePageBounds(shapeB)
		if (!boundsA || !boundsB || !Box.Collides(boundsA, boundsB)) {
			return false
		}

		// Get geometry and transform for shape A
		const geometryA = editor.getShapeGeometry(shapeA)
		const pageTransformA = editor.getShapePageTransform(shapeA)
		const verticesA = pageTransformA.applyToPoints(geometryA.vertices)

		// Get clip path if it exists
		const shapeUtilA = editor.getShapeUtil(shapeA.type)
		const clipPathA = shapeUtilA.getClipPath?.(shapeA)
		const polygonA = clipPathA
			? intersectPolygonPolygon(pageTransformA.applyToPoints(clipPathA), verticesA)
			: verticesA

		if (!polygonA || polygonA.length === 0) {
			return false
		}

		// Transform polygon A into shape B's local space
		const pageTransformB = editor.getShapePageTransform(shapeB)
		const polygonAInShapeBSpace = pageTransformB.clone().invert().applyToPoints(polygonA)

		// Check if shape B's geometry overlaps with the transformed polygon
		const geometryB = editor.getShapeGeometry(shapeB)
		return geometryB.overlapsPolygon(polygonAInShapeBSpace)
	}
}
