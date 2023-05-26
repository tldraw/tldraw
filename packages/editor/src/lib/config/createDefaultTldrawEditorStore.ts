import { TLInstanceId, TLRecord } from '@tldraw/tlschema'
import { StoreSnapshot } from '@tldraw/tlstore'
import { createDefaultTldrawEditorSchema } from './createDefaultTldrawEditorSchema'
import { createTldrawEditorStore } from './createTldrawEditorStore'

/**
 * Create a TldrawEditor store with a default schema.
 *
 * ```ts
 * createDefaultTldrawEditorStore()
 *
 * createDefaultTldrawEditorStore({
 *   instanceId: myInstanceId,
 *   initialData: myInitialData
 * })
 * ```
 * @public */
export function createDefaultTldrawEditorStore(
	opts = {} as {
		instanceId?: TLInstanceId
		initialData?: StoreSnapshot<TLRecord>
	}
) {
	return createTldrawEditorStore({
		schema: createDefaultTldrawEditorSchema(),
		...opts,
	})
}
