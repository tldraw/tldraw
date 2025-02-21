import {
	Box,
	DefaultFontFamilies,
	TLDefaultFillStyle,
	TLDefaultFontStyle,
	TLDefaultHorizontalAlignStyle,
	TLDefaultVerticalAlignStyle,
	TLRichText,
	TLShapeId,
	preventDefault,
	stopEventPropagation,
	useEditor,
} from '@tldraw/editor'
import React, { useMemo } from 'react'
import { renderHtmlFromRichText, renderPlaintextFromRichText } from '../../utils/text/richText'
import { RichTextArea } from '../text/RichTextArea'
import { TEXT_PROPS } from './default-shape-constants'
import { isLegacyAlign } from './legacyProps'
import { useEditableRichText } from './useEditableRichText'

/** @public */
export interface RichTextLabelProps {
	shapeId: TLShapeId
	type: string
	font: TLDefaultFontStyle
	fontSize: number
	lineHeight: number
	fill?: TLDefaultFillStyle
	align: TLDefaultHorizontalAlignStyle
	verticalAlign: TLDefaultVerticalAlignStyle
	wrap?: boolean
	richText?: TLRichText
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
export const RichTextLabel = React.memo(function RichTextLabel({
	shapeId,
	type,
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
}: RichTextLabelProps) {
	const editor = useEditor()
	const { rInput, isEmpty, isEditing, isEditingAnything, ...editableTextRest } =
		useEditableRichText(shapeId, type, richText)
	const html = useMemo(() => {
		if (richText) {
			return renderHtmlFromRichText(editor, richText)
		}
	}, [editor, richText])

	const legacyAlign = isLegacyAlign(align)

	const hasText = richText ? renderPlaintextFromRichText(editor, richText).length > 0 : false
	if (!isEditing && !hasText) {
		return null
	}

	const handlePointerDownCapture = (e: React.PointerEvent<HTMLDivElement>) => {
		// Allow links to be clicked upon.
		if (e.target instanceof HTMLElement && e.target.tagName === 'A') {
			preventDefault(e)
			stopEventPropagation(e)
		}
	}

	// TODO: probably combine tl-text and tl-arrow eventually
	const cssPrefix = classNamePrefix || 'tl-text'
	return (
		<div
			className={`${cssPrefix}-label tl-text-wrapper tl-rich-text-wrapper`}
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
					{richText && (
						<div
							className="tl-rich-text"
							// todo: see if I can abuse this
							dangerouslySetInnerHTML={{ __html: html || '' }}
							onPointerDownCapture={handlePointerDownCapture}
							data-iseditinganything={isEditingAnything}
						/>
					)}
				</div>
				{/* todo: it might be okay to have just isEditing here */}
				{(isEditingAnything || isSelected) && (
					<RichTextArea
						// Fudge the ref type because we're using forwardRef and it's not typed correctly.
						ref={rInput as any}
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
				? ('start' as const)
				: ('end' as const)
	const justifyContent =
		align === 'middle'
			? ('center' as const)
			: align === 'start'
				? ('flex-start' as const)
				: ('flex-end' as const)
	const alignItems =
		verticalAlign === 'middle' ? 'center' : verticalAlign === 'start' ? 'flex-start' : 'flex-end'
	const wrapperStyle = {
		display: 'flex',
		height: `calc(${bounds.h}px - ${padding * 2}px + 1px)`,
		justifyContent,
		alignItems,
		padding: `${padding}px`,
	}
	const style = {
		fontSize: `${fontSize}px`,
		fontFamily: DefaultFontFamilies[font],
		wrap: wrap ? 'wrap' : 'nowrap',
		color: labelColor,
		lineHeight: TEXT_PROPS.lineHeight,
		textAlign,
		width: '100%',
		wordWrap: 'break-word' as const,
		overflowWrap: 'break-word' as const,
		whiteSpace: 'pre-wrap',
	}

	return (
		<foreignObject
			x={bounds.minX}
			y={bounds.minY}
			width={bounds.w}
			height={bounds.h}
			className="tl-export-embed-styles tl-rich-text tl-rich-text-svg"
		>
			<div style={wrapperStyle}>
				<div dangerouslySetInnerHTML={{ __html: html }} style={style} />
			</div>
		</foreignObject>
	)
}
