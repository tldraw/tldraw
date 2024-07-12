import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import {
	DefaultSpinner,
	ErrorScreen,
	LoadingScreen,
	TLEditorSnapshot,
	TldrawHandles,
	TldrawScribble,
	TldrawSelectionBackground,
	TldrawSelectionForeground,
	TldrawShapeIndicators,
	defaultEditorAssetUrls,
	usePreloadAssets,
} from 'tldraw'
import 'tldraw/tldraw.css'
import { ThumbnailEditor } from '../components/ThumbnailEditor'

// There's a guide at the bottom of this file!

// [1]
const defaultComponents = {
	Scribble: TldrawScribble,
	ShapeIndicators: TldrawShapeIndicators,
	CollaboratorScribble: TldrawScribble,
	SelectionForeground: TldrawSelectionForeground,
	SelectionBackground: TldrawSelectionBackground,
	Handles: TldrawHandles,
}

export function Component() {
	const { fileId } = useParams<{ fileId: string }>()

	const [snapshot, setSnapshot] = useState<TLEditorSnapshot | null>(null)

	useEffect(() => {
		fetch(`http://localhost:5002/snapshot`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({ fileId }),
		}).then(
			async (res) => {
				const data = await res.json()
				setSnapshot(data.snapshot)
			},
			(err) => {
				console.error(err)
			}
		)
	}, [fileId])

	const assetLoading = usePreloadAssets(defaultEditorAssetUrls)

	if (assetLoading.error) {
		return <ErrorScreen>Could not load assets.</ErrorScreen>
	}

	if (!assetLoading.done) {
		return (
			<LoadingScreen>
				<DefaultSpinner />
			</LoadingScreen>
		)
	}

	if (!snapshot) return null

	return <ThumbnailEditor snapshot={snapshot} />
}
