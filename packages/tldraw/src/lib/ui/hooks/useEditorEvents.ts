import { TLErrorEvent, useEditor } from '@tldraw/editor'
import { useEffect } from 'react'
import { useToasts } from '../context/toasts'

/** @internal */
export function useEditorEvents() {
	const editor = useEditor()
	const { addToast } = useToasts()

	useEffect(() => {
		function handleMaxShapes(error: TLErrorEvent) {
			if (error.type !== 'max-shapes-reached') return
			const [{ name, count }] = error.value
			addToast({
				title: 'Maximum Shapes Reached',
				description: `You've reached the maximum number of shapes allowed on ${name} (${count}). Please delete some shapes or move to a different page to continue.`,
				severity: 'warning',
			})
		}

		editor.addListener('error', handleMaxShapes)
		return () => {
			editor.removeListener('error', handleMaxShapes)
		}
	}, [editor, addToast])
}
