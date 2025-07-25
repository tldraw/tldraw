import { ReactElement } from 'react'
import {
	Geometry2d,
	HTMLContainer,
	RecordProps,
	Rectangle2d,
	ShapeUtil,
	SvgExportContext,
	T,
	TLBaseShape,
	Tldraw,
} from 'tldraw'
import 'tldraw/tldraw.css'

// There's a guide at the bottom of this file!

type ICustomShape = TLBaseShape<
	'my-custom-shape',
	{
		w: number
		h: number
	}
>

const LIGHT_FILL = '#ff8888'
const DARK_FILL = '#ffcccc'

export class MyShapeUtil extends ShapeUtil<ICustomShape> {
	static override type = 'my-custom-shape' as const
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

	override canEdit() {
		return false
	}
	override canResize() {
		return false
	}
	override isAspectRatioLocked() {
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
		const isDarkmode = this.editor.user.getIsDarkMode()
		return <HTMLContainer style={{ backgroundColor: isDarkmode ? DARK_FILL : LIGHT_FILL }} />
	}

	indicator(shape: ICustomShape) {
		return this.getSvgRect(shape)
	}

	// [1]
	override toSvg(
		shape: ICustomShape,
		ctx: SvgExportContext
	): ReactElement | null | Promise<ReactElement | null> {
		// ctx.addExportDef(getFontDef(shape))
		const isDarkmode = ctx.isDarkMode
		const fill = isDarkmode ? DARK_FILL : LIGHT_FILL
		return this.getSvgRect(shape, { fill })
	}

	getSvgRect(shape: ICustomShape, props?: { fill: string }) {
		return <rect width={shape.props.w} height={shape.props.h} {...props} />
	}

	// [2]

	// override toBackgroundSvg(
	// 	shape: ICustomShape,
	// 	ctx: SvgExportContext
	// ): ReactElement | null | Promise<ReactElement | null> {
	// 	const isDarkmode = ctx.isDarkMode
	// 	const fill = isDarkmode ? '#333' : '#efefef'
	// 	return <rect width={shape.props.w} height={shape.props.h} fill={fill} />
	// }
}

// [3]

// function getFontDef(shape: ICustomShape): SvgExportDef {
// 	//
// 	return {
// 		some unique key,
// 		key: 'my-custom-shape-font',
// 		getElement: async () => {
// 			return <style></style> element
// 			check out the defaultStyleDefs.tsx file for an example of how
// 			we do this for tldraw fonts
// 		},
// 	}
// }

const customShape = [MyShapeUtil]
export default function CustomShapeToSvgExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				shapeUtils={customShape}
				onMount={(editor) => {
					editor.createShape({ type: 'my-custom-shape', x: 100, y: 100 })
				}}
			/>
		</div>
	)
}
/*
 The "export as SVG/PNG" and "copy as SVG/PNG" actions use the `toSvg` or `toBackgroundSvg`
 methods of a shape util. If a shape does not have a `toSvg` or `toBackgroundSvg` method
 defined, it will default to an empty box.

 For more information on creating a custom shape, check out the custom shape example.

 [1]
    This method should return a React element that represents the shape as an SVG element.
    If your shape is HTML, then you will need to convert it to an SVG representation. In this
    example we've used a `rect` element to represent the shape. Other shapes may require more
    complex work to render them as SVGs, especially if they contain text. Check out [3] for more
	info.

[2]
    The `toBackgroundSvg` method is used to render a layer behind the shape when exporting as SVG.
    We use this in the tldraw codebase to make the highlighter shape. It's commented out here as
    we don't need it for this example.

[3]
	If your shape contains text, you may need to add a font definition to the SVG. This is done
	using the `addExportDef` method of the `SvgExportContext`. Your font def must contain a unique
	key and a function that returns a React element. Check out the `` function
	in the `defaultStyleDefs.tsx` file for an example of how this is done for tldraw fonts.

 */
