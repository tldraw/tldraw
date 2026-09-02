import type { Editor, TLGeoShape, TLShape, TLShapeId } from 'tldraw'
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

	if (render.variant === 'geo') {
		editor.createShape<TLGeoShape>({
			id: shapeId,
			type: 'geo',
			x,
			y,
			parentId: parentShapeId,
			props: {
				...baseProps,
				geo: render.geo,
			},
		})
	} else {
		editor.createShape({
			id: shapeId,
			type: render.type as any,
			x,
			y,
			parentId: parentShapeId,
			props: {
				...baseProps,
				...render.props,
			},
		})
	}
	return editor.getShape(shapeId)!
}
