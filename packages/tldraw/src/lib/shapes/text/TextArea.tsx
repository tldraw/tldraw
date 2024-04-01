import { stopEventPropagation } from '@tldraw/editor'
import { forwardRef } from 'react'

type TextAreaProps = {
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
			autoComplete="off"
			autoCapitalize="off"
			autoCorrect="off"
			autoSave="off"
			autoFocus
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
			onContextMenu={stopEventPropagation}
			onPointerDown={handleInputPointerDown}
			onDoubleClick={handleDoubleClick}
		/>
	)
})
