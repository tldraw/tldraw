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
	MermaidClassBox,
	MermaidDiagramKind,
} from './blueprint'
import {
	getMermaidClassShapeSize,
	MERMAID_CLASS_SHAPE_TYPE,
	type TLMermaidClassShapeProps,
} from './classShape'
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
	if (render.variant === 'shape' && render.type === MERMAID_CLASS_SHAPE_TYPE) {
		const classBox = node.classBox ?? {
			annotations: [],
			name: sanitizeDiagramText(node.label ?? node.id),
			attributes: [],
			methods: [],
		}
		return createMermaidClassShape(args, classBox, render.props)
	}
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

// Sized to its own lines rather than mermaid's box, which was measured in mermaid's font, and
// centred where mermaid put it so arrows still meet the same side.
function createMermaidClassShape(
	{ editor, node, shapeId, x, y, parentShapeId }: MermaidNodeCreateFunctionArgs,
	classBox: MermaidClassBox,
	overrides: Record<string, unknown>
): TLShape {
	if (!editor.hasShapeUtil(MERMAID_CLASS_SHAPE_TYPE)) {
		throw new Error(
			`A render spec asked for a ${MERMAID_CLASS_SHAPE_TYPE} shape, but MermaidClassShapeUtil isn't in the editor's shapeUtils.`
		)
	}
	const props = {
		...editor.getShapeUtil(MERMAID_CLASS_SHAPE_TYPE).getDefaultProps(),
		...classBox,
		color: node.color ?? 'black',
		size: node.size ?? 'm',
		...overrides,
	} as TLMermaidClassShapeProps
	const { w, h } = getMermaidClassShapeSize(editor, props)
	editor.createShape({
		id: shapeId,
		type: MERMAID_CLASS_SHAPE_TYPE,
		x: x + (node.w - w) / 2,
		y: y + (node.h - h) / 2,
		parentId: parentShapeId,
		props: { ...props, w, h },
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
