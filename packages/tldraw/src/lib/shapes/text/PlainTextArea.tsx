import { preventDefault, stopEventPropagation } from '@tldraw/editor'
import { forwardRef } from 'react'
import { TextAreaProps } from './RichTextArea'

export const PlainTextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(function TextArea(
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
	const onChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
		handleChange({ plaintext: e.target.value })
	}

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
			onChange={onChange}
			onKeyDown={(e) => handleKeyDown(e.nativeEvent)}
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
