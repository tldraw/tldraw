import {
	BaseBoxShapeUtil,
	HTMLContainer,
	T,
	TLBaseShape,
	TLOnResizeHandler,
	resizeBox,
} from 'tldraw'

// There's a guide at the bottom of this file!

export type IMyShape = TLBaseShape<
	'myshape',
	{
		w: number
		h: number
	}
>

export class MyShapeUtil extends BaseBoxShapeUtil<IMyShape> {
	static override type = 'myshape' as const

	static override props = {
		w: T.number,
		h: T.number,
	}

	getDefaultProps(): IMyShape['props'] {
		return {
			w: 300,
			h: 300,
		}
	}

	component(shape: IMyShape) {
		return <HTMLContainer id={shape.id} style={{}}></HTMLContainer>
	}

	indicator(shape: IMyShape) {
		return <rect width={shape.props.w} height={shape.props.h} />
	}

	override onResize: TLOnResizeHandler<IMyShape> = (shape, info) => {
		return resizeBox(shape, info)
	}
}
