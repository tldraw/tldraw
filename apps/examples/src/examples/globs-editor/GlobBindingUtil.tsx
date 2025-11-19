import {
	BindingOnShapeChangeOptions,
	BindingOnShapeDeleteOptions,
	BindingUtil,
	TLBaseBinding,
	Vec,
} from 'tldraw'
import { GlobShape } from './GlobShapeUtil'
import { NodeShape } from './NodeShapeUtil'

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

	override onBeforeDeleteToShape({ binding }: BindingOnShapeDeleteOptions<GlobBinding>): void {
		this.editor.deleteShape(binding.fromId)
	}
}
