import { useMaybeEditor, useValue } from '@tldraw/editor'

/** @public */
export function useReadonly() {
	const editor = useMaybeEditor()
	return useValue('isReadonlyMode', () => !!editor?.getIsReadonly(), [editor])
}
