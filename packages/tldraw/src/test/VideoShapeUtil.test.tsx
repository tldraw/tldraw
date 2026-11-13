import { act, fireEvent } from '@testing-library/react'
import {
	AssetRecordType,
	Editor,
	TLAssetId,
	TLShapeId,
	TLVideoAsset,
	createShapeId,
} from '@tldraw/editor'
import { Tldraw } from '../lib/Tldraw'
import { renderTldrawComponentWithEditor } from './testutils/renderTldrawComponent'

const LOADING_BACKGROUND = 'var(--tl-color-low)'
const LOADING_BORDER = '1px solid var(--tl-color-low-border)'

let editor: Editor
let videoShapeId: TLShapeId
let videoAssetId: TLAssetId

function getShapeContainer() {
	const container = document.getElementById(videoShapeId)
	expect(container).toBeTruthy()
	return container!
}

beforeEach(async () => {
	videoShapeId = createShapeId('video')
	videoAssetId = AssetRecordType.createId('videoAsset')

	const result = await renderTldrawComponentWithEditor((onMount) => <Tldraw onMount={onMount} />, {
		waitForPatterns: false,
	})
	editor = result.editor
})

describe('VideoShapeUtil loading state', () => {
	it('shows the loading plate when the asset record is missing', async () => {
		await act(async () => {
			editor.createShapes([
				{ id: videoShapeId, type: 'video', x: 0, y: 0, props: { w: 100, h: 100 } },
			])
		})

		const container = getShapeContainer()
		expect(container.style.backgroundColor).toBe(LOADING_BACKGROUND)
		expect(container.style.border).toBe(LOADING_BORDER)
	})

	it('shows the loading plate while the asset is uploading (no src)', async () => {
		await act(async () => {
			editor.createAssets([
				{
					id: videoAssetId,
					type: 'video',
					typeName: 'asset',
					props: {
						w: 100,
						h: 100,
						name: 'video.mp4',
						isAnimated: true,
						mimeType: 'video/mp4',
						src: '',
					},
					meta: {},
				},
			])
			editor.createShapes([
				{
					id: videoShapeId,
					type: 'video',
					x: 0,
					y: 0,
					props: { w: 100, h: 100, assetId: videoAssetId },
				},
			])
		})

		const container = getShapeContainer()
		expect(container.style.backgroundColor).toBe(LOADING_BACKGROUND)
		expect(container.style.border).toBe(LOADING_BORDER)
	})

	it('shows the loading plate until the video loads, then goes transparent', async () => {
		await act(async () => {
			editor.createAssets([
				{
					id: videoAssetId,
					type: 'video',
					typeName: 'asset',
					props: {
						w: 100,
						h: 100,
						name: 'video.mp4',
						isAnimated: true,
						mimeType: 'video/mp4',
						src: 'http://localhost/video.mp4',
					},
					meta: {},
				},
			])
			editor.createShapes([
				{
					id: videoShapeId,
					type: 'video',
					x: 0,
					y: 0,
					props: { w: 100, h: 100, assetId: videoAssetId },
				},
			])
		})

		// Wait for the async asset URL resolution so the <video> element renders
		await act(async () => {
			await new Promise((resolve) => setTimeout(resolve, 0))
		})

		const container = getShapeContainer()
		const video = container.querySelector('video')
		expect(video).toBeTruthy()

		// The video element exists but hasn't fired loadeddata yet
		expect(container.style.backgroundColor).toBe(LOADING_BACKGROUND)
		expect(container.style.border).toBe(LOADING_BORDER)

		await act(async () => {
			fireEvent.loadedData(video!)
		})

		expect(container.style.backgroundColor).toBe('transparent')
		// jsdom doesn't round-trip the `border: none` shorthand, so check the style directly
		expect(container.style.borderStyle).toBe('none')
	})

	async function createLoadingVideo(src: string) {
		await act(async () => {
			editor.createAssets([
				{
					id: videoAssetId,
					type: 'video',
					typeName: 'asset',
					props: {
						w: 100,
						h: 100,
						name: 'video.mp4',
						isAnimated: true,
						mimeType: 'video/mp4',
						src,
					},
					meta: {},
				},
			])
			editor.createShapes([
				{
					id: videoShapeId,
					type: 'video',
					x: 0,
					y: 0,
					props: { w: 100, h: 100, assetId: videoAssetId },
				},
			])
		})
		await act(async () => {
			await new Promise((resolve) => setTimeout(resolve, 0))
		})
	}

	it('shows the broken-asset state instead of a spinner when the source fails to load', async () => {
		await createLoadingVideo('http://localhost/missing.mp4')

		const container = getShapeContainer()
		expect(container.querySelector('.tl-spinner')).toBeTruthy()

		await act(async () => {
			fireEvent.error(container.querySelector('source')!)
		})

		expect(container.querySelector('.tl-spinner')).toBeNull()
		expect(container.querySelector('video')).toBeNull()
		expect(container.querySelector('svg')).toBeTruthy()
		expect(container.style.backgroundColor).toBe(LOADING_BACKGROUND)
	})

	it('shows the broken-asset state when the video fails to decode', async () => {
		await createLoadingVideo('http://localhost/bad-codec.mp4')

		const container = getShapeContainer()
		await act(async () => {
			fireEvent.error(container.querySelector('video')!)
		})

		expect(container.querySelector('.tl-spinner')).toBeNull()
		expect(container.querySelector('video')).toBeNull()
		expect(container.querySelector('svg')).toBeTruthy()
		expect(container.style.backgroundColor).toBe(LOADING_BACKGROUND)
		expect(container.style.border).toBe(LOADING_BORDER)
	})

	it('shows the broken-asset state on the loading plate when a loaded video errors', async () => {
		await createLoadingVideo('http://localhost/video.mp4')

		const container = getShapeContainer()
		await act(async () => {
			fireEvent.loadedData(container.querySelector('video')!)
		})
		expect(container.style.backgroundColor).toBe('transparent')

		await act(async () => {
			fireEvent.error(container.querySelector('video')!)
		})

		expect(container.querySelector('video')).toBeNull()
		expect(container.querySelector('svg')).toBeTruthy()
		expect(container.style.backgroundColor).toBe(LOADING_BACKGROUND)
		expect(container.style.border).toBe(LOADING_BORDER)
	})

	it('shows the loading state again when the url changes', async () => {
		await createLoadingVideo('http://localhost/video.mp4')

		const container = getShapeContainer()
		await act(async () => {
			fireEvent.loadedData(container.querySelector('video')!)
		})
		expect(container.style.backgroundColor).toBe('transparent')

		await act(async () => {
			const asset = editor.getAsset<TLVideoAsset>(videoAssetId)!
			const otherAssetId = AssetRecordType.createId('otherVideoAsset')
			editor.createAssets([
				{
					...asset,
					id: otherAssetId,
					props: { ...asset.props, src: 'http://localhost/other.mp4' },
				},
			])
			editor.updateShape({ id: videoShapeId, type: 'video', props: { assetId: otherAssetId } })
		})
		await act(async () => {
			await new Promise((resolve) => setTimeout(resolve, 0))
		})

		expect(container.querySelector('source')!.getAttribute('src')).toBe(
			'http://localhost/other.mp4'
		)
		expect(container.style.backgroundColor).toBe(LOADING_BACKGROUND)
		expect(container.querySelector('video')!.hidden).toBe(true)
		expect(container.querySelector('.tl-spinner')).toBeTruthy()
	})

	async function switchToAsset(assetId: TLAssetId, src: string) {
		await act(async () => {
			const asset = editor.getAsset<TLVideoAsset>(videoAssetId)!
			if (!editor.getAsset(assetId)) {
				editor.createAssets([{ ...asset, id: assetId, props: { ...asset.props, src } }])
			}
			editor.updateShape({ id: videoShapeId, type: 'video', props: { assetId } })
		})
		await act(async () => {
			await new Promise((resolve) => setTimeout(resolve, 0))
		})
	}

	it('clears the broken-asset state from a mid-playback error once the asset changes', async () => {
		await createLoadingVideo('http://localhost/video.mp4')

		const container = getShapeContainer()
		await act(async () => {
			fireEvent.loadedData(container.querySelector('video')!)
		})
		await act(async () => {
			fireEvent.error(container.querySelector('video')!)
		})
		expect(container.querySelector('video')).toBeNull()

		await switchToAsset(AssetRecordType.createId('otherVideoAsset'), 'http://localhost/other.mp4')
		expect(container.querySelector('source')!.getAttribute('src')).toBe(
			'http://localhost/other.mp4'
		)

		// Going back to the asset that failed tries it again rather than showing the stale error
		await switchToAsset(videoAssetId, 'http://localhost/video.mp4')
		expect(container.querySelector('source')!.getAttribute('src')).toBe(
			'http://localhost/video.mp4'
		)
		expect(container.querySelector('svg')).toBeNull()
	})

	it('retries a failed video when the shape switches to another asset with the same src', async () => {
		await createLoadingVideo('http://localhost/video.mp4')

		const container = getShapeContainer()
		await act(async () => {
			fireEvent.error(container.querySelector('source')!)
		})
		expect(container.querySelector('video')).toBeNull()

		await switchToAsset(
			AssetRecordType.createId('reuploadedVideoAsset'),
			'http://localhost/video.mp4'
		)
		expect(container.querySelector('source')!.getAttribute('src')).toBe(
			'http://localhost/video.mp4'
		)
		expect(container.querySelector('.tl-spinner')).toBeTruthy()
	})
})
