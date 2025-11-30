import { unsafe__withoutCapture } from '@tldraw/state'
import { useReactor } from '@tldraw/state-react'
import { tlenvReactive } from '../globals/environment'
import { useEditor } from './useEditor'

/** @internal */
export function useCoarsePointer() {
	const editor = useEditor()

	// When the coarse pointer state changes, update the instance state
	useReactor(
		'coarse pointer change',
		() => {
			const isCoarsePointer = tlenvReactive.get().isCoarsePointer
			const isInstanceStateCoarsePointer = unsafe__withoutCapture(
				() => editor.getInstanceState().isCoarsePointer
			)
			if (isCoarsePointer === isInstanceStateCoarsePointer) return
			editor.updateInstanceState({ isCoarsePointer: isCoarsePointer })
		},
		[editor]
	)
}
