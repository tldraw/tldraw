import {
	libraryName,
	type TlaFileLibrary,
	type TlaLibrary,
	type TlaLibraryItem,
	type TlaLibraryItemThumbnail,
} from '@tldraw/dotcom-shared'
import type { JsonObject } from '@tldraw/utils'
import { atom, computed } from 'tldraw'
import { vi } from 'vitest'
import type { TldrawApp } from '../../app/TldrawApp'

type Row = TlaLibrary & { items: TlaLibraryItem[] }

/** A promise each request or mutation waits on while a test holds it, until it's let through. */
function createHold() {
	let open: (passes: boolean) => void = () => {}
	const passes = new Promise<boolean>((resolve) => {
		open = resolve
	})
	return { passes, release: () => open(true), fail: () => open(false) }
}

/**
 * Stands in for what TldrawAppLibrariesSource and TldrawAppFileLibrariesSource talk to: the app's
 * libraries query, a file's fileLibraries query and the mutators, and the sync worker's routes
 * behind `fetch`. Rows change at once, as Zero applies a mutation locally. Stored content is kept
 * in a map, and thumbnails at made-up public URLs. `otherRows` are libraries of workspaces the user
 * isn't in, seen only when added to a file; the user can edit every file but `readOnlyFiles`.
 *
 * A test can hold the server's confirmation of mutations (`holdServer`, failing it rolls the
 * mutations back), the worker's answers (`holdRequests`, failing them answers 500) and the arrival
 * of rows the worker inserts (`holdWorkerRows`).
 */
