import {
	TLDefaultColorStyle,
	TLDefaultFillStyle,
	TLDefaultFontStyle,
	TLDefaultHorizontalAlignStyle,
	TLDefaultVerticalAlignStyle,
	TLShapeId,
	getDefaultColorTheme,
} from '@tldraw/tlschema'
import React from 'react'
import { useEditableText } from '../../hooks/useEditableText'
import { useIsDarkMode } from '../../hooks/useIsDarkMode'
import { Box } from '../../primitives/Box'
import { normalizeTextForDom, stopEventPropagation } from '../../utils/dom'

/** @public */
export type TLTextLabelProps = {
	id: TLShapeId
	type: string
	font: TLDefaultFontStyle
	fontSize: number
	lineHeight: number
	fill?: TLDefaultFillStyle
	align: TLDefaultHorizontalAlignStyle
	verticalAlign: TLDefaultVerticalAlignStyle
	wrap?: boolean
	text: string
	labelColor: TLDefaultColorStyle
	bounds?: Box
	classNamePrefix?: string
	style?: React.CSSProperties
	textWidth?: number
	textHeight?: number
}

/** @public */
export const DefaultTextLabel = React.memo(function DefaultTextLabel({
	id,
	type,
	text,
	labelColor,
	font,
	fontSize,
	lineHeight,
	align,
	verticalAlign,
	wrap,
	bounds,
	classNamePrefix,
	style,
	textWidth,
	textHeight,
}: TLTextLabelProps) {
	const { rInput, isEmpty, isEditing, ...editableTextRest } = useEditableText(id, type, text)

	const finalText = normalizeTextForDom(text)
	const hasText = finalText.length > 0

	const legacyAlign = isLegacyAlign(align)
	const theme = getDefaultColorTheme({ isDarkMode: useIsDarkMode() })

	if (!isEditing && !hasText) {
		return null
	}

	// TODO: probably combine tl-text and tl-arrow eventually
	const cssPrefix = classNamePrefix || 'tl-text'
	return (
		<div
			className={`${cssPrefix}-label tl-text-wrapper`}
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
				...style,
			}}
		>
			<div
				className={`${cssPrefix}-label__inner`}
				style={{
					fontSize,
					lineHeight: fontSize * lineHeight + 'px',
					minHeight: lineHeight + 32,
					minWidth: textWidth || 0,
					color: theme[labelColor].solid,
					width: textWidth,
					height: textHeight,
				}}
			>
				<div className={`${cssPrefix} tl-text tl-text-content`} dir="ltr">
					{finalText}
				</div>
				{isEditing && <TextArea rInput={rInput} text={text} {...editableTextRest} />}
			</div>
		</div>
	)
})

/** @public */
export function TextArea({
	rInput,
	text,
	handleFocus,
	handleChange,
	handleKeyDown,
	handleBlur,
	handleInputPointerDown,
	handleDoubleClick,
}: {
	rInput: React.RefObject<HTMLTextAreaElement>
	text: string
	handleFocus: () => void
	handleBlur: () => void
	handleKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void
	handleChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void
	handleInputPointerDown: (e: React.PointerEvent<HTMLTextAreaElement>) => void
	handleDoubleClick: (e: any) => any
}) {
	return (
		<textarea
			ref={rInput}
			className="tl-text tl-text-input"
			name="text"
			tabIndex={-1}
			autoComplete="off"
			autoCapitalize="off"
			autoCorrect="off"
			autoSave="off"
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
			onTouchEnd={stopEventPropagation}
			onContextMenu={stopEventPropagation}
			onPointerDown={handleInputPointerDown}
			onDoubleClick={handleDoubleClick}
		/>
	)
}

// sneaky TLDefaultHorizontalAlignStyle for legacies
function isLegacyAlign(align: TLDefaultHorizontalAlignStyle | string): boolean {
	return align === 'start-legacy' || align === 'middle-legacy' || align === 'end-legacy'
}
