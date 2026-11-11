import { useMaybeEditor, useValue } from '@tldraw/editor'

/** @public */
export function useReadonly() {
	const editor = useMaybeEditor()
	return useValue('isReadonlyMode', () => !!editor?.getIsReadonly(), [editor])
}

/**
 * Whether the style panel has anything to style: shapes that can be changed, or shapes still to be
 * created.
 *
 * @internal
 */
export function useCanStyleShapes() {
	const editor = useMaybeEditor()
	return useValue(
		'canStyleShapes',
		() => !editor || editor.isPermitted('tl:shape:create') || editor.isPermitted('tl:shape:update'),
		[editor]
	)
}
