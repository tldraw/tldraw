import {
	Box,
	TLDefaultFillStyle,
	TLDefaultFontStyle,
	TLDefaultHorizontalAlignStyle,
	TLDefaultVerticalAlignStyle,
	TLShapeId,
} from '@tldraw/editor'
import React from 'react'
import { PlainTextArea } from '../text/PlainTextArea'
import { TextHelpers } from './TextHelpers'
import { isLegacyAlign } from './legacyProps'
import { useEditablePlainText } from './useEditablePlainText'

/** @public */
export interface PlainTextLabelProps {
	shapeId: TLShapeId
	type: string
	font: TLDefaultFontStyle
	fontSize: number
	lineHeight: number
	fill?: TLDefaultFillStyle
	align: TLDefaultHorizontalAlignStyle
	verticalAlign: TLDefaultVerticalAlignStyle
	wrap?: boolean
	text?: string
	labelColor: string
	bounds?: Box
	isSelected: boolean
	onKeyDown?(e: KeyboardEvent): void
	classNamePrefix?: string
	style?: React.CSSProperties
	textWidth?: number
	textHeight?: number
	padding?: number
}

/**
 * Renders a text label that can be used inside of shapes.
 * The component has the ability to be edited in place and furthermore
 * supports rich text editing.
 *
 * @public @react
 */
export const PlainTextLabel = React.memo(function PlainTextLabel({
	shapeId,
	type,
	text: plaintext,
	labelColor,
	font,
	fontSize,
	lineHeight,
	align,
	verticalAlign,
	wrap,
	isSelected,
	padding = 0,
	onKeyDown: handleKeyDownCustom,
	classNamePrefix,
	style,
	textWidth,
	textHeight,
}: PlainTextLabelProps) {
	const { rInput, isEmpty, isEditing, isEditingAnything, ...editableTextRest } =
		useEditablePlainText(shapeId, type, plaintext)

	const finalPlainText = TextHelpers.normalizeTextForDom(plaintext || '')
	const hasText = finalPlainText.length > 0

	const legacyAlign = isLegacyAlign(align)

	if (!isEditing && !hasText) {
		return null
	}

	// TODO: probably combine tl-text and tl-arrow eventually
	const cssPrefix = classNamePrefix || 'tl-text'
	return (
		<div
			className={`${cssPrefix}-label tl-text-wrapper tl-plain-text-wrapper`}
			data-font={font}
			data-align={align}
			data-hastext={!isEmpty}
			data-isediting={isEditing}
			data-iseditinganything={isEditingAnything}
			data-textwrap={!!wrap}
			data-isselected={isSelected}
			style={{
				justifyContent: align === 'middle' || legacyAlign ? 'center' : align,
				alignItems: verticalAlign === 'middle' ? 'center' : verticalAlign,
				padding,
				...style,
			}}
		>
			<div
				className={`${cssPrefix}-label__inner tl-text-content__wrapper`}
				style={{
					fontSize,
					lineHeight: Math.floor(fontSize * lineHeight) + 'px',
					minHeight: Math.floor(fontSize * lineHeight) + 'px',
					minWidth: Math.ceil(textWidth || 0),
					color: labelColor,
					width: textWidth ? Math.ceil(textWidth) : undefined,
					height: textHeight ? Math.ceil(textHeight) : undefined,
				}}
			>
				<div className={`${cssPrefix} tl-text tl-text-content`} dir="auto">
					{finalPlainText.split('\n').map((lineOfText, index) => (
						<div key={index} dir="auto">
							{lineOfText}
						</div>
					))}
				</div>
				{(isEditingAnything || isSelected) && (
					<PlainTextArea
						// Fudge the ref type because we're using forwardRef and it's not typed correctly.
						ref={rInput as any}
						text={plaintext}
						isEditing={isEditing}
						shapeId={shapeId}
						{...editableTextRest}
						handleKeyDown={handleKeyDownCustom ?? editableTextRest.handleKeyDown}
					/>
				)}
			</div>
		</div>
	)
})

/**
 * @deprecated Use `PlainTextLabel` instead.
 * @public
 */
export const TextLabel = PlainTextLabel
