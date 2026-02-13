import { preventDefault, useEditor } from '@tldraw/editor'
import React from 'react'
import { TextAreaProps } from './RichTextArea'

/**
 * A plain text area that can be used for basic editing text.
 *
 * @public @react
 */
export const PlainTextArea = React.forwardRef<HTMLTextAreaElement, TextAreaProps>(function TextArea(
	{
		isEditing,
		text,
		handleFocus,
		handleChange,
		handleKeyDown,
		handlePaste,
		handleBlur,
		handleInputPointerDown,
		handleDoubleClick,
	},
	ref
) {
	const editor = useEditor()
	const onChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
		handleChange({ plaintext: e.target.value })
	}

	return (
		<textarea
			ref={ref}
			className="tl-text tl-text-input"
			name="text"
			tabIndex={-1}
			disabled={!isEditing}
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
			onChange={onChange}
			onKeyDown={(e) => handleKeyDown(e.nativeEvent)}
			onBlur={handleBlur}
			onTouchEnd={editor.markEventAsHandled}
			onContextMenu={isEditing ? (e) => e.stopPropagation() : undefined}
			onPointerDown={handleInputPointerDown}
			onPaste={handlePaste}
			onDoubleClick={handleDoubleClick}
			// On FF, there's a behavior where dragging a selection will grab that selection into
			// the drag event. However, once the drag is over, and you select away from the textarea,
			// starting a drag over the textarea will restart a selection drag instead of a shape drag.
			// This prevents that default behavior in FF.
			onDragStart={preventDefault}
		/>
	)
})
