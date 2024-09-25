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
	getSvgAsImage,
	loadSnapshot,
	useValue,
} from 'tldraw'
import { loadDataFromStore } from '../utils/local-sync'
import { useApp } from './useAppState'

export function useLocalThumbnail(id: string) {
	const app = useApp()
	const theme = useValue('theme', () => app.getSessionState().theme, [app])
	const [state] = useState('loaded')

	const [imageUrl, setImageUrl] = useState<string | null>(null)

	useEffect(() => {
		let didDispose = false
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

			const image = await snapshotToImage(snapshot, {
				darkMode: theme === 'dark',
			})

			setImageUrl(image ?? '')
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
