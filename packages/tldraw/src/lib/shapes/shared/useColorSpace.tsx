import { debugFlags, tlenvReactive, useValue } from '@tldraw/editor'

export function useColorSpace(): 'srgb' | 'p3' {
	const forceSrgb = useValue(debugFlags.forceSrgb)
	const supportsP3 = useValue(
		'supportsP3ColorSpace',
		() => tlenvReactive.get().supportsP3ColorSpace,
		[]
	)
	return forceSrgb || !supportsP3 ? 'srgb' : 'p3'
}
