import {
	BindingOnShapeChangeOptions,
	BindingOnShapeDeleteOptions,
	BindingUtil,
	Editor,
	TLBinding,
	TLParentId,
	TLShapeId,
	Vec,
} from 'tldraw'
import { GlobShape } from './GlobShapeUtil'
import { NodeShape } from './NodeShapeUtil'
import { getGlobBindings, getGlobTangentUpdate } from './shared'

const GLOB_BINDING_TYPE = 'glob'

declare module 'tldraw' {
	export interface TLGlobalBindingPropsMap {
		[GLOB_BINDING_TYPE]: GlobBindingProps
	}
}

export type GlobBinding = TLBinding<'glob'>

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
		if (!selectedIds.includes(glob.id)) return

		if (
			glob.parentId === node.parentId &&
			glob.parentId !== this.editor.getCurrentPageId() &&
			!selectedIds.includes(glob.id)
		) {
			return
		}

		// if a glob has been reparented (moved into/out of a frame), we need to move the nodes along with it
		if (shapeBefore.parentId !== shapeAfter.parentId) {
			const bindings = getGlobBindings(this.editor, glob)
			const boundNodes: NodeShape[] = []
			if (bindings.start) {
				const node = this.editor.getShape<NodeShape>(bindings.start.toId)
				if (node) boundNodes.push(node)
			}
			if (bindings.end) {
				const node = this.editor.getShape<NodeShape>(bindings.end.toId)
				if (node) boundNodes.push(node)
			}

			// Move each node to maintain its page position while reparenting to match the glob
			for (const node of boundNodes) {
				const nodePagePos = this.editor.getShapePageTransform(node).point()
				const newParentTransform = this.editor.getShapeParentTransform(shapeAfter)
				const newLocalPos = newParentTransform.clone().invert().applyToPoint(nodePagePos)

				this.editor.reparentShapes([node.id], shapeAfter.parentId)
				this.editor.updateShape<NodeShape>({
					id: node.id,
					type: 'node',
					x: newLocalPos.x,
					y: newLocalPos.y,
				})
			}

			// reparent and update
			reparentGlob(this.editor, glob.id)
			updateGlobGeometry(this.editor, glob.id)
			return
		}

		const beforePageTransform = this.editor.getShapeParentTransform(shapeBefore)
		const afterPageTransform = this.editor.getShapeParentTransform(shapeAfter)

		const beforePagePos = beforePageTransform.applyToPoint(shapeBefore)
		const afterPagePos = afterPageTransform.applyToPoint(shapeAfter)

		const deltaInPageSpace = Vec.Sub(afterPagePos, beforePagePos)

		const nodePagePos = this.editor.getShapePageTransform(node).point()

		const newNodePagePos = Vec.Add(nodePagePos, deltaInPageSpace)

		const nodeParentTransform = this.editor.getShapeParentTransform(node)
		const newNodeLocalPos = nodeParentTransform.clone().invert().applyToPoint(newNodePagePos)

		this.editor.run(
			() => {
				this.editor.updateShape<NodeShape>({
					id: node.id,
					type: 'node',
					x: newNodeLocalPos.x,
					y: newNodeLocalPos.y,
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

		const selectedIds = this.editor.getSelectedShapeIds()
		const node = this.editor.getShape<NodeShape>(binding.toId)
		if (!node) return

		if (!selectedIds.includes(node.id) && selectedIds.includes(glob.id)) {
			return
		}

		// If both glob and node share a frame parent and neither is selected,
		// they're moving together (e.g., frame is being moved), don't update
		if (
			glob.parentId === node.parentId &&
			glob.parentId !== this.editor.getCurrentPageId() &&
			!selectedIds.includes(glob.id) &&
			!selectedIds.includes(node.id) &&
			reason !== 'ancestry'
		) {
			return
		}

		if (
			reason !== 'ancestry' &&
			shapeBefore.parentId === shapeAfter.parentId &&
			shapeBefore.index === shapeAfter.index
		) {
			return
		}

		reparentGlob(this.editor, binding.fromId)
		updateGlobGeometry(this.editor, binding.fromId)
	}

	override onBeforeDeleteToShape({ binding }: BindingOnShapeDeleteOptions<GlobBinding>): void {
		this.editor.deleteShape(binding.fromId)
	}
}

function reparentGlob(editor: Editor, globId: TLShapeId) {
	const glob = editor.getShape<GlobShape>(globId)
	if (!glob) return
	const bindings = getGlobBindings(editor, glob)
	const { start, end } = bindings
	const startShape = start ? editor.getShape(start.toId) : undefined
	const endShape = end ? editor.getShape(end.toId) : undefined

	const parentPageId = editor.getAncestorPageId(glob)
	if (!parentPageId) return

	let nextParentId: TLParentId
	if (startShape && endShape) {
		nextParentId = editor.findCommonAncestor([startShape, endShape]) ?? parentPageId
	} else if (startShape || endShape) {
		const bindingParentId = (startShape || endShape)?.parentId
		if (bindingParentId && bindingParentId === glob.parentId) {
			nextParentId = glob.parentId
		} else {
			nextParentId = parentPageId
		}
	} else {
		return
	}

	if (nextParentId && nextParentId !== glob.parentId) {
		editor.reparentShapes([globId], nextParentId)
	}
}

function updateGlobGeometry(editor: Editor, globId: TLShapeId) {
	const glob = editor.getShape<GlobShape>(globId)
	if (!glob) return
	if (glob.props.isGhosting) return

	const bindings = getGlobBindings(editor, glob)
	const { start, end } = bindings
	const startShape = start ? editor.getShape<NodeShape>(start.toId) : undefined
	const endShape = end ? editor.getShape<NodeShape>(end.toId) : undefined

	if (!startShape || !endShape) return

	const startNodePagePos = editor.getShapePageTransform(startShape.id).point()
	const endNodePagePos = editor.getShapePageTransform(endShape.id).point()

	const update = getGlobTangentUpdate(
		editor,
		globId,
		startNodePagePos,
		startShape.props.radius,
		endNodePagePos,
		endShape.props.radius
	)

	editor.updateShape<GlobShape>(update)
}
