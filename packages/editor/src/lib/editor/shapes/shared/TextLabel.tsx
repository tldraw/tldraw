import {
	TLDefaultColorStyle,
	TLDefaultFillStyle,
	TLDefaultFontStyle,
	TLDefaultHorizontalAlignStyle,
	TLDefaultSizeStyle,
	TLDefaultVerticalAlignStyle,
	TLShape,
} from '@tldraw/tlschema'
import React from 'react'
import { stopEventPropagation } from '../../../utils/dom'
import { isLegacyAlign } from '../../../utils/legacy'
import { TextHelpers } from '../text/TextHelpers'
import { useDefaultColorTheme } from './ShapeFill'
import { LABEL_FONT_SIZES, TEXT_PROPS } from './default-shape-constants'
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
}) {
	const {
		rInput,
		isEmpty,
		isEditing,
		isEditableFromHover,
		handleFocus,
		handleChange,
		handleKeyDown,
		handleBlur,
	} = useEditableText(id, type, text)

	const isInteractive = isEditing || isEditableFromHover
	const finalText = TextHelpers.normalizeTextForDom(text)
	const hasText = finalText.trim().length > 0
	const legacyAlign = isLegacyAlign(align)
	const theme = useDefaultColorTheme()

	return (
		<div
			className="tl-text-label"
			data-font={font}
			data-align={align}
			data-hastext={!isEmpty}
			data-isediting={isEditing}
			data-textwrap={!!wrap}
			style={
				hasText || isInteractive
					? {
							justifyContent: align === 'middle' || legacyAlign ? 'center' : align,
							alignItems: verticalAlign === 'middle' ? 'center' : verticalAlign,
					  }
					: undefined
			}
		>
			<div
				className="tl-text-label__inner"
				style={{
					fontSize: LABEL_FONT_SIZES[size],
					lineHeight: LABEL_FONT_SIZES[size] * TEXT_PROPS.lineHeight + 'px',
					minHeight: isEmpty ? LABEL_FONT_SIZES[size] * TEXT_PROPS.lineHeight + 32 : 0,
					minWidth: isEmpty ? 33 : 0,
					color: theme[labelColor].solid,
				}}
			>
				<div className="tl-text tl-text-content" dir="ltr">
					{finalText}
				</div>
				{isInteractive ? (
					// Consider replacing with content-editable
					<textarea
						ref={rInput}
						className="tl-text tl-text-input"
						name="text"
						tabIndex={-1}
						autoComplete="false"
						autoCapitalize="false"
						autoCorrect="false"
						autoSave="false"
						autoFocus={isEditing}
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
					/>
				) : null}
			</div>
		</div>
	)
})
