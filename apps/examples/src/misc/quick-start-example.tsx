'use-client'

import { Editor, Tldraw } from '@tldraw/tldraw'
import '@tldraw/tldraw/tldraw.css'
import { useEffect, useRef } from 'react'

export default function Develop() {
	const editorRef = useRef<Editor | null>(null)

	useEffect(() => {
		const fn = () => {
			editorRef.current?.updateInstanceState({ isFocused: false })
		}

		document.body.addEventListener('pointerdown', fn)

		return () => {
			document.body.removeEventListener('pointerdown', fn)
		}
	})

	return (
		<div
			className="tldraw__editor"
			onPointerDown={(e) => {
				editorRef.current?.updateInstanceState({ isFocused: true })
				e.stopPropagation()
			}}
		>
			<Tldraw
				persistenceKey="tldraw_example"
				autoFocus={false}
				onMount={(editor) => {
					editorRef.current = editor
				}}
			/>
		</div>
	)
}
