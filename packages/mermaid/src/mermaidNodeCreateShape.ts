import type { Editor, TLShape, TLShapeId } from 'tldraw'
import { toRichText } from 'tldraw'
import type {
	MermaidBlueprintNode,
	MermaidBlueprintNodeRenderSpec,
	MermaidDiagramKind,
} from './blueprint'
import { sanitizeDiagramText } from './utils'

/**
 * Arguments for {@link defaultCreateMermaidNodeFromBlueprint}. `x` / `y` are in shape space (parent-relative when
 * `parentShapeId` is set), matching {@link renderBlueprint}.
 * @public
 */
export interface MermaidNodeCreateFunctionArgs {
	editor: Editor
	node: MermaidBlueprintNode
	shapeId: TLShapeId
	x: number
	y: number
	parentShapeId?: TLShapeId
	diagramKind: MermaidDiagramKind
	/** Materialization spec (from {@link resolveMermaidNodeRender} or your mapper). */
	render: MermaidBlueprintNodeRenderSpec
}

/**
 * Creates the tldraw shape for one Mermaid blueprint node using `render` and layout-derived props.
 * @public
 */
export function defaultCreateMermaidNodeFromBlueprint(
	args: MermaidNodeCreateFunctionArgs
): TLShape {
	const { editor, node, shapeId, x, y, parentShapeId, render } = args
	const baseProps = {
		w: node.w,
		h: node.h,
		fill: node.fill ?? 'none',
		color: node.color ?? 'black',
		dash: node.dash ?? 'draw',
		size: node.size ?? 'm',
		...(node.label && { richText: toRichText(sanitizeDiagramText(node.label)) }),
		...(node.align && { align: node.align }),
		...(node.verticalAlign && { verticalAlign: node.verticalAlign }),
	}

	const { type, props } =
		render.variant === 'geo'
			? { type: 'geo', props: { geo: render.geo } }
			: { type: render.type, props: render.props }
	editor.createShape({
		id: shapeId,
		type: type as any,
		x,
		y,
		parentId: parentShapeId,
		props: { ...baseProps, ...props },
	})
	return editor.getShape(shapeId)!
}
