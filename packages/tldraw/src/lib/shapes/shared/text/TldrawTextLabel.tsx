import {
	TLDefaultHorizontalAlignStyle,
	TLTextLabel,
	preventDefault,
	stopEventPropagation,
} from '@tldraw/editor'
import React, { forwardRef, useEffect, useState } from 'react'
import { TextHelpers } from '../TextHelpers'
import { useEditableText } from '../useEditableText'

/**
 * @public @react
 * This is an _experimental_ component that we are still exploring.
 */
export const TldrawTextLabel: TLTextLabel = React.memo(function TextLabel({
	shapeId,
	type,
	text,
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
}) {
	const { rInput, isEmpty, isEditing, isEditingAnything, ...editableTextRest } = useEditableText(
		shapeId,
		type,
		text
	)

	const [initialText, setInitialText] = useState(text)

	useEffect(() => {
		if (!isEditing) setInitialText(text)
	}, [isEditing, text])

	const finalText = TextHelpers.normalizeTextForDom(text)
	const hasText = finalText.length > 0

	const legacyAlign = isLegacyAlign(align)

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
					{finalText.split('\n').map((lineOfText, index) => (
						<div key={index} dir="auto">
							{lineOfText}
						</div>
					))}
				</div>
				{(isEditingAnything || isSelected) && (
					<TextArea
						ref={rInput}
						// We need to add the initial value as the key here because we need this component to
						// 'reset' when this state changes and grab the latest defaultValue.
						key={initialText}
						text={text}
						isEditing={isEditing}
						{...editableTextRest}
						handleKeyDown={handleKeyDownCustom ?? editableTextRest.handleKeyDown}
					/>
				)}
			</div>
		</div>
	)
})
TldrawTextLabel.measureMethod = 'text'

/** @public */
export interface TextAreaProps {
	isEditing: boolean
	text: string
	handleFocus(): void
	handleBlur(): void
	handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>): void
	handleChange(e: React.ChangeEvent<HTMLTextAreaElement>): void
	handleInputPointerDown(e: React.PointerEvent<HTMLTextAreaElement>): void
	handleDoubleClick(e: any): any
}

/**
 * @public @react
 * This is an _experimental_ component that we are still exploring.
 */
export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(function TextArea(
	{
		isEditing,
		text,
		handleFocus,
		handleChange,
		handleKeyDown,
		handleBlur,
		handleInputPointerDown,
		handleDoubleClick,
	},
	ref
) {
	return (
		<textarea
			ref={ref}
			className="tl-text tl-text-input"
			name="text"
			tabIndex={-1}
			readOnly={!isEditing}
			autoComplete="off"
			autoCapitalize="off"
			autoCorrect="off"
			autoSave="off"
			placeholder=""
			spellCheck="true"
			wrap="off"
			dir="auto"
			defaultValue={text}
			onFocus={handleFocus}
			onChange={handleChange}
			onKeyDown={handleKeyDown}
			onBlur={handleBlur}
			onTouchEnd={stopEventPropagation}
			onContextMenu={isEditing ? stopEventPropagation : undefined}
			onPointerDown={handleInputPointerDown}
			onDoubleClick={handleDoubleClick}
			// On FF, there's a behavior where dragging a selection will grab that selection into
			// the drag event. However, once the drag is over, and you select away from the textarea,
			// starting a drag over the textarea will restart a selection drag instead of a shape drag.
			// This prevents that default behavior in FF.
			onDragStart={preventDefault}
		/>
	)
})

// sneaky TLDefaultHorizontalAlignStyle for legacies
function isLegacyAlign(align: TLDefaultHorizontalAlignStyle | string): boolean {
	return align === 'start-legacy' || align === 'middle-legacy' || align === 'end-legacy'
}
