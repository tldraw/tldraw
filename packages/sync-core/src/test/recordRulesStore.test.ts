import { Store } from '@tldraw/store'
import { createTLSchema, TLDOCUMENT_ID } from '@tldraw/tlschema'
import { registerRecordRules } from '../lib/recordRules'

it('stops with a clear error when client rules cancel a record that the store needs', () => {
	const store = new Store<any, any>({
		schema: createTLSchema() as any,
		props: { defaultName: '', assets: {} as any, onMount: () => {} },
	})
	registerRecordRules(
		store,
		{
			authorizeRecord: {
				document: ({ session, next, prev }: any) => (session.meta.owner ? (next ?? prev) : null),
			} as any,
		},
		() => ({ sessionId: 's', isReadonly: false, meta: { owner: false } })
	)
	let err: any
	try {
		store.ensureStoreIsUsable()
	} catch (e) {
		err = e
	}
	expect(String(err)).toMatch(/cannot be made usable/)
	expect(store.has(TLDOCUMENT_ID)).toBe(false)
})
