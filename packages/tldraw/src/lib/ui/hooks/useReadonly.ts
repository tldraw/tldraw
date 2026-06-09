import { useMaybeEditor, useValue } from '@tldraw/editor'

/**
 * Whether the editor is effectively readonly: true when the editor's
 * `changeDocument` allowable denies, which includes the readonly instance flag
 * and any custom rules added to `editor.allow.changeDocument`.
 *
 * @public
 */
export function useReadonly() {
	const editor = useMaybeEditor()
	return useValue('isReadonlyMode', () => (editor ? !editor.allow.changeDocument.can() : false), [
		editor,
	])
}
