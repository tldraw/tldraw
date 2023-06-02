import { useEditor } from '@tldraw/editor'
import { useValue } from 'signia-react'

/** @public */
export function useReadonly() {
	const app = useEditor()
	return useValue('isReadOnlyMode', () => app.isReadOnly, [app])
}
