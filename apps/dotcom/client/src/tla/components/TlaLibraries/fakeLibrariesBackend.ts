import type { TlaLibrary, TlaLibraryItem, TlaLibraryItemThumbnail } from '@tldraw/dotcom-shared'
import { atom, uniqueId } from 'tldraw'
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
 * Stands in for what TldrawAppLibrariesSource talks to: the app's libraries query and
 * mutators, and the sync worker's routes behind `fetch`. Rows change at once, as Zero applies a
 * mutation locally. Stored content is kept in a map, and thumbnails at made-up public URLs.
 *
 * A test can hold the server's confirmation of mutations (`holdServer`, failing it rolls the
 * mutations back), the worker's answers (`holdRequests`, failing them answers 500) and the arrival
 * of rows the worker inserts (`holdItemRows`).
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

	let serverHold: ReturnType<typeof createHold> | undefined
	let requestHold: ReturnType<typeof createHold> | undefined
	let rowHold: ReturnType<typeof createHold> | undefined
	const showMutationRejectionToast = vi.fn()

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
							name: name.trim(),
							owningGroupId,
							meta,
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
				change(() => rows.update((all) => all.filter((row) => row.id !== id))),
			move: ({ id, owningGroupId }: any) => {
				if (!isMember(owningGroupId)) return rejected()
				return change(() => updateRow(id, (row) => ({ ...row, owningGroupId })))
			},
		},
		library_item: {
			rename: ({ id, name }: any) => change(() => updateItem(id, (item) => ({ ...item, name }))),
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

	const addItem = (
		id: string,
		libraryId: string,
		name: string | null,
		thumbnail: TlaLibraryItemThumbnail | null
	) => {
		const item: TlaLibraryItem = {
			id,
			libraryId,
			name,
			thumbnail,
			createdBy: userId,
			createdAt: Date.now(),
			updatedAt: Date.now(),
		}
		const insert = () => updateRow(libraryId, (row) => ({ ...row, items: [...row.items, item] }))
		if (rowHold) rowHold.passes.then(insert)
		else insert()
		return item
	}

	const routes = async (url: string, init: RequestInit = {}): Promise<Response> => {
		if (requestHold && !(await requestHold.passes)) return new Response(null, { status: 500 })
		let match = url.match(/^\/api\/app\/libraries\/([^/]+)\/items$/)
		if (match && init.method === 'POST') {
			const form = init.body as FormData
			const id = form.get('id')
			if (typeof id !== 'string') return new Response(null, { status: 400 })
			const item = addItem(
				id,
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
					uniqueId(),
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
		showMutationRejectionToast,
	} as unknown as TldrawApp

	return {
		app,
		rows,
		contents,
		fetch: fetchSpy,
		getToken: async () => 'token',
		showMutationRejectionToast,
		holdServer: () => (serverHold = createHold()),
		holdRequests: () => (requestHold = createHold()),
		holdItemRows: () => (rowHold = createHold()),
	}
}
