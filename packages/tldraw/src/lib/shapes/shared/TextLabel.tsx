import { Renderer } from '@cristata/prosemirror-to-html-js'
import {
	Box,
	DefaultFontFamilies,
	TLDefaultFillStyle,
	TLDefaultFontStyle,
	TLDefaultHorizontalAlignStyle,
	TLDefaultVerticalAlignStyle,
	TLShapeId,
} from '@tldraw/editor'
import { Node } from 'prosemirror-model'
import React, { useEffect, useState } from 'react'
import { PlainTextArea, RichTextArea, tldrawProseMirrorSchema } from '../text/TextArea'
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
	text: string
	richText?: string
	labelColor: string
	bounds?: Box
	isNote?: boolean
	isSelected: boolean
	onKeyDown?(e: React.KeyboardEvent<HTMLTextAreaElement>): void
	classNamePrefix?: string
	style?: React.CSSProperties
	textWidth?: number
	textHeight?: number
	padding?: number
}

/** @public @react */
export const TextLabel = React.memo(function TextLabel({
	shapeId: shapeId,
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
	const [htmlFromMarkdown, setHtmlFromMarkdown] = useState<string | null>(null)
	const { rInput, isEmpty, isEditing, isEditingAnything, ...editableTextRest } = useEditableText(
		shapeId,
		type,
		plaintext,
		richText
	)

	useEffect(() => {
		async function processMarkdown(richText: string) {
			const html = await renderHtmlFromRichText(richText)
			setHtmlFromMarkdown(html)
		}
		if (enableRichText && richText) {
			processMarkdown(richText)
		} else {
			// This is the 'short-circuit' path. If it's just plaintext, we don't need to do anything fancy.
			if (htmlFromMarkdown) {
				setHtmlFromMarkdown(null)
			}
		}
	}, [plaintext, enableRichText, richText, htmlFromMarkdown])

	const currentText = richText || plaintext
	const [initialText, setInitialText] = useState(currentText)

	useEffect(() => {
		if (!isEditing) setInitialText(currentText)
	}, [isEditing, currentText])

	const finalText = TextHelpers.normalizeTextForDom(currentText)
	const hasText = finalText.length > 0

	const legacyAlign = isLegacyAlign(align)

	if (!isEditing && !hasText) {
		return null
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
							className="ProseMirror"
							dangerouslySetInnerHTML={{ __html: htmlFromMarkdown || '' }}
						/>
					) : (
						finalText.split('\n').map((lineOfText, index) => (
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
						key={initialText}
						text={plaintext}
						richText={richText}
						isEditing={isEditing}
						{...editableTextRest}
						handleKeyDown={handleKeyDownCustom ?? editableTextRest.handleKeyDown}
					/>
				)}
			</div>
		</div>
	)
})

export function renderHtmlFromRichText(richText: string) {
	const renderer = new Renderer()
	// We replace empty paragraphs with a single line break to prevent the browser from collapsing them.
	return renderer.render(JSON.parse(richText)).replaceAll('<p></p>', '<p><br /></p>')
}

export function renderHtmlFromRichTextForMeasurement(richText: string) {
	const html = renderHtmlFromRichText(richText)
	return `<div class="ProseMirror">${html}</div>`
}

export function renderPlaintextFromRichText(richText: string) {
	const node = Node.fromJSON(tldrawProseMirrorSchema, JSON.parse(richText))
	return node.textBetween(0, node.nodeSize - 2, '\n')
}

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
}: {
	bounds: Box
	richText: string
	fontSize: number
	font: TLDefaultFontStyle
	align: TLDefaultHorizontalAlignStyle
	verticalAlign: TLDefaultVerticalAlignStyle
	wrap?: boolean
	labelColor: string
	padding: number
}) {
	const html = renderHtmlFromRichText(richText)
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
