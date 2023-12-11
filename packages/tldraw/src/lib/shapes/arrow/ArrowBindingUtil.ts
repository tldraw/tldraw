import {
	BindingUtil,
	Editor,
	TLArrowBinding,
	TLArrowShape,
	TLArrowShapeTerminal,
	TLShape,
	TLShapeId,
	Vec2d,
	arrowBindingMigrations,
	arrowBindingProps,
	getArrowTerminalsInArrowSpace,
} from '@tldraw/editor'
import { ArrowShapeUtil } from './ArrowShapeUtil'

export const ARROW_END_OFFSET = 0.1

/** @public */
export class ArrowBindingUtil extends BindingUtil<TLArrowBinding> {
	shapeUtil: ArrowShapeUtil
	constructor(editor: Editor) {
		super(editor)
		this.shapeUtil = editor.getShapeUtil(ArrowShapeUtil.type) as ArrowShapeUtil
	}
	override onAfterChange?(
		binding: TLArrowBinding,
		shape: 'from' | 'to',
		prev: TLShape,
		next: TLShape
	): void {
		const arrow = this.editor.getShape(binding.fromShapeId) as TLArrowShape
		// todo: delete this binding I guess if its arrow doesn't exist?
		if (!arrow) return
		const info = getArrowTerminalsInArrowSpace(this.editor, arrow)[binding.props.terminal]
		const current = Vec2d.From(arrow.props[binding.props.terminal])
		if (!info.equals(current)) {
			this.editor.store.put([
				{
					...arrow,
					props: {
						...arrow.props,
						[binding.props.terminal]: { x: info.x, y: info.y } satisfies TLArrowShapeTerminal,
					}
				} satisfies TLArrowShape,
			])
		}

		// if the shape's parent changed and it is bound to an arrow, update the arrow's parent
		if (prev.parentId !== next.parentId) {
			const reparentBoundArrows = (id: TLShapeId) => {
				const bindings = this.editor.getBindingsForShapeId(id, 'arrow')
				for (const binding of bindings) {
					const arrowId = binding.fromShapeId as TLShapeId
					this.shapeUtil.reparentArrow(arrowId)
				}
			}
			reparentBoundArrows(next.id)
			this.editor.visitDescendants(next.id, reparentBoundArrows)
		}
	}
	override onBeforeShapeDelete(
		binding: TLArrowBinding,
		_direction: 'from' | 'to',
		_shape: TLShape
	): void {
		const arrow = this.editor.getShape(binding.fromShapeId) as TLArrowShape
		if (!arrow) return
		this.shapeUtil.unbindArrowTerminal(arrow, binding.props.terminal)
	}
	static override type = 'arrow' as const
	static override props = arrowBindingProps
	static override migrations = arrowBindingMigrations
}
