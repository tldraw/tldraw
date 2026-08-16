import {
	Geometry2d,
	HTMLContainer,
	RecordProps,
	Rectangle2d,
	ShapeUtil,
	SvgExportContext,
	T,
	Tldraw,
	TLShape,
} from 'tldraw'
import 'tldraw/tldraw.css'

const MY_CUSTOM_SHAPE_TO_SVG_TYPE = 'my-custom-shape-to-svg'

declare module 'tldraw' {
	export interface TLGlobalShapePropsMap {
		[MY_CUSTOM_SHAPE_TO_SVG_TYPE]: { w: number; h: number }
	}
}

// There's a guide at the bottom of this file!

type ICustomShape = TLShape<typeof MY_CUSTOM_SHAPE_TO_SVG_TYPE>

const LIGHT_FILL = '#ff8888'
const DARK_FILL = '#ffcccc'

export class MyShapeUtil extends ShapeUtil<ICustomShape> {
	static override type = MY_CUSTOM_SHAPE_TO_SVG_TYPE
	static override props: RecordProps<ICustomShape> = {
		w: T.number,
		h: T.number,
	}

	getDefaultProps(): ICustomShape['props'] {
		return {
			w: 200,
			h: 200,
		}
	}

	override canResize(shape: ICustomShape) {
		return false
	}

	getGeometry(shape: ICustomShape): Geometry2d {
		return new Rectangle2d({
			width: shape.props.w,
			height: shape.props.h,
			isFilled: true,
		})
	}

	component(_shape: ICustomShape) {
		const isDarkMode = this.editor.user.getIsDarkMode()
		return <HTMLContainer style={{ backgroundColor: isDarkMode ? DARK_FILL : LIGHT_FILL }} />
	}

	getIndicatorPath(shape: ICustomShape) {
		const path = new Path2D()
		path.rect(0, 0, shape.props.w, shape.props.h)
		return path
	}

	// [1]
	override toSvg(shape: ICustomShape, ctx: SvgExportContext) {
		const fill = ctx.isDarkMode ? DARK_FILL : LIGHT_FILL
		return <rect width={shape.props.w} height={shape.props.h} fill={fill} />
	}
}

const customShape = [MyShapeUtil]
export default function CustomShapeToSvgExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				shapeUtils={customShape}
				onMount={(editor) => {
					editor.createShape({ type: MY_CUSTOM_SHAPE_TO_SVG_TYPE, x: 100, y: 100 })
				}}
			/>
		</div>
	)
}
/*
The "export as SVG/PNG" and "copy as SVG/PNG" actions call a shape util's `toSvg` (and
`toBackgroundSvg`) methods. If a shape defines neither, its component is rendered inside a
`<foreignObject>` in the exported SVG instead. That works, but foreignObject content depends
on the viewer's browser and fonts, so a real SVG representation exports more reliably.

For more information on creating a custom shape, check out the custom shape example.

[1]
`toSvg` returns a React element to place in the export in the shape's own coordinate space
(the editor wraps it in a `<g>` with the shape's page transform and opacity). Here a `rect`
matches the HTML component. Read `ctx.isDarkMode` rather than the editor's user preference,
because exports can be requested in either mode regardless of the current UI.

If your shape needs shared resources such as fonts, patterns, or filters, add them once to
the export's `<defs>` with `ctx.addExportDef({ key, getElement })`; defs with the same key
are only added once. Fonts used via `getFontFaces` are embedded automatically. A shape can
also define `toBackgroundSvg` for a layer that exports behind every shape's foreground layer,
as the highlighter shape does.
*/
