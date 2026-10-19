import {
	BaseBoxShapeUtil,
	DefaultColorStyle,
	DefaultFontFaces,
	DefaultFontStyle,
	DefaultSizeStyle,
	Editor,
	getColorValue,
	getFontFamily,
	HTMLContainer,
	RecordProps,
	SvgExportContext,
	T,
	TLDefaultColorStyle,
	TLDefaultFontStyle,
	TLDefaultSizeStyle,
	TLFontFace,
	TLShape,
	TLTheme,
	useEditor,
	useValue,
} from 'tldraw'

/** @public */
export const MERMAID_CLASS_SHAPE_TYPE = 'mermaid-class'

/**
 * One attribute or method line in a class box. Mermaid marks static members with `$` (drawn
 * underlined) and abstract ones with `*` (drawn in italics).
 * @public
 */
export interface MermaidClassMember {
	text: string
	classifier?: 'static' | 'abstract'
}

/**
 * The contents of a UML class box: a header (annotations and name), then attributes, then methods.
 * @public
 */
export interface MermaidClassBox {
	annotations: string[]
	name: string
	attributes: MermaidClassMember[]
	methods: MermaidClassMember[]
}

/** @public */
export interface TLMermaidClassShapeProps extends MermaidClassBox {
	w: number
	h: number
	color: TLDefaultColorStyle
	size: TLDefaultSizeStyle
	font: TLDefaultFontStyle
}

declare module 'tldraw' {
	export interface TLGlobalShapePropsMap {
		[MERMAID_CLASS_SHAPE_TYPE]: TLMermaidClassShapeProps
	}
}

/** @public */
export type TLMermaidClassShape = TLShape<typeof MERMAID_CLASS_SHAPE_TYPE>

const memberValidator = T.object({
	text: T.string,
	classifier: T.literalEnum('static', 'abstract').optional(),
})

// Geo and note shapes' label and outline multipliers, so a class box matches their scale.
const LABEL_FONT_SIZES: Record<TLDefaultSizeStyle, number> = { s: 1.125, m: 1.375, l: 1.625, xl: 2 }
const STROKE_SIZES: Record<TLDefaultSizeStyle, number> = { s: 1, m: 1.75, l: 2.5, xl: 5 }

interface ClassBoxMetrics {
	fontFamily: string
	fontSize: number
	lineHeight: number
	strokeWidth: number
	padX: number
	padY: number
}

function getMetrics(theme: TLTheme, props: TLMermaidClassShapeProps): ClassBoxMetrics {
	const fontSize = theme.fontSize * LABEL_FONT_SIZES[props.size]
	return {
		fontFamily: getFontFamily(theme, props.font),
		fontSize,
		lineHeight: fontSize * theme.lineHeight,
		strokeWidth: theme.strokeWidth * STROKE_SIZES[props.size],
		padX: fontSize * 0.6,
		padY: fontSize * 0.35,
	}
}

interface ClassBoxRow {
	text: string
	y: number
	role: 'annotation' | 'name' | 'member'
	classifier?: MermaidClassMember['classifier']
}

interface ClassBoxLayout {
	rows: ClassBoxRow[]
	dividers: number[]
	height: number
}

// Like mermaid, an empty section is still drawn, so a class with no members shows that none were given.
function layoutClassBox(props: MermaidClassBox, metrics: ClassBoxMetrics): ClassBoxLayout {
	const { lineHeight, padY } = metrics
	const rows: ClassBoxRow[] = []
	const dividers: number[] = []
	let y = padY

	for (const annotation of props.annotations) {
		rows.push({ text: `«${annotation}»`, y, role: 'annotation' })
		y += lineHeight
	}
	rows.push({ text: props.name, y, role: 'name' })
	y += lineHeight + padY

	for (const section of [props.attributes, props.methods]) {
		dividers.push(y)
		y += padY
		for (const member of section) {
			rows.push({ ...member, y, role: 'member' })
			y += lineHeight
		}
		y += padY
	}

	return { rows, dividers, height: y }
}

function getRowFontStyle(row: ClassBoxRow) {
	return {
		fontWeight: row.role === 'name' ? 'bold' : 'normal',
		fontStyle: row.classifier === 'abstract' ? 'italic' : 'normal',
	}
}

/**
 * The size a class box needs to fit every line without wrapping.
 * @public
 */
export function getMermaidClassShapeSize(
	editor: Editor,
	props: TLMermaidClassShapeProps
): { w: number; h: number } {
	const metrics = getMetrics(editor.getCurrentTheme(), props)
	const { rows, height } = layoutClassBox(props, metrics)
	let width = 0
	for (const row of rows) {
		const { w } = editor.textMeasure.measureText(row.text, {
			fontFamily: metrics.fontFamily,
			fontSize: metrics.fontSize,
			lineHeight: metrics.lineHeight / metrics.fontSize,
			...getRowFontStyle(row),
			maxWidth: null,
			padding: '0px',
		})
		width = Math.max(width, w)
	}
	return { w: Math.ceil(width + metrics.padX * 2), h: Math.ceil(height) }
}

/**
 * A UML class box: name, attributes, and methods in sections split by dividers. Mermaid class
 * diagrams use it when it's registered, and a labelled rectangle otherwise.
 * @public
 */
