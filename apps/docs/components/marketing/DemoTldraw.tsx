'use client'
import { getAssetUrlsByMetaUrl } from '@tldraw/assets/urls'
import { useEffect, useRef, useState } from 'react'
import { Editor, Tldraw } from 'tldraw'
import './demo.css'

const assetUrls = getAssetUrlsByMetaUrl()
export default function DemoTldraw() {
	const [editor, setEditor] = useState<Editor | null>(null)
	const wrapper = useRef<HTMLDivElement | null>(null)
	useEffect(() => {
		if (!editor) return
		editor.focus({ focusContainer: false })
		// don't want this at dev time
		editor.updateInstanceState({ isDebugMode: false })
		const handleClickOutside = (e: MouseEvent) => {
			if (!wrapper.current?.contains(e.target as Node)) {
				// prevent capturing scroll events on the landing page after clicking outside
				editor.blur({ blurContainer: false })
			}
		}

		document.addEventListener('mousedown', handleClickOutside)
		return () => {
			document.removeEventListener('mousedown', handleClickOutside)
		}
	}, [editor])

	return (
		<>
			<div
				ref={wrapper}
				className="z-10 h-full"
				onFocus={() => {
					editor?.focus({ focusContainer: false })
				}}
			>
				<Tldraw initialState="draw" assetUrls={assetUrls} onMount={setEditor} autoFocus />
			</div>
		</>
	)
}
