import { useEffect, useState } from 'react'
import {
	Editor,
	SerializedSchemaV2,
	TLRecord,
	TLStoreSnapshot,
	createTLStore,
	defaultBindingUtils,
	defaultShapeTools,
	defaultShapeUtils,
	getHashForObject,
	getSvgAsImage,
	loadSnapshot,
	useValue,
} from 'tldraw'
import {
	loadDataFromStore,
	loadThumbnailFromStore,
	storeThumbnailInIndexedDb,
} from '../utils/local-sync'
import { useApp } from './useAppState'

export function useLocalThumbnail(id: string) {
	const app = useApp()
	const theme = useValue('theme', () => app.getSessionState().theme, [app])
	const [state, setState] = useState<'loading' | 'error' | 'loaded'>('loading')

	const [imageUrl, setImageUrl] = useState<string | null>(null)

	useEffect(() => {
		let didDispose = false

		// Start loading the local thumbnail for this file
		loadThumbnailFromStore({
			fileId: id,
			didCancel: () => didDispose,
		}).then(async (localData) => {
			// If we have a local thumbnail, set it but don't set the state as loaded
			if (localData && localData.thumbnail) {
				setImageUrl(localData.thumbnail)
			}

			loadDataFromStore({
				storePrefix: 'TLDRAW_DOCUMENT_v2',
				indexKey: 'TLDRAW_DB_NAME_INDEX_v2',
				persistenceKey: `tla-2_${id}`,
				didCancel: () => didDispose,
			}).then(async (data) => {
				if (!data) return

				const snapshot = {
					store: Object.fromEntries((data.records as TLRecord[]).map((r) => [r.id, r])),
					schema: data.schema as SerializedSchemaV2,
				} satisfies TLStoreSnapshot

				const hash = getHashForObject(snapshot)

				// If the hash matches our local data hash, we can skip the server request
				if (localData && localData.hash === hash) {
					setState('loaded')
					return
				}

				// convert the snapshot to an image using an editor
				const image = await snapshotToImage(snapshot, {
					darkMode: theme === 'dark',
				})

				// Set the image URL
				setImageUrl(image ?? '')

				// Update the state
				setState('loaded')

				// Set the thumbnail in storage
				storeThumbnailInIndexedDb({
					fileId: id,
					hash,
					thumbnail: image,
					didCancel: () => didDispose,
				})
			})
		})
		return () => {
			didDispose = true
		}
	}, [id, app, theme])

	return { state, imageUrl }
}

async function snapshotToImage(snapshot: TLStoreSnapshot, opts: { darkMode: boolean }) {
	const store = createTLStore({ shapeUtils: defaultShapeUtils, bindingUtils: defaultBindingUtils })
	loadSnapshot(store, snapshot)

	const container = document.createElement('div')
	container.classList.add('tl-container', opts.darkMode ? 'tl-theme__dark' : 'tl-theme__light')

	const tempElm = document.createElement('div')
	container.appendChild(tempElm)

	const editor = new Editor({
		store,
		shapeUtils: defaultShapeUtils,
		bindingUtils: defaultBindingUtils,
		tools: defaultShapeTools,
		getContainer: () => tempElm,
	})

	const shapeIds = editor.getCurrentPageShapeIds()

	let imageDataUrl = ''

	const svgResult = await editor.getSvgString([...shapeIds], {
		darkMode: opts.darkMode,
	})

	if (svgResult) {
		const blob = await getSvgAsImage(editor, svgResult.svg, {
			type: 'png',
			quality: 1,
			scale: 1,
			width: svgResult.width,
			height: svgResult.height,
		})
		if (blob) {
			imageDataUrl = URL.createObjectURL(blob)
		}
	}

	editor.dispose()

	return imageDataUrl
}
