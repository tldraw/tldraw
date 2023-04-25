import { useApp } from '@tldraw/editor'
import { useValue } from 'signia-react'

/** @public */
export function useReadonly() {
	const app = useApp()
	return useValue('isReadOnlyMode', () => app.isReadOnly, [app])
}
