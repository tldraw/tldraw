import type { Editor, TLDefaultSizeStyle, TLGeoShape, TLShape, TLShapeId } from 'tldraw'
import {
	GeoShapeUtil,
	getDisplayValues,
	renderHtmlFromRichTextForMeasurement,
	toRichText,
} from 'tldraw'
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

/** The width a geo shape needs to hold a label without wrapping any of its lines. */
export type MeasureLabelWidth = (label: string, size: TLDefaultSizeStyle) => number

/**
 * Measures labels the way {@link defaultCreateMermaidNodeFromBlueprint} draws them: in a geo shape,
 * in tldraw's font. Mermaid measures its own font, so a box sized from mermaid's layout alone can be
 * too narrow for the same text.
 */
export function createLabelWidthMeasurer(editor: Editor): MeasureLabelWidth {
	const util = editor.getShapeUtil<GeoShapeUtil>('geo')
	const defaultProps = util.getDefaultProps()
	return (label, size) => {
		const shape = { type: 'geo', props: { ...defaultProps, size } } as TLGeoShape
		const dv = getDisplayValues(util, shape)
		const richText = toRichText(sanitizeDiagramText(label))
		const { w } = editor.textMeasure.measureHtml(
			renderHtmlFromRichTextForMeasurement(editor, richText),
			{
				fontStyle: 'normal',
				fontWeight: 'normal',
				padding: '0px',
				fontFamily: dv.labelFontFamily,
				fontSize: dv.labelFontSize,
				lineHeight: dv.labelLineHeight,
				maxWidth: null,
			}
		)
		return Math.ceil(w + dv.labelPadding * 2)
	}
}
