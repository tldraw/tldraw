import { act } from 'react'
import { createRoot } from 'react-dom/client'
import {
	LibraryRecordType,
	EmbedShapeUtil,
	TLStoreSnapshot,
	TLStoreWithStatus,
	createTLStore,
	defaultBindingUtils,
	defaultShapeUtils,
} from 'tldraw'
import { describe, expect, it } from 'vitest'
import { useFileSnapshotStore } from './useFileSnapshotStore'

const embedShapeUtils = [EmbedShapeUtil.configure({ embedConfig: {} })]

function renderStore(snapshot: TLStoreSnapshot) {
	let result: TLStoreWithStatus | undefined
	function Harness() {
		result = useFileSnapshotStore(snapshot, embedShapeUtils)
		return null
	}
	const root = createRoot(document.createElement('div'))
	act(() => root.render(<Harness />))
	act(() => root.unmount())
	return result!
}

function snapshotWithLibrary() {
	const store = createTLStore({ shapeUtils: defaultShapeUtils, bindingUtils: defaultBindingUtils })
	const snapshot = store.getStoreSnapshot()
	const library = LibraryRecordType.create({ name: 'Wireframes' })
	return {
		library,
		snapshot: { ...snapshot, store: { ...snapshot.store, [library.id]: library } },
	}
}

describe('useFileSnapshotStore', () => {
	it('loads a snapshot that holds board libraries', () => {
		const { library, snapshot } = snapshotWithLibrary()
		const result = renderStore(snapshot)
		expect(result.status).toBe('not-synced')
		expect(result.store?.get(library.id as any)).toEqual(library)
	})

	it('turns a snapshot it cannot load into an error status', () => {
		const { snapshot } = snapshotWithLibrary()
		const result = renderStore({ ...snapshot, schema: { schemaVersion: 99 } as any })
		expect(result.status).toBe('error')
	})
})
