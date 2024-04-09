import { openDB } from 'idb'
import { Editor, LegacyTldrawDocument, buildFromV1Document } from 'tldraw'

export function isEditorEmpty(editor: Editor) {
	const hasAnyShapes = editor.store.allRecords().some((r) => r.typeName === 'shape')
	return !hasAnyShapes
}

export async function findV1ContentFromIdb(): Promise<{
	document: LegacyTldrawDocument
	clear: () => Promise<void>
} | null> {
	try {
		const db = await openDB('keyval-store', 1)
		const tx = db.transaction('keyval', 'readonly')
		const store = tx.objectStore('keyval')

		const home: unknown = await store.get('home')
		await tx.done

		if (
			home &&
			typeof home === 'object' &&
			'document' in home &&
			home.document &&
			typeof home.document === 'object' &&
			'version' in home.document &&
			typeof home.document.version === 'number'
		) {
			return {
				document: home.document as LegacyTldrawDocument,
				clear: async () => {
					try {
						const tx = db.transaction('keyval', 'readwrite')
						const store = tx.objectStore('keyval')
						store.delete('home')
						await tx.done
						return
					} catch {
						// eh
					}
				},
			}
		}

		return null
	} catch {
		return null
	}
}

export async function importFromV1LocalRoom(
	editor: Editor,
	didCancel: () => boolean
): Promise<{ didImport: false } | { didImport: true; document: LegacyTldrawDocument }> {
	const v1Doc = await findV1ContentFromIdb()
	if (didCancel() || !v1Doc) return { didImport: false }

	const hasAnyShapes = Object.values(v1Doc.document.pages).some(
		(page) => Object.values(page.shapes).length > 0
	)
	if (!hasAnyShapes) return { didImport: false }

	buildFromV1Document(editor, v1Doc.document)
	v1Doc.clear()

	if (isEditorEmpty(editor)) {
		return { didImport: false }
	}

	return { didImport: true, document: v1Doc.document }
}

export async function importFromV1MultiplayerRoom(
	editor: Editor,
	roomSlug: string,
	didCancel: () => boolean
): Promise<{ didImport: false } | { didImport: true; document: LegacyTldrawDocument }> {
	const response = await fetch(`/api/static-legacy-multiplayer?roomSlug=${roomSlug}`)
	if (!response.ok || didCancel()) {
		return { didImport: false }
	}

	const data = await response.json()
	if (!data.room || didCancel()) {
		return { didImport: false }
	}

	// TODO: handle weird data formats (TLD-1605) & v1 migrations (TLD-1638)
	const { assets, bindings, shapes, version } = data.room.storage.data
	const PAGE_ID = 'page'
	const document: LegacyTldrawDocument = {
		id: 'doc',
		name: roomSlug,
		version,
		pages: {
			[PAGE_ID]: {
				id: PAGE_ID,
				name: 'Page 1',
				childIndex: 1,
				shapes: shapes?.data,
				bindings: bindings?.data,
			},
		},
		pageStates: {
			[PAGE_ID]: {
				id: PAGE_ID,
				selectedIds: [],
				camera: { point: [0, 0], zoom: 1 },
			},
		},
		assets: assets?.data ?? {},
	}
	buildFromV1Document(editor, document)

	if (isEditorEmpty(editor)) return { didImport: false }
	return { didImport: true, document }
}