export class MermaidClassShapeUtil extends BaseBoxShapeUtil<TLMermaidClassShape> {
	static override type = MERMAID_CLASS_SHAPE_TYPE
	static override props: RecordProps<TLMermaidClassShape> = {
		w: T.nonZeroNumber,
		h: T.nonZeroNumber,
		color: DefaultColorStyle,
		size: DefaultSizeStyle,
		font: DefaultFontStyle,
		annotations: T.arrayOf(T.string),
		name: T.string,
		attributes: T.arrayOf(memberValidator),
		methods: T.arrayOf(memberValidator),
	}

	override getDefaultProps(): TLMermaidClassShapeProps {
		return {
			w: 160,
			h: 120,
			color: 'black',
			size: 'm',
			font: 'draw',
			annotations: [],
			name: 'Class',
			attributes: [],
			methods: [],
		}
	}

	override canEdit() {
		return false
	}

	override getIndicatorPath(shape: TLMermaidClassShape) {
		const path = new Path2D()
		path.rect(0, 0, shape.props.w, shape.props.h)
		return path
	}

	override getText(shape: TLMermaidClassShape) {
		const { annotations, name, attributes, methods } = shape.props
		return [...annotations, name, ...attributes.map((m) => m.text), ...methods.map((m) => m.text)]
			.filter(Boolean)
			.join('\n')
	}

	override getFontFaces(shape: TLMermaidClassShape): TLFontFace[] {
		const themeFaces = this.editor.getCurrentTheme().fonts[shape.props.font]?.faces
		if (themeFaces?.length) return themeFaces
		const faces = DefaultFontFaces[`tldraw_${shape.props.font}`]
		return [faces.normal.normal, faces.normal.bold, faces.italic.normal]
	}

	override component(shape: TLMermaidClassShape) {
		return <MermaidClassShapeComponent shape={shape} />
	}

	override toSvg(shape: TLMermaidClassShape, ctx: SvgExportContext) {
		const box = getClassBoxDrawing(this.editor.getCurrentTheme(), ctx.colorMode, shape.props)
		return (
			<g>
				<ClassBoxOutline box={box} />
				<foreignObject width={shape.props.w} height={shape.props.h}>
					<ClassBoxText box={box} />
				</foreignObject>
			</g>
		)
	}
}

interface ClassBoxDrawing {
	props: TLMermaidClassShapeProps
	metrics: ClassBoxMetrics
	layout: ClassBoxLayout
	fill: string
	stroke: string
}

// The canvas and SVG export both draw from this, so they can't disagree.
function getClassBoxDrawing(
	theme: TLTheme,
	colorMode: 'light' | 'dark',
	props: TLMermaidClassShapeProps
): ClassBoxDrawing {
	const colors = theme.colors[colorMode]
	const metrics = getMetrics(theme, props)
	return {
		props,
		metrics,
		layout: layoutClassBox(props, metrics),
		fill: colors.solid,
		stroke: getColorValue(colors, props.color, 'solid'),
	}
}

function MermaidClassShapeComponent({ shape }: { shape: TLMermaidClassShape }) {
	const editor = useEditor()
	const theme = useValue('theme', () => editor.getCurrentTheme(), [editor])
	const colorMode = useValue('color mode', () => editor.getColorMode(), [editor])
	const box = getClassBoxDrawing(theme, colorMode, shape.props)
	const { w, h } = shape.props

	return (
		<HTMLContainer style={{ width: w, height: h }}>
			<svg width={w} height={h} style={{ position: 'absolute', overflow: 'visible' }}>
				<ClassBoxOutline box={box} />
			</svg>
			<ClassBoxText box={box} />
		</HTMLContainer>
	)
}

function ClassBoxOutline({ box }: { box: ClassBoxDrawing }) {
	const { props, metrics, layout, fill, stroke } = box
	return (
		<>
			<rect
				width={props.w}
				height={props.h}
				fill={fill}
				stroke={stroke}
				strokeWidth={metrics.strokeWidth}
			/>
			{layout.dividers.map((y, i) => (
				<line
					key={i}
					x1={0}
					x2={props.w}
					y1={y}
					y2={y}
					stroke={stroke}
					strokeWidth={metrics.strokeWidth}
				/>
			))}
		</>
	)
}

function ClassBoxText({ box }: { box: ClassBoxDrawing }) {
	const { props, metrics, layout, stroke } = box
	return (
		<div
			style={{
				position: 'relative',
				width: props.w,
				height: props.h,
				overflow: 'hidden',
				color: stroke,
				fontFamily: metrics.fontFamily,
				fontSize: metrics.fontSize,
				lineHeight: `${metrics.lineHeight}px`,
				whiteSpace: 'pre',
			}}
		>
			{layout.rows.map((row, i) => (
				<div
					key={i}
					style={{
						position: 'absolute',
						top: row.y,
						left: metrics.padX,
						right: metrics.padX,
						textAlign: row.role === 'member' ? 'left' : 'center',
						...getRowFontStyle(row),
						textDecoration: row.classifier === 'static' ? 'underline' : 'none',
					}}
				>
					{row.text}
				</div>
			))}
		</div>
	)
}
