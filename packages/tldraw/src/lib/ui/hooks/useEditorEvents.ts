import { useEditor } from '@tldraw/editor'
import { useEffect } from 'react'
import { useToasts } from '../context/toasts'

/** @internal */
export function useEditorEvents() {
	const editor = useEditor()
	const { addToast } = useToasts()

	useEffect(() => {
		function handleMaxShapes({ name, count }: { name: string; pageId: string; count: number }) {
			addToast({
				title: 'Maximum shapes reached',
				description: `You've reached the maximum number of shapes allowed on ${name} (${count}). Please delete some shapes or move to a different page to continue.`,
				severity: 'warning',
			})
		}

		function handleUnsupportedShapes({ count }: { types: string[]; count: number }) {
			const shapes = count === 1 ? '1 shape' : `${count} shapes`
			addToast({
				title: 'Some content could not be pasted',
				description: `${shapes} used a type that this editor doesn't support, so the rest was pasted without ${count === 1 ? 'it' : 'them'}.`,
				severity: 'warning',
			})
		}

		editor.addListener('max-shapes', handleMaxShapes)
		editor.addListener('unsupported-shapes', handleUnsupportedShapes)
		return () => {
			editor.removeListener('max-shapes', handleMaxShapes)
			editor.removeListener('unsupported-shapes', handleUnsupportedShapes)
		}
	}, [editor, addToast])
}
