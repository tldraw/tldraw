import { useEditor } from '@tldraw/editor'
import { createElement, useEffect } from 'react'
import { ConfirmOpenLinkDialog } from '../components/ConfirmOpenLinkDialog'
import { useDialogs } from '../context/dialogs'
import { useToasts } from '../context/toasts'

/** @internal */
export function useEditorEvents() {
	const editor = useEditor()
	const { addToast } = useToasts()
	const { addDialog } = useDialogs()

	useEffect(() => {
		function handleMaxShapes({ name, count }: { name: string; pageId: string; count: number }) {
			addToast({
				title: 'Maximum shapes reached',
				description: `You've reached the maximum number of shapes allowed on ${name} (${count}). Please delete some shapes or move to a different page to continue.`,
				severity: 'warning',
			})
		}

		function handleConfirmOpenLink({ url }: { url: string }) {
			addDialog({
				id: 'confirm-open-link',
				component: ({ onClose }) => createElement(ConfirmOpenLinkDialog, { url, onClose }),
			})
		}

		editor.addListener('max-shapes', handleMaxShapes)
		editor.addListener('confirm-open-link', handleConfirmOpenLink)
		return () => {
			editor.removeListener('max-shapes', handleMaxShapes)
			editor.removeListener('confirm-open-link', handleConfirmOpenLink)
		}
	}, [editor, addToast, addDialog])
}
