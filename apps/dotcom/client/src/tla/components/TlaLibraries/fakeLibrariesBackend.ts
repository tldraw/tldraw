import type { TlaLibrary, TlaLibraryItem, TlaLibraryItemThumbnail } from '@tldraw/dotcom-shared'
import { atom, uniqueId } from 'tldraw'
import { vi } from 'vitest'
import type { TldrawApp } from '../../app/TldrawApp'

type Row = TlaLibrary & { items: TlaLibraryItem[] }

/**
 * Stands in for what TldrawAppLibrariesSource talks to: the app's libraries query and
 * mutators, and the sync worker's routes behind `fetch`. Rows change at once, as Zero applies a
 * mutation locally. Stored content is kept in a map, and thumbnails at made-up public URLs.
 */
export function createFakeLibrariesBackend({
	userId = 'user_me',
	workspaces = [{ id: 'acme', name: 'Acme' }],
}: { userId?: string; workspaces?: { id: string; name: string }[] } = {}) {
	const rows = atom<Row[]>('fake library rows', [])
	const contents = new Map<string, string>()
	let uploads = 0
	const upload = () => `https://content.test/thumbnail-${++uploads}-png`
	const newThumbnail = (light: boolean, dark: boolean): TlaLibraryItemThumbnail | null => {
		if (!light) return null
		return dark ? { light: upload(), dark: upload() } : upload()
	}
	const memberships = [
		{ groupId: userId, role: 'owner', group: { name: 'Home' } },
		...workspaces.map((w) => ({ groupId: w.id, role: 'member', group: { name: w.name } })),
	]
	const isMember = (groupId: string) => memberships.some((m) => m.groupId === groupId)

	const done = () => {
		const result = Promise.resolve({ type: 'success' })
		return { client: result, server: result }
	}
	const rejected = () => {
		const result = Promise.resolve({ type: 'error', error: { type: 'app', message: 'forbidden' } })
		return { client: result, server: result }
	}
	const updateRow = (id: string, change: (row: Row) => Row) =>
		rows.update((all) => all.map((row) => (row.id === id ? change(row) : row)))
	const updateItem = (id: string, change: (item: TlaLibraryItem) => TlaLibraryItem) =>
		rows.update((all) =>
			all.map((row) => ({ ...row, items: row.items.map((i) => (i.id === id ? change(i) : i)) }))
		)

	const mutate = {
		library: {
			create: ({ id, name, owningGroupId, meta }: any) => {
				if (!isMember(owningGroupId)) return rejected()
				rows.update((all) => [
					...all,
					{
						id,
						name: name.trim(),
						owningGroupId,
						meta,
						createdBy: userId,
						createdAt: all.length,
						updatedAt: 0,
						items: [],
					},
				])
				return done()
			},
			rename: ({ id, name }: any) => {
				updateRow(id, (row) => ({ ...row, name }))
				return done()
			},
			delete: ({ id }: any) => {
				rows.update((all) => all.filter((row) => row.id !== id))
				return done()
			},
			move: ({ id, owningGroupId }: any) => {
				if (!isMember(owningGroupId)) return rejected()
				updateRow(id, (row) => ({ ...row, owningGroupId }))
				return done()
			},
		},
		library_item: {
			rename: ({ id, name }: any) => {
				updateItem(id, (item) => ({ ...item, name }))
				return done()
			},
			delete: ({ id }: any) => {
				rows.update((all) =>
					all.map((row) => ({ ...row, items: row.items.filter((i) => i.id !== id) }))
				)
				return done()
			},
			move: ({ id, libraryId }: any) => {
				const item = rows
					.get()
					.flatMap((row) => row.items)
					.find((i) => i.id === id)!
				rows.update((all) =>
					all.map((row) => ({
						...row,
						items:
							row.id === libraryId
								? [...row.items, { ...item, libraryId }]
								: row.items.filter((i) => i.id !== id),
					}))
				)
				return done()
			},
		},
	}

	const addItem = (
		libraryId: string,
		name: string | null,
		thumbnail: TlaLibraryItemThumbnail | null
	) => {
		const id = uniqueId()
		const item: TlaLibraryItem = {
			id,
			libraryId,
			name,
			thumbnail,
			createdBy: userId,
			createdAt: Date.now(),
			updatedAt: Date.now(),
		}
		updateRow(libraryId, (row) => ({ ...row, items: [...row.items, item] }))
		return item
	}

	const routes = async (url: string, init: RequestInit = {}): Promise<Response> => {
		let match = url.match(/^\/api\/app\/libraries\/([^/]+)\/items$/)
		if (match && init.method === 'POST') {
			const form = init.body as FormData
			const item = addItem(
				match[1],
				(form.get('name') as string | null) ?? null,
				newThumbnail(
					form.get('thumbnail') instanceof Blob,
					form.get('darkThumbnail') instanceof Blob
				)
			)
			contents.set(item.id, form.get('content') as string)
			return Response.json({ id: item.id, createdAt: item.createdAt, thumbnail: item.thumbnail })
		}
		match = url.match(/^\/api\/app\/libraries\/([^/]+)\/copy$/)
		if (match && init.method === 'POST') {
			const { owningGroupId } = JSON.parse(init.body as string)
			const source = rows.get().find((row) => row.id === match![1])!
			const id = uniqueId()
			rows.update((all) => [...all, { ...source, id, owningGroupId, items: [] }])
			for (const item of source.items) {
				const { thumbnail } = item
				const copy = addItem(
					id,
					item.name,
					newThumbnail(thumbnail !== null, typeof thumbnail === 'object' && thumbnail !== null)
				)
				contents.set(copy.id, contents.get(item.id)!)
			}
			return Response.json({ id })
		}
		match = url.match(/^\/api\/app\/library-items\/([^/]+)\/content$/)
		if (match) {
			const stored = contents.get(match[1])
			return stored === undefined ? new Response(null, { status: 404 }) : new Response(stored)
		}
		return new Response(null, { status: 404 })
	}
	const fetchSpy = vi.fn((input: RequestInfo | URL, init?: RequestInit) =>
		routes(String(input), init)
	)

	const app = {
		userId,
		z: { mutate },
		getHomeWorkspaceId: () => userId,
		getWorkspaceMemberships: () => memberships,
		getWorkspaceMembership: (id: string) => memberships.find((m) => m.groupId === id),
		getLibraryRows: () => rows.get(),
		msg: (message: { defaultMessage: string }) => message.defaultMessage,
	} as unknown as TldrawApp

	return { app, rows, contents, fetch: fetchSpy, getToken: async () => 'token' }
}
