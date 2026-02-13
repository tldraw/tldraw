import { react } from '@tldraw/state'
import { useLayoutEffect } from 'react'
import { useEditor } from './useEditor'

export function useStateAttribute() {
	const editor = useEditor()

	// we use a layout effect because we don't want there to be any perceptible delay between the
	// editor mounting and this attribute being applied, because styles may depend on it:
	useLayoutEffect(() => {
		return react('stateAttribute', () => {
			const container = editor.getContainer()
			const instanceState = editor.getInstanceState()
			container.setAttribute('data-state', editor.getPath())
			container.setAttribute('data-coarse', String(instanceState.isCoarsePointer))
		})
	}, [editor])
}
