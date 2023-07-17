import { debugFlags, useValue } from '@tldraw/editor'
import { useEffect, useState } from 'react'

export function useColorSpace(): 'srgb' | 'p3' {
	const [supportsP3, setSupportsP3] = useState(false)

	useEffect(() => {
		const supportsSyntax = CSS.supports('color', 'color(display-p3 1 1 1)')
		const query = matchMedia('(color-gamut: p3)')
		setSupportsP3(supportsSyntax && query.matches)

		const onChange = () => setSupportsP3(supportsSyntax && query.matches)

		query.addEventListener('change', onChange)
		return () => query.removeEventListener('change', onChange)
	}, [])

	const forceSrgb = useValue(debugFlags.forceSrgb)

	return forceSrgb || !supportsP3 ? 'srgb' : 'p3'
}
