import { debugFlags, tlenv, useValue } from '@tldraw/editor'

export function useColorSpace(): 'srgb' | 'p3' {
	const forceSrgb = useValue(debugFlags.forceSrgb)
	return forceSrgb || !tlenv.supportsP3ColorSpace ? 'srgb' : 'p3'
}
