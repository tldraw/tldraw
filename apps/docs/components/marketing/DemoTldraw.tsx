'use client'
import { cn } from '@/utils/cn'
import { getAssetUrlsByMetaUrl } from '@tldraw/assets/urls'
import { useEffect, useRef, useState } from 'react'
import { Editor, Tldraw, TldrawOptions } from 'tldraw'
import './demo.css'

const options: Partial<TldrawOptions> = {
	maxPages: 1,
}

const assetUrls = getAssetUrlsByMetaUrl()
export default function DemoTldraw({ hidden }: { hidden?: boolean }) {
	const [editor, setEditor] = useState<Editor | null>(null)
	const wrapper = useRef<HTMLDivElement | null>(null)

	useEffect(() => {
		if (!editor) return
		editor.focus({ focusContainer: false })
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
				className={cn('z-10 h-full', hidden ? 'hidden' : '')}
				onFocus={() => {
					editor?.focus({ focusContainer: false })
				}}
			>
				<Tldraw
					initialState="draw"
					assetUrls={assetUrls}
					onMount={setEditor}
					autoFocus
					options={options}
				/>
			</div>
		</>
	)
}
