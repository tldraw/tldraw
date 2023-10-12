import {
	Box2d,
	TLDefaultColorStyle,
	TLDefaultFillStyle,
	TLDefaultFontStyle,
	TLDefaultHorizontalAlignStyle,
	TLDefaultSizeStyle,
	TLDefaultVerticalAlignStyle,
	TLShape,
	stopEventPropagation,
} from '@tldraw/editor'
import React from 'react'
import { useDefaultColorTheme } from './ShapeFill'
import { TextHelpers } from './TextHelpers'
import { LABEL_FONT_SIZES, TEXT_PROPS } from './default-shape-constants'
import { isLegacyAlign } from './legacyProps'
import { useEditableText } from './useEditableText'

export const TextLabel = React.memo(function TextLabel<
	T extends Extract<TLShape, { props: { text: string } }>
>({
	id,
	type,
	text,
	size,
	labelColor,
	font,
	align,
	verticalAlign,
	wrap,
	bounds,
}: {
	id: T['id']
	type: T['type']
	size: TLDefaultSizeStyle
	font: TLDefaultFontStyle
	fill?: TLDefaultFillStyle
	align: TLDefaultHorizontalAlignStyle
	verticalAlign: TLDefaultVerticalAlignStyle
	wrap?: boolean
	text: string
	labelColor: TLDefaultColorStyle
	bounds?: Box2d
}) {
	const {
		rInput,
		isEmpty,
		isEditing,
		handleFocus,
		handleChange,
		handleKeyDown,
		handleBlur,
		handleInputPointerDown,
		handleDoubleClick,
	} = useEditableText(id, type, text)

	const finalText = TextHelpers.normalizeTextForDom(text)
	const hasText = finalText.length > 0

	const legacyAlign = isLegacyAlign(align)
	const theme = useDefaultColorTheme()

	if (!isEditing && !hasText) {
		return null
	}

	return (
		<div
			className="tl-text-label"
			data-font={font}
			data-align={align}
			data-hastext={!isEmpty}
			data-isediting={isEditing}
			data-textwrap={!!wrap}
			style={{
				justifyContent: align === 'middle' || legacyAlign ? 'center' : align,
				alignItems: verticalAlign === 'middle' ? 'center' : verticalAlign,
				...(bounds
					? {
							top: bounds.minY,
							left: bounds.minX,
							width: bounds.width,
							height: bounds.height,
							position: 'absolute',
					  }
					: {}),
			}}
		>
			<div
				className="tl-text-label__inner"
				style={{
					fontSize: LABEL_FONT_SIZES[size],
					lineHeight: LABEL_FONT_SIZES[size] * TEXT_PROPS.lineHeight + 'px',
					minHeight: TEXT_PROPS.lineHeight + 32,
					minWidth: 0,
					color: theme[labelColor].solid,
				}}
			>
				<div className="tl-text tl-text-content" dir="ltr">
					{finalText}
				</div>
				{isEditing && (
					<textarea
						ref={rInput}
						className="tl-text tl-text-input"
						name="text"
						tabIndex={-1}
						autoComplete="false"
						autoCapitalize="false"
						autoCorrect="false"
						autoSave="false"
						autoFocus
						placeholder=""
						spellCheck="true"
						wrap="off"
						dir="auto"
						datatype="wysiwyg"
						defaultValue={text}
						onFocus={handleFocus}
						onChange={handleChange}
						onKeyDown={handleKeyDown}
						onBlur={handleBlur}
						onContextMenu={stopEventPropagation}
						onPointerDown={handleInputPointerDown}
						onDoubleClick={handleDoubleClick}
					/>
				)}
			</div>
		</div>
	)
})
