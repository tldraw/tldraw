import type { Editor } from '@tldraw/editor'
import { useCallback } from 'react'
import { Tldraw as TldrawBase, type TldrawProps } from '../../../packages/tldraw/src/lib/Tldraw'
import { isExampleSiteSidebarRoute, wireExampleSiteFocus } from './wireExampleSiteFocus'

export function Tldraw(props: TldrawProps) {
	const { onMount, autoFocus, ...rest } = props
	const manageFocus = isExampleSiteSidebarRoute()

	const handleMount = useCallback(
		(editor: Editor) => {
			const teardownFocus = manageFocus ? wireExampleSiteFocus(editor) : undefined
			const teardownOnMount = onMount?.(editor)

			return () => {
				teardownFocus?.()
				teardownOnMount?.()
			}
		},
		[onMount, manageFocus]
	)

	return <TldrawBase {...rest} autoFocus={manageFocus ? false : autoFocus} onMount={handleMount} />
}
