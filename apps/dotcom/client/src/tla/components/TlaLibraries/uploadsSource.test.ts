import {
	LibraryItemRecordType,
	LibraryNotFoundError,
	LibraryPermissionError,
	type TLLibraryAction,
} from '@tldraw/libraries'
import { MediaHelpers } from 'tldraw'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createFakeLibrariesBackend } from './fakeLibrariesBackend'
import { TldrawAppUploadsSource } from './uploadsSource'

const ID = 'V1StGXR8_Z5jdHi6B-myT'
const PHOTO = { objectName: `${ID}-photo-png`, fileId: 'file_a', uploadedAt: 2000 }
const SCAN = { objectName: `${ID}-old-scan-jpg`, fileId: 'file_b', uploadedAt: 1000 }

function setUp(uploads = [PHOTO, SCAN]) {
	const backend = createFakeLibrariesBackend({ userUploads: uploads })
	vi.stubGlobal('fetch', backend.fetch)
	vi.spyOn(MediaHelpers, 'getImageSize').mockResolvedValue({ w: 640, h: 480, pixelRatio: 1 })
	vi.spyOn(MediaHelpers, 'isAnimated').mockResolvedValue(false)
	const source = new TldrawAppUploadsSource(backend.app, backend.getToken)
	return { backend, source }
}

const listed = (source: TldrawAppUploadsSource) => {
	const [library] = source.getLibraries()
	return source.getItems(library.id).map(({ name, thumbnail, createdAt }) => ({
		name,
		thumbnail,
		createdAt,
	}))
}

afterEach(() => {
	vi.unstubAllGlobals()
	vi.restoreAllMocks()
})

describe('TldrawAppUploadsSource', () => {
	it('lists the uploads as one library, newest first, named after their files', async () => {
		const { backend, source } = setUp()
		await source.refresh()
		expect(backend.fetch).toHaveBeenCalledWith(
			'/api/app/my-uploads',
			expect.objectContaining({ headers: { Authorization: 'Bearer token' } })
		)
		expect(source.getLibraries()).toMatchObject([{ name: 'Images' }])
		const resized = 'https://tldrawusercontent.com/cdn-cgi/image/width=512,height=512'
		expect(listed(source)).toEqual([
			{
				name: 'photo.png',
				thumbnail: `${resized},fit=scale-down,anim=false,format=webp/${PHOTO.objectName}`,
				createdAt: 2000,
			},
			{
				name: 'old-scan.jpg',
				thumbnail: `${resized},fit=scale-down,anim=false,format=webp/${SCAN.objectName}`,
				createdAt: 1000,
			},
		])
	})

	it('refuses every change', async () => {
		const { source } = setUp()
		await source.refresh()
		const [library] = source.getLibraries()
		const actions: TLLibraryAction[] = [
			'createLibrary',
			'renameLibrary',
			'deleteLibrary',
			'addItem',
			'renameItem',
			'deleteItem',
		]
		for (const action of actions) {
			expect(source.can(action)).toBe(false)
			expect(source.can(action, library.id)).toBe(false)
		}
		await expect(source.createLibrary()).rejects.toThrow(LibraryPermissionError)
		await expect(source.renameLibrary(library.id)).rejects.toThrow(LibraryPermissionError)
		await expect(source.deleteLibrary(library.id)).rejects.toThrow(LibraryPermissionError)
		await expect(source.addItem(library.id)).rejects.toThrow(LibraryPermissionError)
		await expect(source.renameItem()).rejects.toThrow(LibraryPermissionError)
		await expect(source.deleteItem()).rejects.toThrow(LibraryPermissionError)
		expect(source.getItems(library.id)).toHaveLength(2)
	})

	it('places an image shape over the upload, with its file, sized from the image', async () => {
		const { source } = setUp()
		await source.refresh()
		const [item] = source.getItems(source.getLibraries()[0].id)
		const { content } = await source.getItemContent(item.id)
		const src = `https://tldrawusercontent.com/${PHOTO.objectName}`
		expect(content.assets).toEqual([
			expect.objectContaining({
				id: `asset:${PHOTO.objectName}`,
				type: 'image',
				props: expect.objectContaining({ name: 'photo.png', src, w: 640, h: 480 }),
				meta: { fileId: 'file_a' },
			}),
		])
		expect(content.shapes).toEqual([
			expect.objectContaining({
				type: 'image',
				props: expect.objectContaining({ assetId: `asset:${PHOTO.objectName}`, w: 640, h: 480 }),
			}),
		])
		expect(content.rootShapeIds).toEqual([content.shapes[0].id])
	})

	it('fetches an image once however often it is placed', async () => {
		const { backend, source } = setUp()
		await source.refresh()
		const [item] = source.getItems(source.getLibraries()[0].id)
		await source.getItemContent(item.id)
		await source.getItemContent(item.id)
		const imageFetches = backend.fetch.mock.calls.filter(([url]) =>
			String(url).endsWith(PHOTO.objectName)
		)
		expect(imageFetches).toHaveLength(1)
	})

	it("refuses content for an item it doesn't list", async () => {
		const { source } = setUp()
		await expect(
			source.getItemContent(LibraryItemRecordType.createId('elsewhere'))
		).rejects.toThrow(LibraryNotFoundError)
	})

	it('lists an upload this tab makes at once, and once the listing has it, only there', async () => {
		const { source } = setUp([SCAN])
		await source.refresh()
		const src = `https://tldrawusercontent.com/${PHOTO.objectName}`
		source.noteUpload({ src, fileId: 'file_a' })
		source.noteUpload({ src: 'https://tldrawusercontent.com/x-clip-mp4', fileId: 'file_a' })
		expect(listed(source).map((item) => item.name)).toEqual(['photo.png', 'old-scan.jpg'])

		// Listed again before the upload's row is written: it stays.
		await source.refresh()
		expect(listed(source).map((item) => item.name)).toEqual(['photo.png', 'old-scan.jpg'])
	})

	it('lists a noted upload once when the listing has it too', async () => {
		const { source } = setUp()
		source.noteUpload({
			src: `https://tldrawusercontent.com/${PHOTO.objectName}`,
			fileId: 'file_a',
		})
		await source.refresh()
		expect(listed(source).map((item) => item.name)).toEqual(['photo.png', 'old-scan.jpg'])
	})
})
