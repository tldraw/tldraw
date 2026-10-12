import { act, fireEvent } from '@testing-library/react'
import { AssetRecordType, Editor, TLAssetId, TLShapeId, createShapeId } from '@tldraw/editor'
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
})
