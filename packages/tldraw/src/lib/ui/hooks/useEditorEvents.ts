import { TLPermissionDenial, useEditor } from '@tldraw/editor'
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

		// A denied change repeats on every pointer move of a drag, so show one toast per reason
		// until it has been quiet for a moment.
		let lastReason: string | null = null
		let quietTimeout = -1
		function handlePermissionDenied({ reason }: TLPermissionDenial) {
			editor.timers.clearTimeout(quietTimeout)
			quietTimeout = editor.timers.setTimeout(() => (lastReason = null), 1500)
			if (reason === lastReason) return
			lastReason = reason
			addToast({ title: "You can't do that", description: reason, severity: 'warning' })
		}

		editor.addListener('max-shapes', handleMaxShapes)
		editor.addListener('permission-denied', handlePermissionDenied)
		return () => {
			editor.timers.clearTimeout(quietTimeout)
			editor.removeListener('max-shapes', handleMaxShapes)
			editor.removeListener('permission-denied', handlePermissionDenied)
		}
	}, [editor, addToast])
}
