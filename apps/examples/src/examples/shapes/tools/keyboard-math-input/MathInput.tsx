import { useEffect, useRef } from 'react'
import { useEditor } from 'tldraw'

// A plain text input for math shorthand, shown in place of the rendered
// equation while the shape is being edited. A floating bubble above the shape
// previews the rendered equation live as you type (see MathShapeUtil.tsx).
export function MathInput({
	text,
	onChange,
	onDone,
}: {
	text: string
	onChange(text: string): void
	onDone(): void
}) {
	const editor = useEditor()
	const ref = useRef<HTMLInputElement>(null)

	useEffect(() => {
		ref.current?.focus()
		ref.current?.select()
	}, [])

	return (
		<input
			ref={ref}
			className="math-input"
			value={text}
			spellCheck={false}
			placeholder="1/2 + sqrt(2) or x^2"
			onChange={(e) => onChange(e.currentTarget.value)}
			onKeyDown={(e) => {
				if (e.key === 'Enter' || e.key === 'Escape') {
					e.preventDefault()
					onDone()
				}
			}}
			// Pointer events on the input must not reach the canvas, or tldraw
			// would select and drag the shape instead of placing the caret
			onPointerDown={editor.markEventAsHandled}
			onTouchStart={editor.markEventAsHandled}
		/>
	)
}
