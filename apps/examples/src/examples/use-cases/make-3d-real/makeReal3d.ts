import { Editor, TLAssetId, TLRichText, TLShape, createShapeId, renderPlaintextFromRichText } from 'tldraw'
import { IModel3dShape, MODEL_3D_SHAPE_TYPE } from './Model3dShapeUtil'

// The key stays on the server: we POST the collected notes + images to the dev
// server's /api/make-3d-real endpoint (see apps/examples/make-3d-real-server.ts),
// which calls the model with GOOGLE_API_KEY from .env.local and returns only the
// generated code. The API key is never present in the browser.

async function urlToInlineImage(url: string): Promise<{ mimeType: string; data: string } | null> {
	try {
		const res = await fetch(url)
		const blob = await res.blob()
		const dataUrl: string = await new Promise((resolve, reject) => {
			const reader = new FileReader()
			reader.onload = () => resolve(reader.result as string)
			reader.onerror = reject
			reader.readAsDataURL(blob)
		})
		const [head, data] = dataUrl.split(',')
		const mimeType = head.match(/data:(.*?);/)?.[1] ?? blob.type ?? 'image/png'
		return data ? { mimeType, data } : null
	} catch {
		return null
	}
}

async function collectContext(
	editor: Editor,
	shapes: TLShape[]
): Promise<{ notes: string[]; images: Array<{ mimeType: string; data: string }> }> {
	const notes: string[] = []
	const images: Array<{ mimeType: string; data: string }> = []

	for (const shape of shapes) {
		const props = shape.props as Record<string, unknown>

		// text lives either as plain `text` or as tldraw rich text
		if (props.richText) {
			const text = renderPlaintextFromRichText(editor, props.richText as TLRichText).trim()
			if (text) notes.push(`${shape.type}: ${text}`)
		} else if (typeof props.text === 'string' && props.text.trim()) {
			notes.push(`${shape.type}: ${props.text.trim()}`)
		}

		// images become vision input, converted to base64 for the proxy
		if (shape.type === 'image' && props.assetId) {
			const asset = editor.getAsset(props.assetId as TLAssetId)
			const src = asset?.props?.src
			if (typeof src === 'string') {
				const inline = await urlToInlineImage(src)
				if (inline) images.push(inline)
			}
		}
	}

	return { notes, images }
}

/**
 * Collect the selected notes and images, send them to the dev-server proxy, and
 * drop the generated React Three Fiber scene onto the canvas as a model-3d
 * shape. If a model-3d shape is part of the selection, we update it in place
 * instead — that's the iterate-on-your-asset loop.
 */
export async function makeReal3d(editor: Editor) {
	const selected = editor.getSelectedShapes()
	const existing = selected.find((s) => s.type === MODEL_3D_SHAPE_TYPE) as
		| IModel3dShape
		| undefined
	const contextShapes = selected.filter((s) => s.type !== MODEL_3D_SHAPE_TYPE)

	if (contextShapes.length === 0) {
		window.alert('Select some notes, stickies, or images (and optionally a 3D asset to iterate on).')
		return
	}

	const { notes, images } = await collectContext(editor, contextShapes)

	// create the target shape now, in a loading state, so there's instant feedback
	let targetId = existing?.id
	if (!targetId) {
		targetId = createShapeId()
		const bounds = editor.getSelectionPageBounds()!
		editor.createShape<IModel3dShape>({
			id: targetId,
			type: MODEL_3D_SHAPE_TYPE,
			x: bounds.maxX + 40,
			y: bounds.minY,
			props: { status: 'loading', code: existing?.props.code ?? '' },
		})
	} else {
		editor.updateShape<IModel3dShape>({ id: targetId, type: MODEL_3D_SHAPE_TYPE, props: { status: 'loading' } })
	}

	try {
		const userText = [
			existing?.props.code
				? 'Here is the current scene code. Revise it based on the notes below.\n\n' +
				  '```jsx\n' +
				  existing.props.code +
				  '\n```'
				: 'Create a 3D asset from these canvas notes.',
			'',
			'Notes:',
			...(notes.length ? notes.map((n) => `- ${n}`) : ['- (no text — infer from any images)']),
		].join('\n')

		const res = await fetch('/api/make-3d-real', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ userText, images }),
			signal: AbortSignal.timeout(150_000),
		})
		const json = (await res.json()) as { code?: string; error?: string }
		if (!res.ok || !json.code) throw new Error(json.error ?? 'No code returned')

		editor.updateShape<IModel3dShape>({
			id: targetId,
			type: MODEL_3D_SHAPE_TYPE,
			props: { code: json.code, status: 'ready' },
		})
		editor.select(targetId)
	} catch (e) {
		editor.updateShape<IModel3dShape>({
			id: targetId,
			type: MODEL_3D_SHAPE_TYPE,
			props: { status: 'error' },
		})
		window.alert(`Failed to generate: ${e instanceof Error ? e.message : String(e)}`)
	}
}
