import {
	Geometry2d,
	HTMLContainer,
	RecordProps,
	Rectangle2d,
	ShapeUtil,
	T,
	TLResizeInfo,
	TLShape,
	TLStyleContext,
	Tldraw,
	createShapeId,
	getColorValue,
	resizeBox,
	useShapeStyles,
} from 'tldraw'
import 'tldraw/tldraw.css'

// There's a guide at the bottom of this file!

const CARD_SHAPE_TYPE = 'info-card'

// [1]
declare module 'tldraw' {
	export interface TLGlobalShapePropsMap {
		[CARD_SHAPE_TYPE]: CardShapeProps
	}
}

interface CardShapeProps {
	w: number
	h: number
	color: string
	size: string
	title: string
}

// [2]
interface CardShapeResolvedStyles {
	borderColor: string
	backgroundColor: string
	titleFontSize: number
	titleColor: string
	borderWidth: number
	borderRadius: number
}

// [3]
declare module '@tldraw/editor' {
	interface TLShapeStylesMap {
		[CARD_SHAPE_TYPE]: CardShapeResolvedStyles
	}
}

type ICardShape = TLShape<typeof CARD_SHAPE_TYPE>

// [4]
class CardShapeUtil extends ShapeUtil<ICardShape> {
	static override type = CARD_SHAPE_TYPE
	static override props: RecordProps<ICardShape> = {
		w: T.number,
		h: T.number,
		color: T.string,
		size: T.string,
		title: T.string,
	}

	getDefaultProps(): ICardShape['props'] {
		return {
			w: 240,
			h: 160,
			color: 'blue',
			size: 'm',
			title: 'Card',
		}
	}

	// [5]
	override getDefaultStyles(shape: ICardShape, ctx: TLStyleContext): CardShapeResolvedStyles {
		const sizeToken = ctx.sizes[shape.props.size] ?? ctx.sizes.m
		return {
			borderColor: getColorValue(ctx.theme, shape.props.color as any, 'solid'),
			backgroundColor: getColorValue(ctx.theme, shape.props.color as any, 'semi'),
			titleColor: getColorValue(ctx.theme, shape.props.color as any, 'solid'),
			titleFontSize: sizeToken.labelFont,
			borderWidth: sizeToken.stroke,
			borderRadius: 12,
		}
	}

	override canResize() {
		return true
	}

	override onResize(shape: any, info: TLResizeInfo<any>) {
		return resizeBox(shape, info)
	}

	getGeometry(shape: ICardShape): Geometry2d {
		return new Rectangle2d({
			width: shape.props.w,
			height: shape.props.h,
			isFilled: true,
		})
	}

	// [6]
	component(shape: ICardShape) {
		return <CardComponent shape={shape} />
	}

	indicator(shape: ICardShape) {
		return <rect width={shape.props.w} height={shape.props.h} rx={12} ry={12} />
	}
}

// [7]
function CardComponent({ shape }: { shape: ICardShape }) {
	const styles = useShapeStyles(shape)

	return (
		<HTMLContainer
			style={{
				borderColor: styles.borderColor,
				backgroundColor: styles.backgroundColor,
				borderWidth: styles.borderWidth,
				borderStyle: 'solid',
				borderRadius: styles.borderRadius,
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'center',
				pointerEvents: 'all',
			}}
		>
			<span
				style={{
					fontSize: styles.titleFontSize,
					color: styles.titleColor,
					fontWeight: 600,
				}}
			>
				{shape.props.title}
			</span>
		</HTMLContainer>
	)
}

const shapeUtils = [CardShapeUtil]

export default function CustomShapeStylesExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				shapeUtils={shapeUtils}
				onMount={(editor) => {
					// [8]
					const colors = ['red', 'blue', 'green', 'violet'] as const
					const sizes = ['s', 'm', 'l', 'xl'] as const

					colors.forEach((color, ci) => {
						sizes.forEach((size, si) => {
							editor.createShape({
								id: createShapeId(),
								type: CARD_SHAPE_TYPE,
								x: 100 + si * 270,
								y: 100 + ci * 190,
								props: {
									color,
									size,
									title: `${color} ${size}`,
								},
							})
						})
					})

					editor.zoomToFit({ animation: { duration: 0 } })
				}}
			/>
		</div>
	)
}

/*
[1]
Register the custom shape's props with the type system via module augmentation.

[2]
Define the resolved styles interface — the concrete CSS values that getDefaultStyles
returns. These are the values your component will consume.

[3]
Register the resolved styles type with TLShapeStylesMap so that useShapeStyles()
returns the correctly typed object for this shape type.

[4]
The CardShapeUtil uses standard tldraw style props (color, size) so it integrates
with the built-in style panel. Users can change color and size like any other shape.

[5]
getDefaultStyles() maps the shape's style tokens to concrete values. It receives
the shape and a TLStyleContext with the resolved theme, size tokens, and font map.
Use getColorValue() to look up color variants from the theme.

[6]
The component delegates to a separate function component so it can call the
useShapeStyles() hook (hooks can't be called in class methods).

[7]
CardComponent uses useShapeStyles() to get the resolved style values. These
automatically update when the theme changes, tokens are customized, or runtime
overrides are applied via getShapeStyleOverrides.

[8]
Create a grid of cards in different colors and sizes to show how the style
tokens map to different visual results.
*/
