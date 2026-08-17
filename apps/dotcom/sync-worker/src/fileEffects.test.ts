import { TlaEffectOutbox, TlaFile } from '@tldraw/dotcom-shared'
import { describe, expect, it } from 'vitest'
import { FileEffectDeps, getPublishTransition, processFileEffect } from './fileEffects'

function file(partial: Partial<TlaFile>): TlaFile {
	return {
		id: 'f1',
		name: 'file',
		ownerId: 'u1',
		ownerName: '',
		ownerAvatar: '',
		thumbnail: '',
		shared: true,
		sharedLinkType: 'edit',
		published: false,
		lastPublished: 0,
		publishedSlug: 'slug-1',
		createdAt: 0,
		updatedAt: 0,
		isEmpty: false,
		isDeleted: false,
		createSource: null,
		owningGroupId: null,
		...partial,
	}
}

describe('getPublishTransition', () => {
	it('returns null for inserts and deletes', () => {
		expect(
			getPublishTransition({
				command: 'insert',
				payload: file({ published: true }),
				prevPayload: null,
			})
		).toBe(null)
		expect(
			getPublishTransition({
				command: 'delete',
				payload: file({ published: true }),
				prevPayload: null,
			})
		).toBe(null)
	})

	it('returns publish when file becomes published', () => {
		expect(
			getPublishTransition({
				command: 'update',
				payload: file({ published: true, lastPublished: 100 }),
				prevPayload: file({ published: false, lastPublished: 0 }),
			})
		).toBe('publish')
	})

	it('returns publish when file is republished with newer timestamp', () => {
		expect(
			getPublishTransition({
				command: 'update',
				payload: file({ published: true, lastPublished: 200 }),
				prevPayload: file({ published: true, lastPublished: 100 }),
			})
		).toBe('publish')
	})

	it('returns null when file remains published with same timestamp', () => {
		expect(
			getPublishTransition({
				command: 'update',
				payload: file({ published: true, lastPublished: 100 }),
				prevPayload: file({ published: true, lastPublished: 100 }),
			})
		).toBe(null)
	})

	it('returns unpublish when file becomes unpublished', () => {
		expect(
			getPublishTransition({
				command: 'update',
				payload: file({ published: false, lastPublished: 100 }),
				prevPayload: file({ published: true, lastPublished: 100 }),
			})
		).toBe('unpublish')
	})

	it('returns null for a plain update with no publication change', () => {
		expect(
			getPublishTransition({
				command: 'update',
				payload: file({ name: 'renamed' }),
				prevPayload: file({}),
			})
		).toBe(null)
	})
})

function effectRow(partial: Partial<TlaEffectOutbox>): TlaEffectOutbox {
	return {
		id: 1,
		tableName: 'file',
		entityId: 'f1',
		command: 'update',
		payload: file({}),
		prevPayload: null,
		attempts: 0,
		createdAt: new Date(0),
		nextRetryAt: null,
		...partial,
	}
}

function makeFileDeps(current: Record<string, TlaFile | undefined>): FileEffectDeps & {
	calls: string[]
} {
	const calls: string[] = []
	return {
		calls,
		getCurrentFile: async (fileId) => current[fileId],
		notifyInsert: async (f) => {
			calls.push(`insert:${f.id}`)
		},
		notifyUpdate: async (f) => {
			calls.push(`update:${f.id}`)
		},
		notifyDelete: async (f) => {
			calls.push(`delete:${f.id}`)
		},
		publish: async (f) => {
			calls.push(`publish:${f.id}`)
		},
		unpublish: async (f) => {
			calls.push(`unpublish:${f.id}`)
		},
	}
}

describe('processFileEffect', () => {
	it('skips insert/update effects when the file no longer exists (staleness guard)', async () => {
		const deps = makeFileDeps({})
		await processFileEffect(deps, effectRow({ command: 'insert' }))
		await processFileEffect(deps, effectRow({ command: 'update' }))
		expect(deps.calls).toEqual([])
	})

	it('delete command uses the outbox payload, not current state', async () => {
		const deps = makeFileDeps({})
		await processFileEffect(deps, effectRow({ command: 'delete', payload: file({ id: 'f1' }) }))
		expect(deps.calls).toEqual(['delete:f1'])
	})

	it('notifies with the freshly-read row, not the outbox payload', async () => {
		const current = file({ id: 'f1', name: 'newest' })
		const deps = makeFileDeps({ f1: current })
		await processFileEffect(
			deps,
			effectRow({
				command: 'update',
				payload: file({ id: 'f1', name: 'stale' }),
				prevPayload: file({ id: 'f1' }),
			})
		)
		expect(deps.calls).toEqual(['update:f1'])
	})

	it('publishes only when current state still matches the transition', async () => {
		const published = file({ id: 'f1', published: true, lastPublished: 100 })
		const deps = makeFileDeps({ f1: published })
		await processFileEffect(
			deps,
			effectRow({
				command: 'update',
				payload: published,
				prevPayload: file({ id: 'f1', published: false, lastPublished: 0 }),
			})
		)
		expect(deps.calls).toEqual(['update:f1', 'publish:f1'])
	})

	it('skips a stale publish superseded by a newer publish (flapping collapses)', async () => {
		const current = file({ id: 'f1', published: true, lastPublished: 500 })
		const deps = makeFileDeps({ f1: current })
		await processFileEffect(
			deps,
			effectRow({
				command: 'update',
				payload: file({ id: 'f1', published: true, lastPublished: 100 }),
				prevPayload: file({ id: 'f1', published: false, lastPublished: 0 }),
			})
		)
		expect(deps.calls).toEqual(['update:f1'])
	})

	it('skips a stale unpublish when the file is currently published', async () => {
		const current = file({ id: 'f1', published: true, lastPublished: 500 })
		const deps = makeFileDeps({ f1: current })
		await processFileEffect(
			deps,
			effectRow({
				command: 'update',
				payload: file({ id: 'f1', published: false, lastPublished: 100 }),
				prevPayload: file({ id: 'f1', published: true, lastPublished: 100 }),
			})
		)
		expect(deps.calls).toEqual(['update:f1'])
	})
})

describe('processFileEffect on trashed files', () => {
	it('still notifies update but skips publish when current file is soft-deleted', async () => {
		const current = file({ id: 'f1', published: true, lastPublished: 100, isDeleted: true })
		const deps = makeFileDeps({ f1: current })
		await processFileEffect(
			deps,
			effectRow({
				id: 1,
				command: 'update',
				payload: file({ id: 'f1', published: true, lastPublished: 100, isDeleted: true }),
				prevPayload: file({ id: 'f1', published: false, lastPublished: 0 }),
			})
		)
		expect(deps.calls).toEqual(['update:f1'])
	})

	it('still unpublishes when current file is soft-deleted', async () => {
		const current = file({ id: 'f1', published: false, isDeleted: true })
		const deps = makeFileDeps({ f1: current })
		await processFileEffect(
			deps,
			effectRow({
				id: 2,
				command: 'update',
				payload: file({ id: 'f1', published: false, isDeleted: true }),
				prevPayload: file({ id: 'f1', published: true, lastPublished: 100 }),
			})
		)
		expect(deps.calls).toEqual(['update:f1', 'unpublish:f1'])
	})
})
