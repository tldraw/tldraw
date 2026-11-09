import type { TLEditorOptions } from '@tldraw/editor'
import { createShapeId, PageRecordType, type TLRecord } from '@tldraw/tlschema'
import { describe, expect, it } from 'vitest'
import { canWrite, canWriteOnClient, type TLCanWriteChecks } from './canWrite'

interface SessionMeta {
	userId: string
}

// One rule set, as an app would share it between the server and the client
const checks: TLCanWriteChecks<TLRecord, SessionMeta> = {
	shape: ({ session, prev, next }) => (next ?? prev).meta.ownerId === session.meta.userId,
	page: ({ type }) => type !== 'delete',
}

const shape = (ownerId: string) =>
	({
		id: createShapeId('a'),
		typeName: 'shape',
		type: 'geo',
		meta: { ownerId },
	}) as unknown as TLRecord
const page = PageRecordType.create({ name: 'Page', index: 'a1' as any })
const get = () => undefined
const session = { sessionId: 's', isReadonly: false, meta: { userId: 'ana' } }

describe('canWriteOnClient', () => {
	const client = canWriteOnClient(checks, () => session)
	const server = canWrite(checks)

	it('gives the same answers as the server hooks for the same checks', () => {
		const writes = [
			{ type: 'create', prev: null, next: shape('ana') },
			{ type: 'create', prev: null, next: shape('bob') },
			{ type: 'update', prev: shape('ana'), next: shape('bob') },
			{ type: 'delete', prev: shape('bob'), next: null },
			{ type: 'delete', prev: page, next: null },
			{ type: 'update', prev: page, next: { ...page, name: 'Renamed' } },
		] as const
		for (const write of writes) {
			const typeName = (write.next ?? write.prev).typeName as 'shape' | 'page'
			const hook = server[typeName]! as any
			const serverAllows = hook({ ...write, get, session }) === undefined
			expect(client({ ...write, get } as any)).toBe(serverAllows)
		}
	})

	it('allows record types that have no check, as the server does', () => {
		const camera = { id: 'camera:x', typeName: 'camera' } as unknown as TLRecord
		expect(client({ type: 'create', prev: null, next: camera, get } as any)).toBe(true)
	})

	it('blocks a write when a check returns something other than true', () => {
		const loose = canWriteOnClient<TLRecord, SessionMeta>(
			{ shape: (() => 'yes') as any },
			() => session
		)
		expect(loose({ type: 'create', prev: null, next: shape('ana'), get } as any)).toBe(false)
	})

	it('reads the session each time, so a role change takes effect', () => {
		let userId = 'ana'
		const reactive = canWriteOnClient(checks, () => ({ ...session, meta: { userId } }))
		const write = { type: 'create', prev: null, next: shape('bob'), get } as const
		expect(reactive(write as any)).toBe(false)
		userId = 'bob'
		expect(reactive(write as any)).toBe(true)
	})

	it('fits the editor canWrite option', () => {
		const option: TLEditorOptions['canWrite'] = client
		expect(option).toBe(client)
	})
})
