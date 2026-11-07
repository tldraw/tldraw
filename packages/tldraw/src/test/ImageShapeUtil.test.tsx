import { act, fireEvent } from '@testing-library/react'
import { AssetRecordType, Editor, TLAssetId, TLShapeId, createShapeId } from '@tldraw/editor'
import { Tldraw } from '../lib/Tldraw'
import { renderTldrawComponentWithEditor } from './testutils/renderTldrawComponent'

let editor: Editor
let imageShapeId: TLShapeId
let imageAssetId: TLAssetId

function getShapeContainer() {
	const container = document.getElementById(imageShapeId)
	expect(container).toBeTruthy()
	return container!
}

async function createImage(src: string) {
	await act(async () => {
		editor.createAssets([
			{
				id: imageAssetId,
				type: 'image',
				typeName: 'asset',
				props: { w: 100, h: 100, name: 'image.png', isAnimated: false, mimeType: 'image/png', src },
				meta: {},
			},
		])
		editor.createShapes([
			{
				id: imageShapeId,
				type: 'image',
				x: 0,
				y: 0,
				props: { w: 100, h: 100, assetId: imageAssetId },
			},
		])
	})
	// Wait for the async asset URL resolution so the <img> element renders
	await act(async () => {
		await new Promise((resolve) => setTimeout(resolve, 0))
	})
}

beforeEach(async () => {
	imageShapeId = createShapeId('image')
	imageAssetId = AssetRecordType.createId('imageAsset')

	const result = await renderTldrawComponentWithEditor((onMount) => <Tldraw onMount={onMount} />, {
		waitForPatterns: false,
	})
	editor = result.editor
})

describe('ImageShapeUtil load errors', () => {
	it('shows the broken asset state when the image fails to load', async () => {
		await createImage('http://localhost/missing.png')

		const container = getShapeContainer()
		const img = container.querySelector('img')
		expect(img).toBeTruthy()
		expect(container.querySelector('svg')).toBeNull()

		await act(async () => {
			fireEvent.error(img!)
		})

		expect(container.querySelector('img')).toBeNull()
		expect(container.querySelector('svg')).toBeTruthy()
		expect(container.querySelector('.tl-image-container-loading')).toBeNull()
	})

	it('keeps showing an already loaded image when a newer URL fails to load', async () => {
		await createImage('http://localhost/first.png')

		const container = getShapeContainer()
		await act(async () => {
			fireEvent.load(container.querySelector('img')!)
		})

		const secondAssetId = AssetRecordType.createId('secondImageAsset')
		await act(async () => {
			const asset = editor.getAsset(imageAssetId)!
			editor.createAssets([
				{
					...asset,
					id: secondAssetId,
					props: { ...asset.props, src: 'http://localhost/second.png' },
				},
			])
			editor.updateShape({ id: imageShapeId, type: 'image', props: { assetId: secondAssetId } })
		})
		await act(async () => {
			await new Promise((resolve) => setTimeout(resolve, 0))
		})

		const next = container.querySelector('img[src="http://localhost/second.png"]')
		expect(next).toBeTruthy()
		await act(async () => {
			fireEvent.error(next!)
		})

		expect([...container.querySelectorAll('img')].map((img) => img.getAttribute('src'))).toEqual([
			'http://localhost/first.png',
		])
		expect(container.querySelector('svg')).toBeNull()
	})
})
