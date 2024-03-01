/* eslint-disable react-hooks/rules-of-hooks */
import {
	Geometry2d,
	HTMLContainer,
	HandleSnapGeometry,
	Rectangle2d,
	ShapeProps,
	ShapeUtil,
	T,
	TLBaseShape,
	TLOnResizeHandler,
	resizeBox,
} from '@tldraw/tldraw'

// There's a guide at the bottom of this file!

type ICustomShape = TLBaseShape<
	'my-custom-shape',
	{
		w: number
		h: number
		text: string
	}
>

export class MyShapeUtil extends ShapeUtil<ICustomShape> {
	static override type = 'my-custom-shape' as const

	static override props: ShapeProps<ICustomShape> = {
		w: T.number,
		h: T.number,
		text: T.string,
	}

	getGeometry(shape: ICustomShape): Geometry2d {
		return new Rectangle2d({
			width: shape.props.w,
			height: shape.props.h,
			isFilled: true,
		})
	}

	override onResize: TLOnResizeHandler<any> = (shape, info) => {
		return resizeBox(shape, info)
	}

	override getHandleSnapGeometry(shape: ICustomShape): HandleSnapGeometry {
		return {
			points: this.getGeometry(shape).bounds.cornersAndCenter,
		}
	}

	getDefaultProps(): ICustomShape['props'] {
		return {
			w: 200,
			h: 200,
			text: "I'm a shape!",
		}
	}

	component(shape: ICustomShape) {
		return <HTMLContainer style={{ backgroundColor: '#efefef' }}>{shape.props.text}</HTMLContainer>
	}

	indicator(shape: ICustomShape) {
		return <rect width={shape.props.w} height={shape.props.h} />
	}
}
