import {
	Box,
	DefaultFontFamilies,
	TLDefaultFillStyle,
	TLDefaultFontStyle,
	TLDefaultHorizontalAlignStyle,
	TLDefaultVerticalAlignStyle,
	TLRichText,
	TLShapeId,
	useEditor,
} from '@tldraw/editor'
import React, { useEffect, useState } from 'react'
import { renderHtmlFromRichText, renderPlaintextFromRichText } from '../../utils/text/richText'
import { PlainTextArea } from '../text/PlainTextArea'
import { RichTextArea } from '../text/RichTextArea'
import { TextHelpers } from './TextHelpers'
import { TEXT_PROPS } from './default-shape-constants'
import { isLegacyAlign } from './legacyProps'
import { useEditableText } from './useEditableText'

/** @public */
export interface TextLabelProps {
	shapeId: TLShapeId
	type: string
	font: TLDefaultFontStyle
	fontSize: number
	lineHeight: number
	fill?: TLDefaultFillStyle
	align: TLDefaultHorizontalAlignStyle
	verticalAlign: TLDefaultVerticalAlignStyle
	wrap?: boolean
	enableRichText?: boolean
	text?: string
	richText?: TLRichText
	labelColor: string
	bounds?: Box
	isNote?: boolean
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
export const TextLabel = React.memo(function TextLabel({
	shapeId,
	type,
	enableRichText,
	text: plaintext,
	richText,
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
}: TextLabelProps) {
	const editor = useEditor()
	const [html, setHtml] = useState<string | null>(null)
	const { rInput, isEmpty, isEditing, isEditingAnything, ...editableTextRest } = useEditableText(
		shapeId,
		!!enableRichText,
		type,
		plaintext,
		richText
	)

	useEffect(() => {
		if (enableRichText && richText) {
			const newHtml = renderHtmlFromRichText(editor, richText)
			setHtml(newHtml)
		}
	}, [plaintext, editor, enableRichText, richText])

	const currentText = richText || plaintext || ''
	const [initialText, setInitialText] = useState(currentText)

	useEffect(() => {
		if (!isEditing) setInitialText(currentText)
	}, [isEditing, currentText])

	let finalPlainText = ''
	let hasText = false
	if (enableRichText) {
		hasText = richText ? renderPlaintextFromRichText(editor, richText).length > 0 : false
	} else {
		finalPlainText = TextHelpers.normalizeTextForDom(plaintext || '')
		hasText = finalPlainText.length > 0
	}

	const legacyAlign = isLegacyAlign(align)

	if (!isEditing && !hasText) {
		return null
	}

	const handlePointerDownCapture = (e: React.PointerEvent<HTMLDivElement>) => {
		// Allow links to be clicked upon.
		if (e.target instanceof HTMLElement && e.target.tagName === 'A') {
			e.preventDefault()
			e.stopPropagation()
		}
	}

	// TODO: probably combine tl-text and tl-arrow eventually
	const cssPrefix = classNamePrefix || 'tl-text'
	const TextAreaComponent = enableRichText ? RichTextArea : PlainTextArea
	return (
		<div
			className={`${cssPrefix}-label tl-text-wrapper`}
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
					{enableRichText && richText ? (
						<div
							className="tl-rich-text-tiptap"
							dangerouslySetInnerHTML={{ __html: html || '' }}
							onPointerDownCapture={handlePointerDownCapture}
						/>
					) : (
						finalPlainText.split('\n').map((lineOfText, index) => (
							<div key={index} dir="auto">
								{lineOfText}
							</div>
						))
					)}
				</div>
				{(isEditingAnything || isSelected) && (
					<TextAreaComponent
						// Fudge the ref type because we're using forwardRef and it's not typed correctly.
						ref={rInput as any}
						// We need to add the initial value as the key here because we need this component to
						// 'reset' when this state changes and grab the latest defaultValue.
						key={JSON.stringify(initialText)}
						text={plaintext}
						richText={richText}
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

/** @public */
export interface RichTextSVGProps {
	bounds: Box
	richText: TLRichText
	fontSize: number
	font: TLDefaultFontStyle
	align: TLDefaultHorizontalAlignStyle
	verticalAlign: TLDefaultVerticalAlignStyle
	wrap?: boolean
	labelColor: string
	padding: number
}

/**
 * Renders a rich text string as SVG given bounds and text properties.
 *
 * @public @react
 */
export function RichTextSVG({
	bounds,
	richText,
	fontSize,
	font,
	align,
	verticalAlign,
	wrap,
	labelColor,
	padding,
}: RichTextSVGProps) {
	const editor = useEditor()
	const html = renderHtmlFromRichText(editor, richText)
	const textAlign =
		align === 'middle'
			? ('center' as const)
			: align === 'start'
				? ('left' as const)
				: ('right' as const)
	const justifyContent =
		verticalAlign === 'middle' ? 'center' : verticalAlign === 'start' ? 'flex-start' : 'flex-end'
	const style = {
		display: 'flex',
		flexDirection: 'column' as const,
		height: `calc(${bounds.h}px - ${padding * 2}px - 2px)`,
		fontSize: `${fontSize}px`,
		fontFamily: DefaultFontFamilies[font],
		textAlign: textAlign,
		justifyContent,
		padding: `${padding}px`,
		wrap: wrap ? 'wrap' : 'nowrap',
		color: labelColor,
		lineHeight: TEXT_PROPS.lineHeight,
	}

	return (
		<foreignObject
			x={bounds.minX}
			y={bounds.minY}
			width={bounds.w}
			height={bounds.h}
			className="tl-rich-text-svg"
		>
			<div dangerouslySetInnerHTML={{ __html: html }} style={style} />
		</foreignObject>
	)
}
