import { useEffect } from 'react'
import { type TLUiOverrides, useEditor, useToasts } from 'tldraw'

function extractImageFiles(data: DataTransfer | null): File[] {
	if (!data) return []
	const result: File[] = []
	for (const item of data.items) {
		if (item.kind === 'file' && item.type.startsWith('image/')) {
			const file = item.getAsFile()
			if (file) result.push(file)
		}
	}
	if (result.length > 0) return result
	return [...data.files].filter((f) => f.type.startsWith('image/'))
}

const COMING_SOON_TOAST = {
	id: 'feature-coming-soon',
	title: 'Coming soon',
	description: 'This feature is coming soon!',
	severity: 'info' as const,
}

/** Intercepts image drop/paste and shows a "coming soon" toast. */
export function ImageDropGuard() {
	const editor = useEditor()
	const { addToast } = useToasts()

	useEffect(() => {
		const container = editor.getContainer()

		const showBlockedToast = (type: string) => {
			addToast({
				id: `blocked-${type}`,
				title: 'Coming soon!',
				description: `${type} are not yet supported in the tldraw MCP app.`,
				severity: 'info',
			})
		}

		const onDrop = (e: DragEvent) => {
			const imageFiles = extractImageFiles(e.dataTransfer)
			if (imageFiles.length > 0) {
				e.preventDefault()
				e.stopPropagation()
				showBlockedToast('Images')
			}
		}

		const onPaste = (e: ClipboardEvent) => {
			const imageFiles = extractImageFiles(e.clipboardData)
			if (imageFiles.length > 0) {
				e.preventDefault()
				e.stopPropagation()
				showBlockedToast('Images')
			}
		}

		container.addEventListener('drop', onDrop, { capture: true })
		document.addEventListener('paste', onPaste, { capture: true })

		// Override external content handlers to block images, embeds, and URLs.
		// The context menu paste uses navigator.clipboard.read() directly,
		// bypassing DOM paste events, so we need to intercept at this level too.
		editor.registerExternalContentHandler('files', async ({ files }) => {
			const hasImages = files.some((f) => f.type.startsWith('image/'))
			if (hasImages) {
				showBlockedToast('Images')
			}
		})
		editor.registerExternalContentHandler('embed', async () => {
			showBlockedToast('Embeds')
		})
		editor.registerExternalContentHandler('url', async () => {
			showBlockedToast('Links')
		})

		return () => {
			container.removeEventListener('drop', onDrop, { capture: true })
			document.removeEventListener('paste', onPaste, { capture: true })
		}
	}, [editor, addToast])

	return null
}

/** Override actions/tools to block media, embeds, and flatten. */
export const uiOverrides: TLUiOverrides = {
	actions(_editor, actions, helpers) {
		const { 'insert-media': _media, 'insert-embed': _embed, ...rest } = actions
		return {
			...rest,
			'flatten-to-image': {
				...actions['flatten-to-image'],
				onSelect() {
					helpers.addToast(COMING_SOON_TOAST)
				},
			},
		}
	},
	tools(_editor, tools) {
		// Remove the asset tool (image/media picker from toolbar)
		const { asset: _asset, ...rest } = tools
		return rest
	},
}
