import { Store } from '@tldraw/store'
import { createTLSchema } from '../../createTLSchema'

export const testSchema = createTLSchema({})

export function getTestStore() {
	const store = new Store({ schema: testSchema, props: { defaultName: '' } })

	store.ensureStoreIsUsable()
	return store
}
