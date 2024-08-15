import { useEffect, useRef } from 'react'
import { Editor, Tldraw } from 'tldraw'
import 'tldraw/tldraw.css'

export default function Embedded() {
	const rEditor = useRef<Editor | null>(null)

	useEffect(() => {
		function blurEditor() {
			const editor = rEditor.current
			if (!editor) return
			editor.blur()
		}

		document.body.addEventListener('pointerdown', blurEditor)
		return () => {
			document.body.removeEventListener('pointerdown', blurEditor)
		}
	}, [])

	return (
		<div
			className="tldraw__editor"
			onPointerDown={(e) => {
				const editor = rEditor.current
				if (!editor) return
				editor.focus()
				e.stopPropagation()
			}}
		>
			<Tldraw
				persistenceKey="example"
				autoFocus={false}
				onMount={(editor) => {
					rEditor.current = editor
				}}
			/>
		</div>
	)
}
