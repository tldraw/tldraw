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
import { LAYOUT_SCALE, sanitizeDiagramText } from './utils'

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
	if (render.variant === 'text') return createTextNode(args)
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

function createTextNode({
	editor,
	node,
	shapeId,
	x,
	y,
	parentShapeId,
}: MermaidNodeCreateFunctionArgs) {
	editor.createShape({
		id: shapeId,
		type: 'text',
		x,
		y,
		parentId: parentShapeId,
		props: {
			richText: toRichText(sanitizeDiagramText(node.label ?? '')),
			color: node.color ?? 'black',
			size: node.size ?? 'm',
			textAlign: 'middle',
			autoSize: true,
		},
	})
	// The text sizes itself to its label, so centre it on the box the layout gave the node.
	const bounds = editor.getShapeGeometry(shapeId).bounds
	editor.updateShape({
		id: shapeId,
		type: 'text',
		x: x + (node.w - bounds.w) / 2,
		y: y + (node.h - bounds.h) / 2,
	})
	return editor.getShape(shapeId)!
}

/** The width a geo shape needs to hold a label without wrapping any of its lines. */
export type MeasureLabelWidth = (label: string, size: TLDefaultSizeStyle) => number

/**
 * Measures labels the way {@link defaultCreateMermaidNodeFromBlueprint} draws them: in a geo shape,
 * in tldraw's font. The layout measures its own font, so a box sized from the layout alone can be
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

/** A geo shape's label font, at the size tldraw draws a node's label. */
function getGeoLabelFont(editor: Editor, size: TLDefaultSizeStyle = 'm') {
	const util = editor.getShapeUtil<GeoShapeUtil>('geo')
	const shape = { type: 'geo', props: { ...util.getDefaultProps(), size } } as TLGeoShape
	const dv = getDisplayValues(util, shape)
	return { family: dv.labelFontFamily, size: dv.labelFontSize, lineHeight: dv.labelLineHeight }
}

/**
 * The font size to lay a diagram out at: tldraw's label size, in the layout's space before it is
 * scaled up by {@link LAYOUT_SCALE}.
 */
export function getLayoutFontSize(editor: Editor) {
	return getGeoLabelFont(editor).size / LAYOUT_SCALE
}

/**
 * Lets the layout measure text the way tldraw draws it, in tldraw's font rather than its own, so it
 * leaves room for the wider hand-drawn face: boxes fit their labels and gaps fit their edge labels.
 * Widths are measured at the size tldraw draws and returned in layout space.
 *
 * With `edgeLabelMargin`, text set smaller than a node's label (an edge's) is reported that much
 * wider, so the layout leaves room for it along the edge. tldraw squeezes an elbow arrow's label to
 * the arrow's length less a margin, so an edge only as long as its label wraps it mid-word.
 */
export function createLayoutTextMeasurer(editor: Editor, opts: { edgeLabelMargin?: number } = {}) {
	const font = getGeoLabelFont(editor)
	const nodeFontSize = font.size / LAYOUT_SCALE
	const edgeLabelMargin = (opts.edgeLabelMargin ?? 0) / LAYOUT_SCALE
	const widths = new Map<string, number>()
	return {
		width(text: string, size: number, style: number) {
			const key = `${size}|${style}|${text}`
			let width = widths.get(key)
			if (width === undefined) {
				width =
					editor.textMeasure.measureText(text, {
						fontFamily: font.family,
						fontSize: size * LAYOUT_SCALE,
						lineHeight: font.lineHeight,
						// pele's style flags: 1 bold, 2 italic, 4 monospace (measured in the same face)
						fontWeight: style & 1 ? 'bold' : 'normal',
						fontStyle: style & 2 ? 'italic' : 'normal',
						padding: '0px',
						maxWidth: null,
					}).w / LAYOUT_SCALE
				if (size < nodeFontSize && text.trim()) width += edgeLabelMargin
				widths.set(key, width)
			}
			return width
		},
	}
}
