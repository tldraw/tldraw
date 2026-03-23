import type { Editor, TLGeoShape, TLShape, TLShapeId } from 'tldraw'
import { toRichText } from 'tldraw'
import type { MermaidBlueprintNode, MermaidDiagramKind } from './blueprint'
import { sanitizeDiagramText } from './utils'

/**
 * Arguments for {@link MermaidNodeCreateFunction}. `x` / `y` are in shape space (parent-relative when
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
}

/**
 * Creates the tldraw shape for one Mermaid blueprint node. Must create a shape with `id: shapeId`
 * (used for arrow bindings) and return that shape. Synchronous only.
 * @public
 */
export type MermaidNodeCreateFunction = (args: MermaidNodeCreateFunctionArgs) => TLShape

/**
 * Default node creation: reads `node.render` and calls `editor.createShape` once with layout-derived props.
 * @public
 */
export function defaultCreateMermaidNodeFromBlueprint(
	args: MermaidNodeCreateFunctionArgs
): TLShape {
	const { editor, node, shapeId, x, y, parentShapeId } = args
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

	if (node.render.variant === 'geo') {
		editor.createShape<TLGeoShape>({
			id: shapeId,
			type: 'geo',
			x,
			y,
			parentId: parentShapeId,
			props: {
				...baseProps,
				geo: node.render.geo,
			},
		})
	} else {
		editor.createShape({
			id: shapeId,
			type: node.render.type as any,
			x,
			y,
			parentId: parentShapeId,
			props: {
				...baseProps,
				...node.render.props,
			},
		})
	}
	return editor.getShape(shapeId)!
}
