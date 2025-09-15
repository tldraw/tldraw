import {
	BaseBoxShapeUtil,
	DefaultColorStyle,
	DefaultFontStyle,
	DefaultSizeStyle,
	TLBaseShape,
	TLDefaultColorStyle,
	TLDefaultFontStyle,
	TLDefaultSizeStyle,
	getDefaultColorTheme,
	stopEventPropagation,
	useIsEditing,
} from '@tldraw/editor'
// Constants for text styling
const FONT_SIZES = { s: 18, m: 24, l: 36, xl: 44 }
const TEXT_PROPS = { lineHeight: 1.35 }

// Text helper functions  
const getTextStyleDefaults = ({ font, size }: { font: string; size: string }) => ({
	fontSize: FONT_SIZES[size as keyof typeof FONT_SIZES] || FONT_SIZES.m,
	lineHeight: TEXT_PROPS.lineHeight,
})
import { PlainTextLabel } from './PlainTextLabel'

// [1]
export type PlainTextLabelShape = TLBaseShape<
	'plain-text-label',
	{
		color: TLDefaultColorStyle
		size: TLDefaultSizeStyle
		font: TLDefaultFontStyle
		text: string
	}
>

// [2]
export class PlainTextLabelUtil extends BaseBoxShapeUtil<PlainTextLabelShape> {
	static override type = 'plain-text-label' as const

	getDefaultProps(): PlainTextLabelShape['props'] {
		return {
			color: 'black',
			size: 'm',
			font: 'draw',
			text: 'Label',
		}
	}

	getMinDimensions(shape: PlainTextLabelShape) {
		return { w: 40, h: 32 }
	}

	component(shape: PlainTextLabelShape) {
		const {
			id,
			type,
			props: { color, font, size, text },
		} = shape

		const isEditing = useIsEditing(id)
		const theme = getDefaultColorTheme({ isDarkMode: this.editor.user.getIsDarkMode() })
		const bounds = this.getDefaultBounds(shape)

		// [3]
		const { fontSize, lineHeight } = getTextStyleDefaults({
			font,
			size,
		})

		return (
			<div
				className={isEditing ? 'tl-text-shape__wrapper tl-text-shape__wrapper__editing' : 'tl-text-shape__wrapper'}
				onPointerDown={stopEventPropagation}
				style={{
					width: bounds.width,
					height: bounds.height,
					backgroundColor: theme[color].semi,
					border: `2px solid ${theme[color].solid}`,
					borderRadius: 8,
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
					padding: 8,
				}}
			>
				{/* [4] */}
				<PlainTextLabel
					shapeId={id}
					type={type}
					font={font}
					fontSize={fontSize}
					lineHeight={lineHeight}
					align="middle"
					verticalAlign="middle"
					text={text}
					labelColor={theme[color].solid}
					bounds={bounds}
					wrap={false}
					isSelected={false}
				/>
			</div>
		)
	}

	indicator(shape: PlainTextLabelShape) {
		const bounds = this.getDefaultBounds(shape)
		return <rect width={bounds.width} height={bounds.height} />
	}

	override onEditEnd: TLBaseShape['onEditEnd'] = (shape) => {
		const {
			props: { text },
		} = shape

		if (text.trimEnd() !== text) {
			this.editor.updateShape({
				id: shape.id,
				type: shape.type,
				props: {
					text: text.trimEnd(),
				},
			})
		}
	}
}

/*
[1] Define a simple label shape type with plain text

[2] Create a label shape util for simple text labels

[3] Get text styling from TextHelpers

[4] Use PlainTextLabel with centered alignment for a simple label
*/