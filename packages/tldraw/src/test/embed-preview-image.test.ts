import { AssetRecordType, TLBookmarkAsset, TLEmbedShape, createShapeId } from '@tldraw/editor'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { EmbedShapeUtil } from '../lib/shapes/embed/EmbedShapeUtil'
import { TestEditor } from './TestEditor'

let editor: TestEditor

beforeEach(() => {
	editor = new TestEditor()
})

afterEach(() => {
	vi.restoreAllMocks()
	editor?.dispose()
})

const bookmarkFor = (url: string, image: string): TLBookmarkAsset => ({
	id: AssetRecordType.createId(url.replace(/\W/g, '')),
	typeName: 'asset',
	type: 'bookmark',
	props: { src: url, image, title: '', description: '', favicon: '' },
	meta: {},
})

// The url handler unfurls each url to a bookmark asset with the image given here.
function unfurlTo(images: Record<string, string>) {
	return vi
		.spyOn(editor, 'getAssetForExternalContent')
		.mockImplementation(async (info: any) => bookmarkFor(info.url, images[info.url] ?? ''))
}

const id = createShapeId('embed')
const createEmbed = (url: string) =>
	editor.createShape<TLEmbedShape>({ id, type: 'embed', props: { w: 400, h: 225, url } })
const getEmbed = () => editor.getShape<TLEmbedShape>(id)!

describe('embed preview image', () => {
	it('keeps the page’s preview image as an asset when the embed is created', async () => {
		const url = 'https://vimeo.com/817841251'
		unfurlTo({ [url]: 'https://i.vimeocdn.com/video/1.jpg' })
		createEmbed(url)
		await vi.waitFor(() => expect(getEmbed().props.assetId).not.toBeNull())
		expect(editor.getAsset(getEmbed().props.assetId!)).toMatchObject({
			type: 'bookmark',
			props: { src: url, image: 'https://i.vimeocdn.com/video/1.jpg' },
		})
	})

	it('leaves the embed without an asset when the page has no image', async () => {
		const unfurl = unfurlTo({})
		createEmbed('https://example.com/page')
		await vi.waitFor(() => expect(unfurl).toHaveBeenCalled())
		await Promise.resolve()
		expect(getEmbed().props.assetId).toBeNull()
		expect(editor.getAssets()).toEqual([])
	})

	it('points at the new page’s image when the url changes', async () => {
		const first = 'https://vimeo.com/1'
		const second = 'https://vimeo.com/2'
		unfurlTo({
			[first]: 'https://cdn.example.com/1.jpg',
			[second]: 'https://cdn.example.com/2.jpg',
		})
		createEmbed(first)
		await vi.waitFor(() => expect(getEmbed().props.assetId).not.toBeNull())
		editor.updateShape<TLEmbedShape>({ id, type: 'embed', props: { url: second } })
		await vi.waitFor(() =>
			expect(editor.getAsset(getEmbed().props.assetId!)).toMatchObject({ props: { src: second } })
		)
	})

	it('doesn’t look the page up again when the embed already has its image', async () => {
		const url = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
		const asset = bookmarkFor(url, 'https://cdn.example.com/1.jpg')
		editor.createAssets([asset])
		const unfurl = unfurlTo({})
		editor.createShape<TLEmbedShape>({
			id,
			type: 'embed',
			props: { w: 400, h: 225, url, assetId: asset.id },
		})
		await Promise.resolve()
		expect(unfurl).not.toHaveBeenCalled()
	})

	it('unfurls once for an embed that also sizes to its content', async () => {
		const url = 'https://vimeo.com/817841251'
		const util = editor.getShapeUtil('embed') as EmbedShapeUtil
		vi.spyOn(util, 'getEmbedDefinition').mockImplementation((url) => ({
			definition: { type: 'vimeo', width: 640, height: 360, sizeToContentAspectRatio: true } as any,
			url,
			embedUrl: url,
		}))
		const unfurl = unfurlTo({ [url]: 'https://i.vimeocdn.com/video/1.jpg' })
		createEmbed(url)
		await vi.waitFor(() => expect(getEmbed().props.assetId).not.toBeNull())
		expect(unfurl).toHaveBeenCalledTimes(1)
	})
})
