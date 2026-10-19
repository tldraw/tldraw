import {
	BindingOnCreateOptions,
	BindingOnShapeChangeOptions,
	BindingOnShapeDeleteOptions,
	BindingUtil,
	Editor,
	getArrowInfo,
	RecordProps,
	shapeIdValidator,
	T,
	TLArrowInfo,
	TLArrowShape,
	TLBinding,
	TLShapeId,
	Vec,
} from 'tldraw'

/** @public */
export const MERMAID_MULTIPLICITY_BINDING_TYPE = 'mermaid-multiplicity'

/** @public */
export interface TLMermaidMultiplicityBindingProps {
	arrowId: TLShapeId
	terminal: 'start' | 'end'
}

declare module 'tldraw' {
	export interface TLGlobalBindingPropsMap {
		[MERMAID_MULTIPLICITY_BINDING_TYPE]: TLMermaidMultiplicityBindingProps
	}
}

/** @public */
export type TLMermaidMultiplicityBinding = TLBinding<typeof MERMAID_MULTIPLICITY_BINDING_TYPE>

// Clearance past the arrowhead and off the line, on top of the label's own size.
const ALONG_LINE = 22
const ACROSS_LINE = 6

/**
 * Keeps a class diagram's multiplicity label (`1`, `*`, `0..1`) beside one end of its relation.
 * Bind each label from the arrow and from both classes it joins: an arrow's own record doesn't
 * change when only a class it's bound to moves.
 * @public
 */
export class MermaidMultiplicityBindingUtil extends BindingUtil<TLMermaidMultiplicityBinding> {
	static override type = MERMAID_MULTIPLICITY_BINDING_TYPE
	static override props: RecordProps<TLMermaidMultiplicityBinding> = {
		arrowId: shapeIdValidator,
		terminal: T.literalEnum('start', 'end'),
	}

	override getDefaultProps(): Partial<TLMermaidMultiplicityBindingProps> {
		return {}
	}

	override onAfterCreate({ binding }: BindingOnCreateOptions<TLMermaidMultiplicityBinding>) {
		placeMultiplicityLabel(this.editor, binding)
	}

	override onAfterChangeFromShape({
		binding,
	}: BindingOnShapeChangeOptions<TLMermaidMultiplicityBinding>) {
		placeMultiplicityLabel(this.editor, binding)
	}

	override onBeforeDeleteFromShape({
		binding,
		shape,
	}: BindingOnShapeDeleteOptions<TLMermaidMultiplicityBinding>) {
		// A label with no relation left to describe would float on its own.
		if (shape.id === binding.props.arrowId) this.editor.deleteShape(binding.toId)
	}
}

function placeMultiplicityLabel(editor: Editor, binding: TLMermaidMultiplicityBinding) {
	// Undo and redo already carry the label's position.
	if (editor.isReplayingHistory()) return

	const arrow = editor.getShape<TLArrowShape>(binding.props.arrowId)
	const label = editor.getShape(binding.toId)
	if (!arrow || !label) return
	const info = getArrowInfo(editor, arrow)
	if (!info?.isValid) return

	const { terminal } = binding.props
	const end = info[terminal].point
	const along = getDirectionAlongLine(info, terminal)
	// The same side of the line at both ends, so `1 ── *` reads along one edge.
	const across = Vec.Sub(info.end.point, info.start.point).uni().per()

	const bounds = editor.getShapePageBounds(label)
	if (!bounds) return
	const halfSize = Math.max(bounds.w, bounds.h) / 2
	const center = Vec.Add(end, along.mul(ALONG_LINE + halfSize)).add(
		across.mul(ACROSS_LINE + halfSize)
	)

	const pageCenter = editor.getShapePageTransform(arrow).applyToPoint(center)
	const pageTopLeft = { x: pageCenter.x - bounds.w / 2, y: pageCenter.y - bounds.h / 2 }
	const { x, y } = editor.getPointInParentSpace(label, pageTopLeft)
	if (Math.abs(x - label.x) < 0.5 && Math.abs(y - label.y) < 0.5) return
	editor.updateShape({ id: label.id, type: label.type, x, y })
}

/** The direction from a terminal back along the line. On a curve, the tangent: heading for the middle would cut the corner. */
function getDirectionAlongLine(info: TLArrowInfo, terminal: 'start' | 'end'): Vec {
	const end = info[terminal].point
	if (info.type === 'arc') {
		const tangent = Vec.Sub(end, info.bodyArc.center).per().uni()
		return Vec.Dpr(tangent, Vec.Sub(info.middle, end)) >= 0 ? tangent : tangent.neg()
	}
	const toward =
		info.type === 'straight' ? info.middle : info[terminal === 'start' ? 'end' : 'start'].point
	return Vec.Sub(toward, end).uni()
}
