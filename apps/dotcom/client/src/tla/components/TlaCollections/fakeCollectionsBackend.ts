import type { TlaCollection, TlaCollectionItem } from '@tldraw/dotcom-shared'
import { atom, uniqueId } from 'tldraw'
import { vi } from 'vitest'
import type { TldrawApp } from '../../app/TldrawApp'

type Row = TlaCollection & { items: TlaCollectionItem[] }

/**
 * Stands in for what TldrawAppCollectionsSource talks to: the app's collections query and
 * mutators, and the sync worker's routes behind `fetch`. Rows change at once, as Zero applies a
 * mutation locally, and the stored content and thumbnails are kept in maps.
 */
export function createFakeCollectionsBackend({
	userId = 'user_me',
	workspaces = [{ id: 'acme', name: 'Acme' }],
}: { userId?: string; workspaces?: { id: string; name: string }[] } = {}) {
	const rows = atom<Row[]>('fake collection rows', [])
	const contents = new Map<string, string>()
	const thumbnails = new Map<string, Blob>()
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
	const updateItem = (id: string, change: (item: TlaCollectionItem) => TlaCollectionItem) =>
		rows.update((all) =>
			all.map((row) => ({ ...row, items: row.items.map((i) => (i.id === id ? change(i) : i)) }))
		)

	const mutate = {
		collection: {
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
		collection_item: {
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
			move: ({ id, collectionId }: any) => {
				const item = rows
					.get()
					.flatMap((row) => row.items)
					.find((i) => i.id === id)!
				rows.update((all) =>
					all.map((row) => ({
						...row,
						items:
							row.id === collectionId
								? [...row.items, { ...item, collectionId }]
								: row.items.filter((i) => i.id !== id),
					}))
				)
				return done()
			},
		},
	}

	const addItem = (collectionId: string, name: string | null, thumbnail: Blob | undefined) => {
		const id = uniqueId()
		const item: TlaCollectionItem = {
			id,
			collectionId,
			name,
			thumbnailType: thumbnail?.type ?? null,
			createdBy: userId,
			createdAt: Date.now(),
			updatedAt: Date.now(),
		}
		if (thumbnail) thumbnails.set(id, thumbnail)
		updateRow(collectionId, (row) => ({ ...row, items: [...row.items, item] }))
		return item
	}

	const routes = async (url: string, init: RequestInit = {}): Promise<Response> => {
		let match = url.match(/^\/api\/app\/collections\/([^/]+)\/items$/)
		if (match && init.method === 'POST') {
			const form = init.body as FormData
			const thumbnail = form.get('thumbnail')
			const item = addItem(
				match[1],
				(form.get('name') as string | null) ?? null,
				thumbnail instanceof Blob ? thumbnail : undefined
			)
			contents.set(item.id, form.get('content') as string)
			return Response.json({ id: item.id, createdAt: item.createdAt })
		}
		match = url.match(/^\/api\/app\/collections\/([^/]+)\/copy$/)
		if (match && init.method === 'POST') {
			const { owningGroupId } = JSON.parse(init.body as string)
			const source = rows.get().find((row) => row.id === match![1])!
			const id = uniqueId()
			rows.update((all) => [...all, { ...source, id, owningGroupId, items: [] }])
			for (const item of source.items) {
				const copy = addItem(id, item.name, thumbnails.get(item.id))
				contents.set(copy.id, contents.get(item.id)!)
			}
			return Response.json({ id })
		}
		match = url.match(/^\/api\/app\/collection-items\/([^/]+)\/(content|thumbnail)$/)
		if (match) {
			const stored = match[2] === 'content' ? contents.get(match[1]) : thumbnails.get(match[1])
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
		getCollectionRows: () => rows.get(),
		msg: (message: { defaultMessage: string }) => message.defaultMessage,
	} as unknown as TldrawApp

	return { app, rows, contents, fetch: fetchSpy, getToken: async () => 'token' }
}
