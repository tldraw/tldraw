import { useEffect, useState } from 'react'
import { react, throttle } from 'tldraw'
import { globalEditor } from '../../utils/globalEditor'

function getDeepLink() {
	const editor = globalEditor.get()
	if (!editor) return null
	return editor.createDeepLink().toString()
}

export function useEditorDeepLink() {
	const [deepLink, setDeepLink] = useState(getDeepLink())
	useEffect(() => {
		const throttledSetDeepLink = throttle(setDeepLink, 300)
		const unsub = react('setDeepLink', () => {
			throttledSetDeepLink(getDeepLink())
		})
		return () => {
			unsub()
			throttledSetDeepLink.cancel()
		}
	}, [])
	return deepLink
}
