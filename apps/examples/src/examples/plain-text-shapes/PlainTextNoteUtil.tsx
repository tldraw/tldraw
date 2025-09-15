import {
	BaseBoxShapeUtil,
	DefaultColorStyle,
	DefaultFontStyle,
	DefaultSizeStyle,
	TLBaseShape,
	TLDefaultColorStyle,
	TLDefaultFontStyle,
	TLDefaultSizeStyle,
	Vec,
	getDefaultColorTheme,
	stopEventPropagation,
	structuredClone,
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

const getTextLines = ({ text, width }: { text: string; width: number; font: string; fontSize: number; lineHeight: number; wrap: boolean }) => {
	// Simple text measurement - in a real implementation you'd use proper text measurement
	const words = text.split(' ')
	const lines = []
	let currentLine = ''
	const avgCharWidth = 12 // approximate character width
	const maxCharsPerLine = Math.floor(width / avgCharWidth)
	
	for (const word of words) {
		if (currentLine.length + word.length + 1 <= maxCharsPerLine) {
			currentLine += (currentLine ? ' ' : '') + word
		} else {
			if (currentLine) lines.push({ height: 24 }) // approximate line height
			currentLine = word
		}
	}
	if (currentLine) lines.push({ height: 24 })
	
	return lines.length > 0 ? lines : [{ height: 24 }]
}
import { PlainTextLabel } from './PlainTextLabel'

// [1]
export type PlainTextNoteShape = TLBaseShape<
	'plain-text-note',
	{
		color: TLDefaultColorStyle
		size: TLDefaultSizeStyle
		font: TLDefaultFontStyle
		text: string
	}
>

// [2]
export class PlainTextNoteUtil extends BaseBoxShapeUtil<PlainTextNoteShape> {
	static override type = 'plain-text-note' as const

	getDefaultProps(): PlainTextNoteShape['props'] {
		return {
			color: 'black',
			size: 'm',
			font: 'draw',
			text: '',
		}
	}

	getMinDimensions(shape: PlainTextNoteShape) {
		return { w: 192, h: 128 }
	}

	getGeometry(shape: PlainTextNoteShape) {
		const bounds = this.getDefaultBounds(shape)
		const offset = this.getNoteVerticalOffset(shape)

		return this.editor.getShapeGeometry(
			structuredClone({
				...shape,
				x: bounds.x,
				y: bounds.y - offset,
			})
		)
	}

	getNoteVerticalOffset(shape: PlainTextNoteShape) {
		return 32
	}

	getHandles(shape: PlainTextNoteShape) {
		const bounds = this.getDefaultBounds(shape)
		const offset = this.getNoteVerticalOffset(shape)

		return [
			{
				id: 'handle',
				type: 'vertex',
				index: 'a1' as const,
				x: bounds.width / 2,
				y: -offset / 2,
			},
		]
	}

	component(shape: PlainTextNoteShape) {
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

		const noteHeight = Math.max(
			128,
			getTextLines({
				text,
				width: bounds.width - 32,
				font,
				fontSize,
				lineHeight,
				wrap: true,
			}).reduce((h, line) => h + line.height, 0) + 32
		)

		return (
			<>
				{/* [4] */}
				<div
					style={{
						position: 'absolute',
						top: -this.getNoteVerticalOffset(shape),
						left: 0,
						width: bounds.width,
						height: this.getNoteVerticalOffset(shape),
						backgroundColor: theme[color].solid,
						border: `1px solid ${theme[color].solid}`,
						borderTopLeftRadius: 12,
						borderTopRightRadius: 12,
					}}
				/>
				<div
					style={{
						position: 'absolute',
						top: 0,
						left: 0,
						width: bounds.width,
						height: noteHeight,
						backgroundColor: theme[color].semi,
						border: `1px solid ${theme[color].solid}`,
						borderBottomLeftRadius: 12,
						borderBottomRightRadius: 12,
					}}
				/>
				{/* [5] */}
				<div
					className={isEditing ? 'tl-text-shape__wrapper tl-text-shape__wrapper__editing' : 'tl-text-shape__wrapper'}
					onPointerDown={stopEventPropagation}
					style={{
						position: 'absolute',
						top: 16,
						left: 16,
						width: bounds.width - 32,
						height: noteHeight - 32,
						zIndex: 1,
					}}
				>
					<PlainTextLabel
						shapeId={id}
						type={type}
						font={font}
						fontSize={fontSize}
						lineHeight={lineHeight}
						align="start"
						verticalAlign="start"
						text={text}
						labelColor={theme[color].solid}
						bounds={bounds}
						wrap
						isSelected={false}
					/>
				</div>
			</>
		)
	}

	indicator(shape: PlainTextNoteShape) {
		const bounds = this.getDefaultBounds(shape)
		const offset = this.getNoteVerticalOffset(shape)

		return <rect x={0} y={-offset} width={bounds.width} height={bounds.height + offset} />
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
[1] Define the shape type with plain text property

[2] Create a shape util that extends BaseBoxShapeUtil for basic rectangular shape behavior

[3] Calculate text styling using TextHelpers which provides font size and line height calculations

[4] Render the note background with a header section and main body

[5] Use PlainTextLabel to render and edit the plain text content
*/