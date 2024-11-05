'use client'
import { cn } from '@/utils/cn'
import { getAssetUrlsByMetaUrl } from '@tldraw/assets/urls'
import { useTheme } from 'next-themes'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Editor, Tldraw, TldrawOptions } from 'tldraw'

const options: Partial<TldrawOptions> = {
	maxPages: 1,
}

const assetUrls = getAssetUrlsByMetaUrl()

export default function DemoTldraw({ hidden }: { hidden: boolean }) {
	const [editor, setEditor] = useState<Editor | null>(null)
	const wrapper = useRef<HTMLDivElement | null>(null)
	const { theme } = useTheme()

	const handleEditorMount = useCallback((editor: Editor) => {
		setEditor(editor)
	}, [])

	useEffect(() => {
		if (!editor) return
		editor.user.updateUserPreferences({
			colorScheme: theme === 'dark' ? 'dark' : 'light',
		})
	}, [theme, editor])

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

	const handleEditorFocus = useCallback(() => {
		if (!editor) return
		editor.focus({ focusContainer: false })
	}, [editor])

	return (
		<>
			<div
				ref={wrapper}
				className={cn('z-10 h-full w-full', hidden ? 'hidden' : '')}
				onFocus={handleEditorFocus}
			>
				<Tldraw
					initialState="draw"
					assetUrls={assetUrls}
					onMount={handleEditorMount}
					autoFocus
					options={options}
				/>
			</div>
		</>
	)
}
