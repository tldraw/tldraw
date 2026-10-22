import {
	AssetRecordType,
	createShapeId,
	Editor,
	FileHelpers,
	getIndicesBetween,
	isEqual,
	TLImageShape,
} from 'tldraw'
import { layerizeResultSchema } from './layerizeSchema'

export async function layerizeImage(editor: Editor, original: TLImageShape, signal: AbortSignal) {
	if (original.props.crop?.isCircle)
		throw new Error('Remove the circular crop before layerizing this image.')
	const source = original.props.assetId && editor.getAsset(original.props.assetId)
	if (!source || source.type !== 'image' || !source.props.src)
		throw new Error('This image has no source file.')
	const blob = await FileHelpers.urlToBlob(source.props.src)
	signal.throwIfAborted()
	const image_url = await FileHelpers.blobToDataUrl(blob)
	const submitted = await request('/api/layerize', signal, {
		method: 'POST',
		body: JSON.stringify({ image_url }),
		headers: { 'Content-Type': 'application/json' },
	})
	if (typeof submitted.requestId !== 'string') throw new Error('FAL did not return a request ID.')
	const deadline = Date.now() + 10 * 60_000
	let result
	while (!result) {
		if (Date.now() > deadline) throw new Error('Layerize timed out. Please try again.')
		const status = await request(
			`/api/layerize?requestId=${encodeURIComponent(submitted.requestId)}`,
			signal
		)
		if (status.status === 'COMPLETED') result = layerizeResultSchema.parse(status)
		else
			await new Promise<void>((resolve, reject) => {
				const abort = () => {
					clearTimeout(timer)
					reject(signal.reason)
				}
				const timer = setTimeout(() => {
					signal.removeEventListener('abort', abort)
					resolve()
				}, 1500)
				signal.addEventListener('abort', abort, { once: true })
			})
	}
	const prepared = await Promise.all(
		result.layers
			.sort((a, b) => a.z_index - b.z_index)
			.map(async (layer) => {
				const response = await fetch(layer.image.url, { signal })
				if (!response.ok) throw new Error('Could not download every layer. Please try again.')
				const file = new File([await response.blob()], `${layer.name || 'Layer'}.png`, {
					type: 'image/png',
				})
				const asset = await editor.getAssetForExternalContent({
					type: 'file',
					file,
					assetId: AssetRecordType.createId(),
				})
				if (!asset || asset.type !== 'image')
					throw new Error('Could not load every layer. Please try again.')
				const [left, top, right, bottom] = layer.bounding_box?.normalized ?? [0, 0, 1000, 1000]
				if (left < 0 || top < 0 || right > 1000 || bottom > 1000 || right <= left || bottom <= top)
					throw new Error('FAL returned invalid layer bounds.')
				return {
					asset,
					name: layer.name,
					left: original.props.flipX ? 1 - right / 1000 : left / 1000,
					top: original.props.flipY ? 1 - bottom / 1000 : top / 1000,
					right: original.props.flipX ? 1 - left / 1000 : right / 1000,
					bottom: original.props.flipY ? 1 - top / 1000 : bottom / 1000,
				}
			})
	)
	signal.throwIfAborted()
	if (editor.isDisposed) return
	// Edits made during the request must not be silently replaced by an older image.
	if (
		!isEqual(editor.getShape(original.id), original) ||
		!isEqual(editor.getAsset(source.id), source)
	)
		throw new Error('The image changed while layerizing. Please try again.')
	const crop = original.props.crop ?? { topLeft: { x: 0, y: 0 }, bottomRight: { x: 1, y: 1 } }
	const cw = crop.bottomRight.x - crop.topLeft.x
	const ch = crop.bottomRight.y - crop.topLeft.y
	const visible = prepared.flatMap((layer) => {
		const left = Math.max(layer.left, crop.topLeft.x),
			top = Math.max(layer.top, crop.topLeft.y)
		const right = Math.min(layer.right, crop.bottomRight.x),
			bottom = Math.min(layer.bottom, crop.bottomRight.y)
		if (right <= left || bottom <= top) return []
		const w = ((right - left) / cw) * original.props.w,
			h = ((bottom - top) / ch) * original.props.h
		const x = ((left - crop.topLeft.x) / cw) * original.props.w,
			y = ((top - crop.topLeft.y) / ch) * original.props.h
		return [
			{
				layer,
				shape: {
					id: createShapeId(),
					type: 'image' as const,
					parentId: original.parentId,
					x: original.x + x * Math.cos(original.rotation) - y * Math.sin(original.rotation),
					y: original.y + x * Math.sin(original.rotation) + y * Math.cos(original.rotation),
					rotation: original.rotation,
					opacity: original.opacity,
					props: {
						assetId: layer.asset.id,
						w,
						h,
						flipX: original.props.flipX,
						flipY: original.props.flipY,
						altText: layer.name || '',
						crop: {
							topLeft: {
								x: (left - layer.left) / (layer.right - layer.left),
								y: (top - layer.top) / (layer.bottom - layer.top),
							},
							bottomRight: {
								x: (right - layer.left) / (layer.right - layer.left),
								y: (bottom - layer.top) / (layer.bottom - layer.top),
							},
						},
					},
				},
			},
		]
	})
	if (!visible.length) throw new Error('No layers overlap the image crop.')
	const siblings = editor.getSortedChildIdsForParent(original.parentId)
	const nextId = siblings[siblings.indexOf(original.id) + 1]
	const next = nextId ? editor.getShape(nextId) : undefined
	const indices = getIndicesBetween(original.index, next?.index, visible.length)
	const wasReadonly = editor.getIsReadonly()
	editor.updateInstanceState({ isReadonly: false })
	try {
		editor.complete()
		editor.markHistoryStoppingPoint('layerize image')
		editor.run(
			() => {
				// createAssets ignores history; these assets must undo with their new shapes.
				editor.store.put(visible.map(({ layer }) => layer.asset))
				editor.createShapes(visible.map(({ shape }, i) => ({ ...shape, index: indices[i] })))
				editor.deleteShapes([original.id])
				editor.setSelectedShapes(visible.map(({ shape }) => shape.id))
			},
			{ ignoreShapeLock: true }
		)
		editor.markHistoryStoppingPoint('after layerize image')
	} finally {
		editor.updateInstanceState({ isReadonly: wasReadonly })
	}
}

async function request(url: string, signal: AbortSignal, init?: RequestInit) {
	const response = await fetch(url, { ...init, signal })
	const body = await response.json()
	if (!response.ok) throw new Error(body.error || 'Layerize failed. Please try again.')
	return body
}
