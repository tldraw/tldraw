import { preventDefault, stopEventPropagation } from '@tldraw/editor'
import { forwardRef } from 'react'

interface TextAreaProps {
	isEditing: boolean
	text: string
	handleFocus: () => void
	handleBlur: () => void
	handleKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void
	handleChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void
	handleInputPointerDown: (e: React.PointerEvent<HTMLTextAreaElement>) => void
	handleDoubleClick: (e: any) => any
}

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
			datatype="wysiwyg"
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
