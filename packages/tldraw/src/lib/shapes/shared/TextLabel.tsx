import {
	Box,
	TLDefaultColorStyle,
	TLDefaultFillStyle,
	TLDefaultFontStyle,
	TLDefaultHorizontalAlignStyle,
	TLDefaultVerticalAlignStyle,
	TLShapeId,
	getDefaultColorTheme,
	useIsDarkMode,
} from '@tldraw/editor'
import React, { useEffect, useState } from 'react'
import { TextArea } from '../text/TextArea'
import { TextHelpers } from './TextHelpers'
import { isLegacyAlign } from './legacyProps'
import { useEditableText } from './useEditableText'

type TextLabelProps = {
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
export const TextLabel = React.memo(function TextLabel({
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
}: TextLabelProps) {
	const { rInput, isEmpty, isEditing, ...editableTextRest } = useEditableText(id, type, text)

	const [initialText, setInitialText] = useState(text)
	useEffect(() => {
		if (!isEditing) {
			setInitialText(text)
		}
	}, [isEditing, text])

	const finalText = TextHelpers.normalizeTextForDom(text)
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
				<TextArea
					id={`text-input-${id}`}
					ref={rInput}
					// We need to add the initial value as the key here because we need this component to
					// 'reset' when this state changes and grab the latest defaultValue.
					key={initialText}
					text={text}
					isEditing={isEditing}
					{...editableTextRest}
				/>
			</div>
		</div>
	)
})
