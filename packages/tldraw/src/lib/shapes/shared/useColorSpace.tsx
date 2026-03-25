import { debugFlags, useMaybeEditor, useValue } from '@tldraw/editor'
import { useEffect, useState } from 'react'

export function useColorSpace(): 'srgb' | 'p3' {
	const editor = useMaybeEditor()
	const [supportsP3, setSupportsP3] = useState(false)

	useEffect(() => {
		const win = editor?.getContainerWindow() ?? window
		const supportsSyntax = CSS.supports('color', 'color(display-p3 1 1 1)')
		const query = win.matchMedia('(color-gamut: p3)')
		setSupportsP3(supportsSyntax && query.matches)

		const onChange = () => setSupportsP3(supportsSyntax && query.matches)

		query.addEventListener('change', onChange)
		return () => query.removeEventListener('change', onChange)
	}, [editor])

	const forceSrgb = useValue(debugFlags.forceSrgb)

	return forceSrgb || !supportsP3 ? 'srgb' : 'p3'
}
