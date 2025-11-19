import {
	BindingOnShapeChangeOptions,
	BindingOnShapeDeleteOptions,
	BindingUtil,
	Editor,
	TLBaseBinding,
	TLShapeId,
	Vec,
} from 'tldraw'
import { GlobShape } from './GlobShapeUtil'
import { getGlobTangentUpdate } from './GlobTool/GlobTool'
import { NodeShape } from './NodeShapeUtil'
import { getStartAndEndNodes } from './shared'

export type GlobBinding = TLBaseBinding<'glob', GlobBindingProps>

interface GlobBindingProps {
	terminal: 'start' | 'end'
}
export class GlobBindingUtil extends BindingUtil<GlobBinding> {
	static override type = 'glob' as const

	override getDefaultProps(): Partial<GlobBindingProps> {
		return {
			terminal: 'start',
		}
	}

	override onAfterChangeFromShape({
		binding,
		shapeBefore,
		shapeAfter,
	}: BindingOnShapeChangeOptions<GlobBinding>): void {
		const glob = this.editor.getShape<GlobShape>(binding.fromId)
		const node = this.editor.getShape<NodeShape>(binding.toId)

		if (!glob || !node) return
		if (glob.props.isGhosting) return

		const selectedIds = this.editor.getSelectedShapeIds()
		if (selectedIds.includes(node.id)) return

		if (
			glob.parentId === node.parentId &&
			glob.parentId !== this.editor.getCurrentPageId() &&
			!selectedIds.includes(glob.id)
		) {
			return
		}

		const delta = Vec.Sub(shapeAfter, shapeBefore)

		this.editor.run(
			() => {
				this.editor.updateShape<NodeShape>({
					id: node.id,
					type: 'node',
					x: node.x + delta.x,
					y: node.y + delta.y,
				})
			},
			{ history: 'ignore' }
		)
	}

	override onAfterChangeToShape({
		binding,
		shapeBefore,
		shapeAfter,
		reason,
	}: BindingOnShapeChangeOptions<GlobBinding>): void {
		const glob = this.editor.getShape<GlobShape>(binding.fromId)
		if (!glob) return

		if (glob.props.isGhosting) return

		reparentGlob(this.editor, binding.fromId)
		console.log('reparented glob')
		console.log('glob', glob)
	}

	override onBeforeDeleteToShape({ binding }: BindingOnShapeDeleteOptions<GlobBinding>): void {
		this.editor.deleteShape(binding.fromId)
	}
}

function reparentGlob(editor: Editor, globId: TLShapeId) {
	const glob = editor.getShape<GlobShape>(globId)
	if (!glob) return

	const nodes = getStartAndEndNodes(editor, globId)
	if (!nodes) return

	const { startNodeShape, endNodeShape } = nodes

	const parentPageId = editor.getAncestorPageId(glob)
	if (!parentPageId) return

	const nextParentId = editor.findCommonAncestor([startNodeShape, endNodeShape]) ?? parentPageId

	if (nextParentId && nextParentId !== glob.parentId) {
		editor.reparentShapes([globId], nextParentId)

		// Recalculate d handles in the new coordinate space after reparenting
		const reparentedGlob = editor.getShape<GlobShape>(globId)
		if (!reparentedGlob) return

		const startPagePos = editor.getShapePageTransform(startNodeShape.id).point()
		const endPagePos = editor.getShapePageTransform(endNodeShape.id).point()

		// Calculate new d handles using getGlobTangentUpdate
		const update = getGlobTangentUpdate(
			startPagePos,
			startNodeShape.props.radius,
			endPagePos,
			endNodeShape.props.radius
		)

		// Convert position to parent space
		const localPoint = editor.getPointInParentSpace(reparentedGlob, {
			x: update.x,
			y: update.y,
		})

		// Update glob with new position and d handles in the correct coordinate space
		editor.updateShape<GlobShape>({
			id: globId,
			type: 'glob',
			x: localPoint.x,
			y: localPoint.y,
			props: update.props,
		})
	}
}
