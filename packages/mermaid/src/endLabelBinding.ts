import {
	BindingOnCreateOptions,
	BindingOnShapeChangeOptions,
	BindingOnShapeDeleteOptions,
	BindingUtil,
	Editor,
	getArrowBindings,
	getArrowInfo,
	RecordProps,
	T,
	TLArrowInfo,
	TLArrowShape,
	TLBinding,
	TLShape,
	TLShapeId,
	Vec,
} from 'tldraw'

/** @public */
export const MERMAID_END_LABEL_BINDING_TYPE = 'mermaid-end-label' as const

/** @public */
export interface TLMermaidEndLabelBindingProps {
	/** Which end of the arrow the label sits beside. */
	terminal: 'start' | 'end'
}

declare module 'tldraw' {
	export interface TLGlobalBindingPropsMap {
		[MERMAID_END_LABEL_BINDING_TYPE]: TLMermaidEndLabelBindingProps
	}
}

/** @public */
export type TLMermaidEndLabelBinding = TLBinding<typeof MERMAID_END_LABEL_BINDING_TYPE>

// Clearance past the arrowhead and off the line, on top of the label's own size.
const ALONG_LINE = 22
const ACROSS_LINE = 6

/**
 * Keeps a label, such as a class diagram's multiplicity (`1`, `*`, `0..1`), beside one end of an
 * arrow. Bind the label from the arrow; the util also binds it from the shapes the arrow joins,
 * since an arrow's own record doesn't change when only a shape it's bound to moves. The label
 * follows the arrow, so dragging it away snaps it back on the next change.
 * @public
 */
export class MermaidEndLabelBindingUtil extends BindingUtil<TLMermaidEndLabelBinding> {
	static override type = MERMAID_END_LABEL_BINDING_TYPE
	static override props: RecordProps<TLMermaidEndLabelBinding> = {
		terminal: T.literalEnum('start', 'end'),
	}

	override getDefaultProps(): Partial<TLMermaidEndLabelBindingProps> {
		return {}
	}

	override onAfterCreate({ binding }: BindingOnCreateOptions<TLMermaidEndLabelBinding>) {
		this.update(binding)
	}

	override onAfterChangeFromShape({
		binding,
	}: BindingOnShapeChangeOptions<TLMermaidEndLabelBinding>) {
		this.update(binding)
	}

	override onBeforeDeleteFromShape({
		binding,
		shape,
	}: BindingOnShapeDeleteOptions<TLMermaidEndLabelBinding>) {
		// A label with no arrow left to describe would float on its own.
		if (shape.type === 'arrow') this.editor.deleteShape(binding.toId)
	}

	private update(binding: TLMermaidEndLabelBinding) {
		const label = this.editor.getShape(binding.toId)
		const arrow = label && getLabelArrow(this.editor, label.id)
		if (!label || !arrow) return
		if (binding.fromId === arrow.id) watchArrowTargets(this.editor, label, arrow, binding.props)
		placeEndLabel(this.editor, label, arrow, binding.props.terminal)
	}
}

function getLabelArrow(editor: Editor, labelId: TLShapeId): TLArrowShape | undefined {
	for (const binding of editor.getBindingsToShape(labelId, MERMAID_END_LABEL_BINDING_TYPE)) {
		const from = editor.getShape(binding.fromId)
		if (from && editor.isShapeOfType<TLArrowShape>(from, 'arrow')) return from
	}
	return undefined
}

// Bind the label from whatever the arrow joins now, so it follows an arrow dragged onto another shape.
function watchArrowTargets(
	editor: Editor,
	label: TLShape,
	arrow: TLArrowShape,
	props: TLMermaidEndLabelBindingProps
) {
	const { start, end } = getArrowBindings(editor, arrow)
	const targets = new Set([start?.toId, end?.toId].filter((id) => id !== undefined))
	const watching = editor
		.getBindingsToShape(label.id, MERMAID_END_LABEL_BINDING_TYPE)
		.filter((binding) => binding.fromId !== arrow.id)
	const stale = watching.filter((binding) => !targets.has(binding.fromId))
	if (stale.length) editor.deleteBindings(stale)
	const watched = new Set(watching.map((binding) => binding.fromId))
	const missing = [...targets].filter((id) => !watched.has(id))
	if (missing.length) {
		editor.createBindings(
			missing.map((fromId) => ({
				type: MERMAID_END_LABEL_BINDING_TYPE,
				fromId,
				toId: label.id,
				props,
			}))
		)
	}
}

function placeEndLabel(
	editor: Editor,
	label: TLShape,
	arrow: TLArrowShape,
	terminal: 'start' | 'end'
) {
	const info = getArrowInfo(editor, arrow)
	if (!info?.isValid) return

	const end = info[terminal].point
	const along = getDirectionAlongLine(info, terminal)
	// The same side of the line at both ends, so `1 ── *` reads along one edge.
	const across = Vec.Sub(info.end.point, info.start.point).uni().per()

	// Local bounds, not page bounds, which grow when the label sits in a rotated group.
	const bounds = editor.getShapeGeometry(label).bounds
	const halfSize = Math.max(bounds.w, bounds.h) / 2
	const center = Vec.Add(end, along.mul(ALONG_LINE + halfSize)).add(
		across.mul(ACROSS_LINE + halfSize)
	)

	const pageCenter = editor.getShapePageTransform(arrow).applyToPoint(center)
	const parentCenter = editor.getPointInParentSpace(label, pageCenter)
	const x = parentCenter.x - bounds.midX
	const y = parentCenter.y - bounds.midY
	if (Math.abs(x - label.x) < 0.5 && Math.abs(y - label.y) < 0.5) return
	editor.updateShape({ id: label.id, type: label.type, x, y })
}

// On a curve, the tangent: heading for the middle would cut the corner.
function getDirectionAlongLine(info: TLArrowInfo, terminal: 'start' | 'end'): Vec {
	const end = info[terminal].point
	if (info.type === 'arc') {
		const tangent = Vec.Sub(end, info.bodyArc.center).per().uni()
		return Vec.Dpr(tangent, Vec.Sub(info.middle, end)) >= 0 ? tangent : tangent.neg()
	}
	if (info.type === 'elbow') {
		const { points } = info.route
		const next = terminal === 'start' ? points[1] : points[points.length - 2]
		return Vec.Sub(next ?? end, end).uni()
	}
	return Vec.Sub(info.middle, end).uni()
}
