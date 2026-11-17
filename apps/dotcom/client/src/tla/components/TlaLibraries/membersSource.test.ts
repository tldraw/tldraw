import {
	LibraryItemRecordType,
	LibraryNotFoundError,
	LibraryPermissionError,
	type TLLibraryAction,
} from '@tldraw/libraries'
import { MediaHelpers } from 'tldraw'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AVATAR_HOST, createFakeLibrariesBackend } from './fakeLibrariesBackend'
import { getInitialThumbnail, TldrawAppMembersSource } from './membersSource'

const ADA = { userId: 'ada', userName: 'Ada', userAvatar: `${AVATAR_HOST}/ada`, createdAt: 2 }
const ZED = { userId: 'zed', userName: 'zed', userColor: '#123456', createdAt: 1 }
const BEA = { userId: 'bea', userName: 'Bea', userAvatar: `${AVATAR_HOST}/bea`, createdAt: 3 }

function setUp(imageSize = { w: 200, h: 200 }) {
	const backend = createFakeLibrariesBackend({
		userId: 'home',
		workspaces: [
			{ id: 'acme', name: 'Acme', members: [ZED, ADA] },
			{ id: 'zoo', name: 'Zoo', members: [BEA] },
		],
	})
	vi.stubGlobal('fetch', backend.fetch)
	vi.spyOn(MediaHelpers, 'getImageSize').mockResolvedValue({ ...imageSize, pixelRatio: 1 })
	const source = new TldrawAppMembersSource(backend.app)
	return { backend, source }
}

const listed = (source: TldrawAppMembersSource) =>
	source.getLibraries().map((library) => ({
		name: library.name,
		ownerId: library.ownerId,
		members: source.getItems(library.id).map(({ name, thumbnail }) => ({ name, thumbnail })),
	}))

const findItem = (source: TldrawAppMembersSource, name: string) =>
	source
		.getLibraries()
		.flatMap((library) => source.getItems(library.id))
		.find((item) => item.name === name)!

afterEach(() => {
	vi.unstubAllGlobals()
	vi.restoreAllMocks()
})

describe('TldrawAppMembersSource', () => {
	it('lists the members of each shared workspace by name, with their avatars or initials', () => {
		const { source } = setUp()
		expect(source.getLibraryOwners()).toEqual([
			{ id: 'acme', name: 'Acme' },
			{ id: 'zoo', name: 'Zoo' },
		])
		expect(listed(source)).toEqual([
			{
				name: 'Members',
				ownerId: 'acme',
				members: [
					{ name: 'Ada', thumbnail: ADA.userAvatar },
					{ name: 'zed', thumbnail: getInitialThumbnail(ZED) },
				],
			},
			{ name: 'Members', ownerId: 'zoo', members: [{ name: 'Bea', thumbnail: BEA.userAvatar }] },
		])
	})

	it("draws a member's initial on their colour", () => {
		const svg = decodeURIComponent(getInitialThumbnail(ZED).slice('data:image/svg+xml,'.length))
		expect(svg).toContain('fill="#123456"')
		expect(svg).toContain('>Z</text>')
		expect(decodeURIComponent(getInitialThumbnail({ userName: '<b>', userColor: '' }))).toContain(
			'>&#60;</text>'
		)
	})

	it('follows joins, leaves, renames and avatar changes', () => {
		const { backend, source } = setUp()
		const names = () => listed(source)[0].members.map((m) => m.name)
		backend.setMembers('acme', [ADA, ZED, BEA])
		expect(names()).toEqual(['Ada', 'Bea', 'zed'])
		backend.setMembers('acme', [{ ...ADA, userName: 'Ada L', userAvatar: `${AVATAR_HOST}/new` }])
		expect(listed(source)[0].members).toEqual([{ name: 'Ada L', thumbnail: `${AVATAR_HOST}/new` }])
	})

	it('refuses every change', async () => {
		const { source } = setUp()
		const [library] = source.getLibraries()
		const [item] = source.getItems(library.id)
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
		await expect(source.renameItem(item.id)).rejects.toThrow(LibraryPermissionError)
		await expect(source.deleteItem(item.id)).rejects.toThrow(LibraryPermissionError)
		expect(source.getItems(library.id)).toHaveLength(2)
	})

	it('places a member as a group of their avatar, cropped to a circle, over their name', async () => {
		const { source } = setUp()
		const { content } = await source.getItemContent(findItem(source, 'Ada').id)
		const [group, image, name] = content.shapes
		expect(content.rootShapeIds).toEqual([group.id])
		expect(group).toMatchObject({ type: 'group', parentId: 'page:page' })
		expect(image).toMatchObject({
			type: 'image',
			parentId: group.id,
			props: {
				w: 96,
				h: 96,
				assetId: content.assets[0].id,
				crop: { topLeft: { x: 0, y: 0 }, bottomRight: { x: 1, y: 1 }, isCircle: true },
			},
		})
		expect(name).toMatchObject({ type: 'text', parentId: group.id, y: 104 })
		expect(JSON.stringify(name.props)).toContain('"Ada"')
		expect(content.assets).toEqual([
			expect.objectContaining({
				type: 'image',
				props: expect.objectContaining({
					name: 'Ada.png',
					src: expect.stringMatching(/^data:image\/png;base64,/),
					w: 200,
					h: 200,
				}),
			}),
		])
	})

	it("crops the middle square of an avatar that isn't square", async () => {
		const { source } = setUp({ w: 400, h: 200 })
		const { content } = await source.getItemContent(findItem(source, 'Ada').id)
		expect(content.shapes[1].props).toMatchObject({
			crop: { topLeft: { x: 0.25, y: 0 }, bottomRight: { x: 0.75, y: 1 }, isCircle: true },
		})
	})

	it('places a member without an avatar as their initial in a circle', async () => {
		const { backend, source } = setUp()
		const { content } = await source.getItemContent(findItem(source, 'zed').id)
		const [group, face] = content.shapes
		expect(face).toMatchObject({
			type: 'geo',
			parentId: group.id,
			props: { geo: 'ellipse', w: 96, h: 96 },
		})
		expect(JSON.stringify(face.props)).toContain('"Z"')
		expect(content.assets).toEqual([])
		expect(backend.fetch).not.toHaveBeenCalled()
	})

	it('fetches an avatar once however often it is placed', async () => {
		const { backend, source } = setUp()
		const item = findItem(source, 'Ada')
		await source.getItemContent(item.id)
		await source.getItemContent(item.id)
		expect(backend.fetch).toHaveBeenCalledTimes(1)
	})

	it("refuses content for a member who has left, or an item it doesn't list", async () => {
		const { backend, source } = setUp()
		const item = findItem(source, 'Ada')
		backend.setMembers('acme', [ZED])
		await expect(source.getItemContent(item.id)).rejects.toThrow(LibraryNotFoundError)
		await expect(
			source.getItemContent(LibraryItemRecordType.createId('elsewhere'))
		).rejects.toThrow(LibraryNotFoundError)
	})
})