export function createFakeLibrariesBackend({
	userId = 'user_me',
	workspaces = [{ id: 'acme', name: 'Acme' }],
}: { userId?: string; workspaces?: { id: string; name: string }[] } = {}) {
	const rows = atom<Row[]>('fake library rows', [])
	const otherRows = atom<Row[]>('fake library rows of other workspaces', [])
	const fileLibraries = atom<TlaFileLibrary[]>('fake file libraries', [])
	const readOnlyFiles = new Set<string>()
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

	let serverHold: ReturnType<typeof createHold> | undefined
	let requestHold: ReturnType<typeof createHold> | undefined
	let rowHold: ReturnType<typeof createHold> | undefined
	const showMutationRejectionToast = vi.fn()
	const trackEvent = vi.fn()

	const done = (rollback: () => void) => {
		const forbidden = { type: 'error', error: { type: 'app', message: 'forbidden' } }
		const server = serverHold
			? serverHold.passes.then((passes) => {
					if (passes) return { type: 'success' }
					rollback()
					return forbidden
				})
			: Promise.resolve({ type: 'success' })
		return { client: Promise.resolve({ type: 'success' }), server }
	}
	const rejected = () => {
		const result = Promise.resolve({ type: 'error', error: { type: 'app', message: 'forbidden' } })
		return { client: result, server: result }
	}
	// Applies a mutation locally, as Zero does, to be rolled back if the server rejects it.
	const change = (apply: () => void) => {
		const before = rows.get()
		apply()
		return done(() => rows.set(before))
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
				return change(() =>
					rows.update((all) => [
						...all,
						{
							id,
							name: libraryName(name),
							owningGroupId,
							meta,
							isDefault: false,
							createdBy: userId,
							createdAt: all.length,
							updatedAt: 0,
							items: [],
						},
					])
				)
			},
			rename: ({ id, name }: any) => change(() => updateRow(id, (row) => ({ ...row, name }))),
			delete: ({ id }: any) =>
				change(() => {
					rows.update((all) => all.filter((row) => row.id !== id))
					fileLibraries.update((all) => all.filter((fl) => fl.libraryId !== id))
				}),
			ensureDefault: ({ id, name }: any) => {
				if (rows.get().some((row) => row.isDefault && row.owningGroupId === userId)) {
					return change(() => {})
				}
				return change(() =>
					rows.update((all) => [
						...all,
						{
							id,
							name,
							owningGroupId: userId,
							meta: {},
							isDefault: true,
							createdBy: userId,
							createdAt: all.length,
							updatedAt: 0,
							items: [],
						},
					])
				)
			},
			move: ({ id, owningGroupId }: any) => {
				if (!isMember(owningGroupId)) return rejected()
				return change(() => updateRow(id, (row) => ({ ...row, owningGroupId })))
			},
		},
		file_library: {
			add: ({ fileId, libraryId }: any) => {
				if (readOnlyFiles.has(fileId) || !rows.get().some((row) => row.id === libraryId)) {
					return rejected()
				}
				if (fileLibraries.get().some((fl) => fl.fileId === fileId && fl.libraryId === libraryId)) {
					return change(() => {})
				}
				return change(() =>
					fileLibraries.update((all) => [
						...all,
						{ fileId, libraryId, addedBy: userId, addedAt: Date.now() },
					])
				)
			},
			remove: ({ fileId, libraryId }: any) => {
				if (readOnlyFiles.has(fileId)) return rejected()
				return change(() =>
					fileLibraries.update((all) =>
						all.filter((fl) => !(fl.fileId === fileId && fl.libraryId === libraryId))
					)
				)
			},
		},
		library_item: {
			update: ({ id, name, meta }: any) =>
				change(() =>
					updateItem(id, (item) => ({
						...item,
						...(name === undefined ? {} : { name }),
						...(meta === undefined ? {} : { meta: { ...item.meta, ...meta } }),
					}))
				),
			delete: ({ id }: any) =>
				change(() =>
					rows.update((all) =>
						all.map((row) => ({ ...row, items: row.items.filter((i) => i.id !== id) }))
					)
				),
			move: ({ id, libraryId }: any) => {
				const item = rows
					.get()
					.flatMap((row) => row.items)
					.find((i) => i.id === id)!
				return change(() =>
					rows.update((all) =>
						all.map((row) => ({
							...row,
							items:
								row.id === libraryId
									? [...row.items, { ...item, libraryId }]
									: row.items.filter((i) => i.id !== id),
						}))
					)
				)
			},
		},
	}

	const newItem = (
		id: string,
		libraryId: string,
		name: string | null,
		thumbnail: TlaLibraryItemThumbnail | null,
		meta: JsonObject
	): TlaLibraryItem => ({
		id,
		libraryId,
		name,
		thumbnail,
		createdBy: userId,
		createdAt: Date.now(),
		updatedAt: Date.now(),
		meta,
	})
	const insertRows = (insert: () => void) => {
		if (rowHold) rowHold.passes.then(insert)
		else insert()
	}

	const routes = async (url: string, init: RequestInit = {}): Promise<Response> => {
		if (requestHold && !(await requestHold.passes)) return new Response(null, { status: 500 })
		let match = url.match(/^\/api\/app\/libraries\/([^/]+)\/items$/)
		if (match && init.method === 'POST') {
			const form = init.body as FormData
			const listed: { id: string; name?: string }[] = JSON.parse(form.get('items') as string)
			const libraryId = match[1]
			const now = Date.now()
			const items = listed.map(({ id, name }, index) => ({
				...newItem(
					id,
					libraryId,
					name ?? null,
					newThumbnail(
						form.get(`thumbnail:${id}`) instanceof Blob,
						form.get(`darkThumbnail:${id}`) instanceof Blob
					),
					JSON.parse((form.get(`meta:${id}`) as string | null) ?? '{}')
				),
				createdAt: now + index,
			}))
			insertRows(() => updateRow(libraryId, (row) => ({ ...row, items: [...row.items, ...items] })))
			for (const item of items) contents.set(item.id, form.get(`content:${item.id}`) as string)
			return Response.json({
				items: items.map(({ id, createdAt, thumbnail }) => ({ id, createdAt, thumbnail })),
			})
		}
		match = url.match(/^\/api\/app\/libraries\/([^/]+)\/copy$/)
		if (match && init.method === 'POST') {
			const { owningGroupId, id, itemIds } = JSON.parse(init.body as string)
			const source = rows.get().find((row) => row.id === match![1])!
			const items = source.items.flatMap((item) => {
				const copyId: string | undefined = itemIds[item.id]
				if (!copyId) return []
				const { thumbnail } = item
				contents.set(copyId, contents.get(item.id)!)
				return [
					newItem(
						copyId,
						id,
						item.name,
						newThumbnail(thumbnail !== null, typeof thumbnail === 'object' && thumbnail !== null),
						item.meta
					),
				]
			})
			insertRows(() =>
				rows.update((all) => [
					...all,
					{ ...source, id, owningGroupId, isDefault: false, createdAt: all.length, items },
				])
			)
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

	const watchFileLibraries = vi.fn((fileId: string) => ({
		rows: computed(`fake file libraries ${fileId}`, () => {
			const added = fileLibraries.get().filter((fl) => fl.fileId === fileId)
			return [...rows.get(), ...otherRows.get()].flatMap((row) => {
				const own = added.filter((fl) => fl.libraryId === row.id)
				const isMyDefault = row.isDefault && row.owningGroupId === userId
				return isMyDefault || own.length > 0 ? [{ ...row, fileLibraries: own }] : []
			})
		}),
		stop: vi.fn(),
	}))

	const toasts = { addToast: vi.fn() }
	const app = {
		userId,
		toasts,
		z: { mutate },
		getHomeWorkspaceId: () => userId,
		getWorkspaceMemberships: () => memberships,
		getWorkspaceMembership: (id: string) => memberships.find((m) => m.groupId === id),
		getLibraryRows: () => rows.get(),
		watchFileLibraries,
		canUpdateFile: (fileId: string) => !readOnlyFiles.has(fileId),
		msg: (message: { defaultMessage: string }) => message.defaultMessage,
		showMutationRejectionToast,
		trackEvent,
	} as unknown as TldrawApp

	return {
		app,
		rows,
		otherRows,
		fileLibraries,
		readOnlyFiles,
		watchFileLibraries,
		contents,
		fetch: fetchSpy,
		getToken: async () => 'token',
		showMutationRejectionToast,
		trackEvent,
		toasts,
		holdServer: () => (serverHold = createHold()),
		holdRequests: () => (requestHold = createHold()),
		holdWorkerRows: () => (rowHold = createHold()),
	}
}
