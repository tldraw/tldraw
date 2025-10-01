import {
	Box,
	DefaultFontFamilies,
	TLDefaultFillStyle,
	TLDefaultFontStyle,
	TLDefaultHorizontalAlignStyle,
	TLDefaultVerticalAlignStyle,
	TLEventInfo,
	TLRichText,
	TLShapeId,
	preventDefault,
	useEditor,
	useReactor,
	useValue,
} from '@tldraw/editor'
import React, { useMemo } from 'react'
import { renderHtmlFromRichText } from '../../utils/text/richText'
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
	hasCustomTabBehavior?: boolean
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
	hasCustomTabBehavior,
}: RichTextLabelProps) {
	const editor = useEditor()
	const isDragging = React.useRef(false)
	const { rInput, isEmpty, isEditing, isReadyForEditing, ...editableTextRest } =
		useEditableRichText(shapeId, type, richText)

	const html = useMemo(() => {
		if (richText) {
			return renderHtmlFromRichText(editor, richText)
		}
	}, [editor, richText])

	const selectToolActive = useValue(
		'isSelectToolActive',
		() => editor.getCurrentToolId() === 'select',
		[editor]
	)

	useReactor(
		'isDragging',
		() => {
			editor.getInstanceState()
			isDragging.current = editor.inputs.isDragging
		},
		[editor]
	)

	const legacyAlign = isLegacyAlign(align)

	const handlePointerDown = (e: React.MouseEvent<HTMLDivElement>) => {
		if (e.target instanceof HTMLElement && (e.target.tagName === 'A' || e.target.closest('a'))) {
			// This mousedown prevent default is to let dragging when over a link work.
			preventDefault(e)

			if (!selectToolActive) return
			const link = e.target.closest('a')?.getAttribute('href') ?? ''
			// We don't get the mouseup event later because we preventDefault
			// so we have to do it manually.
			const handlePointerUp = (e: TLEventInfo) => {
				if (e.name !== 'pointer_up' || !link) return

				if (!isDragging.current) {
					window.open(link, '_blank', 'noopener, noreferrer')
				}
				editor.off('event', handlePointerUp)
			}
			editor.on('event', handlePointerUp)
		}
	}

	// Should be guarded higher up so that this doesn't render... but repeated here. This should never be true.
	if (!isEditing && isEmpty) return null

	// TODO: probably combine tl-text and tl-arrow eventually
	const cssPrefix = classNamePrefix || 'tl-text'
	return (
		<div
			className={`${cssPrefix}-label tl-text-wrapper tl-rich-text-wrapper`}
			aria-hidden={!isEditing}
			data-font={font}
			data-align={align}
			data-hastext={!isEmpty}
			data-isediting={isEditing}
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
					lineHeight: lineHeight.toString(),
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
							data-is-select-tool-active={selectToolActive}
							// todo: see if I can abuse this
							dangerouslySetInnerHTML={{ __html: html || '' }}
							onPointerDown={handlePointerDown}
							data-is-ready-for-editing={isReadyForEditing}
						/>
					)}
				</div>
				{(isReadyForEditing || isSelected) && (
					<RichTextArea
						// Fudge the ref type because we're using forwardRef and it's not typed correctly.
						ref={rInput as any}
						richText={richText}
						isEditing={isEditing}
						shapeId={shapeId}
						{...editableTextRest}
						hasCustomTabBehavior={hasCustomTabBehavior}
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
	showTextOutline?: boolean
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
	showTextOutline = true,
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
		fontFamily: DefaultFontFamilies[font],
		height: `100%`,
		justifyContent,
		alignItems,
		padding: `${padding}px`,
	}
	const style = {
		fontSize: `${fontSize}px`,
		wrap: wrap ? 'wrap' : 'nowrap',
		color: labelColor,
		lineHeight: TEXT_PROPS.lineHeight,
		textAlign,
		width: '100%',
		wordWrap: 'break-word' as const,
		overflowWrap: 'break-word' as const,
		whiteSpace: 'pre-wrap',
		textShadow: showTextOutline ? 'var(--tl-text-outline)' : 'none',
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
