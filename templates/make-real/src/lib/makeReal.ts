import { createShapeId, Editor } from 'tldraw'
import { PreviewShape } from '@/components/PreviewShape'
import { getTextFromSelectedShapes } from './getSelectionAsText'

const PROVIDER = (process.env.NEXT_PUBLIC_MAKE_REAL_PROVIDER ?? 'openai') as
	| 'openai'
	| 'anthropic'
	| 'google'

export async function makeReal(editor: Editor) {
	// Get the selected shapes (we need at least one)
	const selectedShapes = editor.getSelectedShapes()
	if (selectedShapes.length === 0) throw new Error('First select something to make real.')

	// Create the preview shape next to the selection so the user gets immediate feedback
	const bounds = editor.getSelectionPageBounds()
	if (!bounds) throw new Error('Could not get bounds of selection.')

	const newShapeId = createShapeId()
	editor.createShape<PreviewShape>({
		id: newShapeId,
		type: 'response',
		x: bounds.maxX + 60,
		y: bounds.midY - (540 * 2) / 3 / 2,
		props: { html: '' },
	})

	try {
		// Get a screenshot of the selected shapes, scaled down to a reasonable size
		const maxSize = 1000
		const scale = Math.min(1, maxSize / bounds.width, maxSize / bounds.height)
		const { blob } = await editor.toImage(selectedShapes, {
			scale,
			background: true,
			format: 'jpeg',
		})
		if (!blob) throw new Error('Could not create an image of the selection.')

		const dataUrl = await blobToBase64(blob)

		// Get any existing previews from the selection so the model can iterate on them
		const previousPreviews = selectedShapes
			.filter((shape): shape is PreviewShape => shape.type === 'response')
			.map((shape) => ({ html: shape.props.html }))

		// Send everything to the server-side API route, which proxies to the AI provider
		const response = await fetch('/api/make-real', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				image: dataUrl,
				text: getTextFromSelectedShapes(editor),
				theme: editor.user.getUserPreferences().colorScheme === 'dark' ? 'dark' : 'light',
				previousPreviews,
				provider: PROVIDER,
			}),
		})

		const json = (await response.json()) as { html?: string; error?: string }

		if (!response.ok || !json.html) {
			throw new Error(json.error ?? 'The make-real request failed.')
		}

		editor.updateShape<PreviewShape>({
			id: newShapeId,
			type: 'response',
			props: { html: json.html },
		})
	} catch (e) {
		// If anything went wrong, delete the placeholder shape so the canvas is back to a clean state
		editor.deleteShape(newShapeId)
		throw e
	}
}

function blobToBase64(blob: Blob): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader()
		reader.onloadend = () => resolve(reader.result as string)
		reader.onerror = () => reject(new Error('Could not read image blob.'))
		reader.readAsDataURL(blob)
	})
}
