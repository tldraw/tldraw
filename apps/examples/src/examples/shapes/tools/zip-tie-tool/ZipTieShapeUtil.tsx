import {
	BindingUtil,
	DefaultColorStyle,
	Editor,
	RecordProps,
	Rectangle2d,
	SVGContainer,
	ShapeUtil,
	SvgExportContext,
	TLShapeUtilCanBindOpts,
	getColorValue,
} from 'tldraw'
import { ZIP_TIE, ZipTieBinding, ZipTieShape, getZipTieLayout } from './zip-tie-shared'

// [1]
function getZipTieSize(editor: Editor, shape: ZipTieShape) {
	const layout = getZipTieLayout(editor, shape.id)
	// An empty tie only exists until onOperationComplete cleans it up.
	const strokeWidth = layout.strokeWidth || 3.5
	const width = strokeWidth * 3
	return {
		width,
		height: layout.length + strokeWidth * 3,
		strokeWidth: Math.max(2, strokeWidth * 0.85),
	}
}

export class ZipTieShapeUtil extends ShapeUtil<ZipTieShape> {
	static override type = ZIP_TIE
	static override props: RecordProps<ZipTieShape> = { color: DefaultColorStyle }

	override getDefaultProps(): ZipTieShape['props'] {
		return { color: 'blue' }
	}

	override canBind({ bindingType }: TLShapeUtilCanBindOpts<ZipTieShape>) {
		return bindingType === ZIP_TIE
	}
	override canResize() {
		return false
	}
	override hideResizeHandles() {
		return true
	}
	override canSnap() {
		return false
	}

	override getGeometry(shape: ZipTieShape) {
		const { width, height } = getZipTieSize(this.editor, shape)
		return new Rectangle2d({
			x: -width / 2,
			y: -height / 2,
			width,
			height,
			isFilled: true,
		})
	}

	override component(shape: ZipTieShape) {
		return (
			<SVGContainer>
				<ZipTieSvg shape={shape} editor={this.editor} />
			</SVGContainer>
		)
	}

	override toSvg(shape: ZipTieShape, ctx: SvgExportContext) {
		return <ZipTieSvg shape={shape} editor={this.editor} colorMode={ctx.colorMode} />
	}

	override getIndicatorPath(shape: ZipTieShape) {
		const { width, height } = getZipTieSize(this.editor, shape)
		const r = width / 2
		const y = height / 2 - r
		return new Path2D(
			`M ${-r} ${-y} A ${r} ${r} 0 0 1 ${r} ${-y} L ${r} ${y} A ${r} ${r} 0 0 1 ${-r} ${y} Z`
		)
	}
}

// [2]
function ZipTieSvg({
	shape,
	editor,
	colorMode = editor.getColorMode(),
}: {
	shape: ZipTieShape
	editor: Editor
	colorMode?: 'light' | 'dark'
}) {
	const { width, height, strokeWidth } = getZipTieSize(editor, shape)
	const colors = editor.getCurrentTheme().colors[colorMode]
	const stroke = getColorValue(colors, shape.props.color, 'solid')
	const fill = getColorValue(colors, shape.props.color, 'semi')

	return (
		<rect
			x={-width / 2}
			y={-height / 2}
			width={width}
			height={height}
			rx={width / 2}
			fill={fill}
			stroke={stroke}
			strokeWidth={strokeWidth}
		/>
	)
}

export class ZipTieBindingUtil extends BindingUtil<ZipTieBinding> {
	static override type = ZIP_TIE

	override getDefaultProps() {
		return { lane: 'a1', order: 'a1' } as ZipTieBinding['props']
	}

	// [3]
	override onOperationComplete() {
		const emptyTies = this.editor.store
			.allRecords()
			.filter(
				(record): record is ZipTieShape => record.typeName === 'shape' && record.type === ZIP_TIE
			)
			.filter((tie) => this.editor.getBindingsToShape(tie, ZIP_TIE).length === 0)
		if (emptyTies.length) this.editor.deleteShapes(emptyTies)
	}
}

/*
[1]
A tie's size depends on what's tied in it: it's long enough to wrap every arrow in its bundle, and
as thick as the arrows are. Its local origin is its center, its local x axis is the direction the
arrows run through it, and its local y axis is the direction they're stacked in. Rotating the tie
rotates the bundle.

[2]
The tie is drawn as a filled capsule over the bundle. The capsule hides where the arrows squeeze together, which reads as the tie holding them.

[3]
A tie with nothing in it has no reason to exist. When an arrow is deleted its bindings go with it,
so once all the bindings are gone from a tie we clean the tie up too. Doing this in
`onOperationComplete` rather than per binding means deleting several arrows at once (or the tie
itself) doesn't trip over shapes that are already halfway through being deleted. We check every
page, because moving tied arrows to another page empties ties on the page they left.
*/
