import {
	BaseBoxShapeUtil,
	DefaultSizeStyle,
	HTMLContainer,
	T,
	TLBaseShape,
	Tldraw,
} from '@tldraw/tldraw'
import '@tldraw/tldraw/tldraw.css'
import snapshot from './snapshot.json'

// There's a guide at the bottom of this file!

type IMyShape = TLBaseShape<
	'myshape',
	{
		w: number
		h: number
		size: 's' | 'm' | 'l' | 'xl'
	}
>

class MyShapeUtil extends BaseBoxShapeUtil<IMyShape> {
	static override type = 'myshape' as const
	// [1]
	static override props = {
		w: T.number,
		h: T.number,
		size: DefaultSizeStyle,
	}

	getDefaultProps(): IMyShape['props'] {
		return {
			w: 300,
			h: 300,
			size: 'm',
		}
	}

	// [2]
	component(shape: IMyShape) {
		const FONT_SIZES = {
			s: 14,
			m: 25,
			l: 38,
			xl: 48,
		}
		const size = FONT_SIZES[shape.props.size]

		return (
			<HTMLContainer
				id={shape.id}
				style={{ backgroundColor: 'rgba(0,0,0,0.1)', overflow: 'hidden' }}
			>
				<div style={{ fontSize: size }}>
					Select the shape and use the style panel to change the font size
				</div>
			</HTMLContainer>
		)
	}

	indicator(shape: IMyShape) {
		return <rect width={shape.props.w} height={shape.props.h} />
	}
}

// [3]
const customShapeUtils = [MyShapeUtil]

export default function ShapeWithTldrawStylesExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				// Pass in the array of custom shape classes
				shapeUtils={customShapeUtils}
				snapshot={snapshot}
			/>
		</div>
	)
}

/* 
Introduction:

By default the style panel exposes the opacity slider fot all selected shapes, including custom shapes.
If you want to control other styles using the tldraw style panel you can do that by using default 
StyleProps in your shape's props[1]. In this example the size of the text is controlled by the size
style prop.

Check out the custom shape example





*/
