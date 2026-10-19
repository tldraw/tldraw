import {
	AssetRecordType,
	TLAssetStore,
	TLContent,
	TLImageAsset,
	createShapeId,
} from '@tldraw/editor'
import { TestEditor } from './TestEditor'

const assetId = AssetRecordType.createId('a')
const shapeId = createShapeId('image')

function createContent(assets: Partial<TLAssetStore>) {
	const editor = new TestEditor({}, { assets: { upload: async () => ({ src: '' }), ...assets } })
	editor.createAssets([
		{
			id: assetId,
			typeName: 'asset',
			type: 'image',
			meta: {},
			props: {
				w: 100,
				h: 100,
				name: 'a.png',
				isAnimated: false,
				mimeType: 'image/png',
				src: 'asset:a',
			},
		},
	])
	editor.createShape({ id: shapeId, type: 'image', x: 0, y: 0, props: { assetId, w: 100, h: 100 } })
	return { editor, content: editor.getContentFromCurrentPage([shapeId])! }
}

// jsdom's Blob and Node's Response disagree, so a real Response stringifies the blob
function mockResponse(ok: boolean, body: string, type: string) {
	return { ok, status: ok ? 200 : 404, blob: async () => new Blob([body], { type }) }
}

function originalAsset(content: TLContent) {
	return structuredClone(content.assets.find((a) => a.id === assetId) as TLImageAsset)
}

describe('Editor.resolveAssetsInContent', () => {
	afterEach(() => {
		vi.unstubAllGlobals()
	})

	it('inlines a fetched asset as a data url', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => mockResponse(true, 'png-bytes', 'image/png'))
		)
		const { editor, content } = createContent({ resolve: async () => 'https://example.com/a.png' })

		const result = await editor.resolveAssetsInContent(content)

		const asset = result!.assets[0] as TLImageAsset
		expect(asset.props.src).toMatch(/^data:image\/png;base64,/)
		expect(vi.mocked(fetch).mock.calls[0][0]).toBe('https://example.com/a.png')
	})

	it('keeps the original asset when resolve returns null', async () => {
		vi.stubGlobal('fetch', vi.fn())
		const { editor, content } = createContent({ resolve: async () => null })
		const expected = originalAsset(content)

		const result = await editor.resolveAssetsInContent(content)

		expect(result!.assets).toEqual([expected])
		expect(fetch).not.toHaveBeenCalled()
	})

	it('keeps the original asset when the fetch rejects', async () => {
		vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')))
		const { editor, content } = createContent({ resolve: async () => 'https://example.com/a.png' })
		const expected = originalAsset(content)

		const result = await editor.resolveAssetsInContent(content)

		expect(result!.assets).toEqual([expected])
	})

	it('keeps the original asset when the fetch responds with a non-OK status', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => mockResponse(false, '<html>not found</html>', 'text/html'))
		)
		const { editor, content } = createContent({ resolve: async () => 'https://example.com/a.png' })
		const expected = originalAsset(content)

		const result = await editor.resolveAssetsInContent(content)

		expect(result!.assets).toEqual([expected])
	})
})
