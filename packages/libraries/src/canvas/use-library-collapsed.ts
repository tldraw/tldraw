import { useCallback } from 'react'
import { useEditor, useValue, type TLLibraryId } from 'tldraw'
import { collapsedLibraryIds } from './state'

/**
 * Whether a library is folded shut, and a setter for it, kept in {@link collapsedLibraryIds} so
 * the panel and any other layout of the same editor agree.
 * @public
 */
export function useLibraryCollapsed(
	libraryId: TLLibraryId
): [collapsed: boolean, setCollapsed: (collapsed: boolean) => void] {
	const editor = useEditor()
	const collapsed = useValue(
		'library collapsed',
		() => collapsedLibraryIds.get(editor).includes(libraryId),
		[editor, libraryId]
	)
	const setCollapsed = useCallback(
		(shut: boolean) =>
			collapsedLibraryIds.update(editor, (ids) => {
				const rest = ids.filter((id) => id !== libraryId)
				return shut ? [...rest, libraryId] : rest
			}),
		[editor, libraryId]
	)
	return [collapsed, setCollapsed]
}
