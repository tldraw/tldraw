import {
	Box,
	ExtractShapeByProps,
	TLEventInfo,
	TLRichText,
	TLShapeId,
	isAccelKey,
	openWindow,
	preventDefault,
	resolveLineHeightPx,
	useEditor,
	useReactor,
	useValue,
} from '@tldraw/editor'
import classNames from 'classnames'
import React, { useMemo } from 'react'
import { renderHtmlFromRichText, toggleTaskItemInRichText } from '../../utils/text/richText'
import { RichTextArea } from '../text/RichTextArea'
import { isLegacyAlign } from './legacyProps'
import { useEditableRichText } from './useEditableRichText'

/** @public */
export interface RichTextLabelProps {
	shapeId: TLShapeId
	type: ExtractShapeByProps<{ richText: TLRichText }>['type']
	fontFamily: string
	fontSize: number
	lineHeight: number
	textAlign: 'start' | 'center' | 'end'
	verticalAlign: 'start' | 'middle' | 'end'
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
	showTextOutline?: boolean
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
	fontFamily,
	fontSize,
	lineHeight,
	textAlign,
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
	showTextOutline = true,
}: RichTextLabelProps) {
	const editor = useEditor()
	const isDragging = React.useRef(false)
	const legacyAlign = isLegacyAlign(textAlign)
	const { rInput, isEmpty, isEditing, isReadyForEditing, ...editableTextRest } =
		useEditableRichText(shapeId, type, richText)

	const html = useMemo(() => {
		if (richText) {
			return renderHtmlFromRichText(editor, richText)
		}
		return undefined
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
			isDragging.current = editor.inputs.getIsDragging()
		},
		[editor]
	)

	const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
		if (handleTaskItemPointerDown(e)) return

		const HTMLElementCtor = editor.getContainerWindow().HTMLElement
		if (
			e.target instanceof HTMLElementCtor &&
			(e.target.tagName === 'A' || e.target.closest('a'))
		) {
			// This mousedown prevent default is to let dragging when over a link work.
			preventDefault(e)

			if (!selectToolActive) return
			const link = e.target.closest('a')?.getAttribute('href') ?? ''
			// We don't get the mouseup event later because we preventDefault
			// so we have to do it manually.
			const handlePointerUp = (e: TLEventInfo) => {
				if (e.name !== 'pointer_up' || !link) return

				if (!isDragging.current) {
					openWindow(link, '_blank', false)
				}
				editor.off('event', handlePointerUp)
			}
			editor.on('event', handlePointerUp)
		}
	}

	/**
	 * Ticks a checkbox in one click, without entering edit mode first. The static HTML has no
	 * ProseMirror behind it and its checkboxes don't take pointer events (see editor.css), so the hit
	 * test is by the labels' rects. The canvas is told to ignore the press, so it doesn't also select
	 * the shape or start a drag, and the item flips on pointer up over the same box, like a click.
	 */
	const handleTaskItemPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
		if (!selectToolActive || isEditing || editor.getIsReadonly()) return false
		// Modifiers mean selection: shift-click to add the shape, and so on.
		if (e.button !== 0 || e.shiftKey || e.altKey || isAccelKey(e)) return false
		const shape = editor.getShape(shapeId)
		if (!shape || editor.isShapeOrAncestorLocked(shape)) return false

		const root = e.currentTarget
		const index = getTaskItemIndexAtPoint(root, e.clientX, e.clientY)
		if (index === -1) return false

		editor.markEventAsHandled(e)
		const win = editor.getContainerWindow()
		const handlePointerUp = (up: PointerEvent) => {
			if (up.pointerId !== e.pointerId) return
			win.removeEventListener('pointerup', handlePointerUp)
			if (getTaskItemIndexAtPoint(root, up.clientX, up.clientY) !== index) return

			const current = editor.getShape(shapeId)
			const currentRichText = (current?.props as { richText?: TLRichText } | undefined)?.richText
			if (!currentRichText) return
			editor.markHistoryStoppingPoint('toggle task item')
			editor.updateShape({
				id: shapeId,
				type,
				props: { richText: toggleTaskItemInRichText(currentRichText, index) },
			})
		}
		win.addEventListener('pointerup', handlePointerUp)
		return true
	}

	// Should be guarded higher up so that this doesn't render... but repeated here. This should never be true.
	if (!isEditing && isEmpty) return null

	// TODO: probably combine tl-text and tl-arrow eventually
	const cssPrefix = classNamePrefix || 'tl-text'
	return (
		<div
			className={classNames(
				`${cssPrefix}-label tl-text-wrapper tl-rich-text-wrapper`,
				showTextOutline ? 'tl-text__outline' : 'tl-text__no-outline'
			)}
			aria-hidden={!isEditing}
			data-hastext={!isEmpty}
			data-isediting={isEditing}
			data-textwrap={!!wrap}
			data-isselected={isSelected}
			style={{
				fontFamily,
				textAlign,
				justifyContent:
					textAlign === 'center' || legacyAlign
						? 'center'
						: textAlign === 'end'
							? 'flex-end'
							: 'flex-start',
				alignItems:
					verticalAlign === 'middle'
						? 'center'
						: verticalAlign === 'end'
							? 'flex-end'
							: 'flex-start',
				padding,
				...style,
			}}
		>
			<div
				className={`${cssPrefix}-label__inner tl-text-content__wrapper`}
				style={
					{
						fontSize,
						lineHeight: `${resolveLineHeightPx(fontSize, lineHeight)}px`,
						minHeight: `${resolveLineHeightPx(fontSize, lineHeight)}px`,
						// Unitless multiplier consumed by the .tl-rich-text h1–h6 rule (see editor.css).
						'--tl-rich-text-heading-line-height': lineHeight,
						minWidth: Math.ceil(textWidth || 0),
						color: labelColor,
						width: textWidth ? Math.ceil(textWidth) : undefined,
						height: textHeight ? Math.ceil(textHeight) : undefined,
					} as React.CSSProperties
				}
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
	fontFamily: string
	lineHeight: number
	textAlign: 'start' | 'center' | 'end'
	verticalAlign: 'start' | 'middle' | 'end'
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
	fontFamily,
	lineHeight,
	textAlign,
	verticalAlign,
	wrap,
	labelColor,
	padding,
	showTextOutline = true,
}: RichTextSVGProps) {
	const editor = useEditor()
	const html = renderHtmlFromRichText(editor, richText)
	const legacyAlign = isLegacyAlign(textAlign)
	const justifyContent =
		textAlign === 'center' || legacyAlign
			? ('center' as const)
			: textAlign === 'start'
				? ('flex-start' as const)
				: ('flex-end' as const)
	const alignItems =
		verticalAlign === 'middle' ? 'center' : verticalAlign === 'start' ? 'flex-start' : 'flex-end'
	const wrapperStyle = {
		display: 'flex',
		fontFamily,
		height: `100%`,
		justifyContent,
		alignItems,
		padding: `${padding}px`,
	}
	const style = {
		fontSize: `${fontSize}px`,
		wrap: wrap ? 'wrap' : 'nowrap',
		color: labelColor,
		lineHeight: `${resolveLineHeightPx(fontSize, lineHeight)}px`,
		// Unitless multiplier consumed by the .tl-rich-text h1–h6 rule (see editor.css).
		'--tl-rich-text-heading-line-height': lineHeight,
		textAlign,
		width: '100%',
		wordWrap: 'break-word' as const,
		overflowWrap: 'break-word' as const,
		whiteSpace: 'pre-wrap',
		textShadow: showTextOutline ? 'var(--tl-text-outline)' : 'none',
		tabSize: 'var(--tl-tab-size, 2)',
	}

	return (
		<foreignObject
			x={bounds.minX}
			y={bounds.minY}
			width={bounds.w}
			height={bounds.h}
			className={classNames(
				'tl-export-embed-styles tl-rich-text tl-rich-text-svg',
				showTextOutline ? 'tl-text__outline' : 'tl-text__no-outline'
			)}
		>
			<div style={wrapperStyle}>
				<div dangerouslySetInnerHTML={{ __html: html }} style={style} />
			</div>
		</foreignObject>
	)
}

/** The document-order index of the task item whose checkbox is under the point, or -1. */
function getTaskItemIndexAtPoint(root: HTMLElement, clientX: number, clientY: number) {
	const labels = root.querySelectorAll('li[data-type="taskItem"] > label')
	for (let i = 0; i < labels.length; i++) {
		const rect = labels[i].getBoundingClientRect()
		if (
			clientX >= rect.left &&
			clientX <= rect.right &&
			clientY >= rect.top &&
			clientY <= rect.bottom
		) {
			return i
		}
	}
	return -1
}
