import { act, fireEvent } from '@testing-library/react'
import {
	AssetRecordType,
	Editor,
	TLAssetId,
	TLAssetStore,
	TLShapeId,
	createShapeId,
} from '@tldraw/editor'
import { Tldraw } from '../lib/Tldraw'
import { renderTldrawComponentWithEditor } from './testutils/renderTldrawComponent'

let editor: Editor
let imageShapeId: TLShapeId
let imageAssetId: TLAssetId

// Resolves to `meta.resolvedUrl` when set, so a test can give the same asset a new URL the way a
// resolution change would.
const assetStore: TLAssetStore = {
	upload: async () => ({ src: '' }),
	resolve: (asset) =>
		typeof asset.meta.resolvedUrl === 'string' ? asset.meta.resolvedUrl : asset.props.src,
}

function getShapeContainer() {
	const container = document.getElementById(imageShapeId)
	expect(container).toBeTruthy()
	return container!
}

function getImageSrcs() {
	return [...getShapeContainer().querySelectorAll('img')].map((img) => img.getAttribute('src'))
}

function getImg(src: string) {
	const img = getShapeContainer().querySelector(`img[src="${src}"]`)
	expect(img).toBeTruthy()
	return img!
}

async function flushAssetResolution() {
	await act(async () => {
		await new Promise((resolve) => setTimeout(resolve, 0))
	})
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
	await flushAssetResolution()
}

// Re-resolves the same asset to a new URL, past the hook's 500ms debounce.
async function resolveSameAssetTo(resolvedUrl: string) {
	await act(async () => {
		const asset = editor.getAsset(imageAssetId)!
		editor.updateAssets([{ ...asset, meta: { resolvedUrl } }])
		for (let i = 0; i < 40; i++) editor.emit('tick', 16)
	})
	await flushAssetResolution()
}

function expectBrokenState() {
	const container = getShapeContainer()
	expect(container.querySelector('img')).toBeNull()
	expect(container.querySelector('svg')).toBeTruthy()
	expect(container.querySelector('.tl-image-container-loading')).toBeNull()
}

beforeEach(async () => {
	imageShapeId = createShapeId('image')
	imageAssetId = AssetRecordType.createId('imageAsset')

	const result = await renderTldrawComponentWithEditor(
		(onMount) => <Tldraw onMount={onMount} assets={assetStore} />,
		{ waitForPatterns: false }
	)
	editor = result.editor
})

describe('ImageShapeUtil load errors', () => {
	it('shows the broken asset state when the image fails to load', async () => {
		await createImage('http://localhost/missing.png')

		expect(getImageSrcs()).toEqual(['http://localhost/missing.png'])
		expect(getShapeContainer().querySelector('svg')).toBeNull()

		await act(async () => {
			fireEvent.error(getImg('http://localhost/missing.png'))
		})

		expectBrokenState()
	})

	it('keeps showing an already loaded image when a new resolution of the same asset fails', async () => {
		await createImage('http://localhost/first.png')
		await act(async () => {
			fireEvent.load(getImg('http://localhost/first.png'))
		})

		await resolveSameAssetTo('http://localhost/first-2x.png')
		await act(async () => {
			fireEvent.error(getImg('http://localhost/first-2x.png'))
		})

		expect(getImageSrcs()).toEqual(['http://localhost/first.png'])
		expect(getShapeContainer().querySelector('svg')).toBeNull()
	})

	it('shows the broken asset state when the shape switches to an asset that fails to load', async () => {
		await createImage('http://localhost/first.png')
		await act(async () => {
			fireEvent.load(getImg('http://localhost/first.png'))
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
		await flushAssetResolution()

		expect(getImageSrcs()).toEqual(['http://localhost/second.png'])
		await act(async () => {
			fireEvent.error(getImg('http://localhost/second.png'))
		})

		expectBrokenState()
	})

	it('stays broken when resolution changes alternate between URLs that already failed', async () => {
		await createImage('http://localhost/a.png')
		await act(async () => {
			fireEvent.error(getImg('http://localhost/a.png'))
		})

		await resolveSameAssetTo('http://localhost/b.png')
		await act(async () => {
			fireEvent.error(getImg('http://localhost/b.png'))
		})
		expectBrokenState()

		await resolveSameAssetTo('http://localhost/a.png')
		expectBrokenState()
	})
})
