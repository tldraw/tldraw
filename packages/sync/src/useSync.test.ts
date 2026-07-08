import {
	MigrationSequence,
	TLAnyBindingUtilConstructor,
	TLAnyShapeUtilConstructor,
	TldrawPlugin,
} from 'tldraw'
import { describe, expect, it } from 'vitest'
import {
	TLSyncSchemaPlugin,
	mergePluginBindingUtils,
	mergePluginMigrations,
	mergePluginShapeUtils,
} from './useSync'

// Minimal shape-util stand-ins: only `.type` matters for the merge logic under test.
function fakeShapeUtil(type: string): TLAnyShapeUtilConstructor {
	return { type } as unknown as TLAnyShapeUtilConstructor
}

function fakeBindingUtil(type: string): TLAnyBindingUtilConstructor {
	return { type } as unknown as TLAnyBindingUtilConstructor
}

function fakeMigrations(sequenceId: string): MigrationSequence {
	return { sequenceId, retroactive: false, sequence: [] }
}

describe('mergePluginShapeUtils', () => {
	it('returns the user shapeUtils unchanged when there are no plugins', () => {
		const user = [fakeShapeUtil('sticky')]
		expect(mergePluginShapeUtils(undefined, user)).toBe(user)
		expect(mergePluginShapeUtils([], user)).toBe(user)
	})

	it('returns undefined when neither plugins nor user provide shapeUtils', () => {
		expect(mergePluginShapeUtils(undefined, undefined)).toBeUndefined()
		expect(mergePluginShapeUtils([], undefined)).toBeUndefined()
	})

	it('collects shapeUtils from all plugins, in plugin order, when the user has none', () => {
		const commentPin = fakeShapeUtil('comment-pin')
		const annotation = fakeShapeUtil('annotation')
		const plugins: TLSyncSchemaPlugin[] = [
			{ id: 'comments', shapeUtils: [commentPin] },
			{ id: 'annotations', shapeUtils: [annotation] },
		]
		expect(mergePluginShapeUtils(plugins, undefined)).toEqual([commentPin, annotation])
	})

	it('appends user shapeUtils after plugin shapeUtils', () => {
		const commentPin = fakeShapeUtil('comment-pin')
		const userSticky = fakeShapeUtil('sticky')
		const plugins: TLSyncSchemaPlugin[] = [{ id: 'comments', shapeUtils: [commentPin] }]
		expect(mergePluginShapeUtils(plugins, [userSticky])).toEqual([commentPin, userSticky])
	})

	it("lets the user's shapeUtils win over a plugin's on a `type` collision", () => {
		const pluginPin = fakeShapeUtil('comment-pin')
		const userPin = fakeShapeUtil('comment-pin')
		const plugins: TLSyncSchemaPlugin[] = [{ id: 'comments', shapeUtils: [pluginPin] }]
		const result = mergePluginShapeUtils(plugins, [userPin])
		expect(result).toEqual([userPin])
		expect(result?.[0]).toBe(userPin)
	})

	it('ignores plugins with no shapeUtils', () => {
		const userSticky = fakeShapeUtil('sticky')
		const user = [userSticky]
		const plugins: TLSyncSchemaPlugin[] = [{ id: 'records-only' }]
		expect(mergePluginShapeUtils(plugins, user)).toBe(user)
	})
})

describe('mergePluginBindingUtils', () => {
	it('returns the user bindingUtils unchanged when there are no plugins', () => {
		const user = [fakeBindingUtil('sticky-tape')]
		expect(mergePluginBindingUtils(undefined, user)).toBe(user)
		expect(mergePluginBindingUtils([], user)).toBe(user)
	})

	it('returns undefined when neither plugins nor user provide bindingUtils', () => {
		expect(mergePluginBindingUtils(undefined, undefined)).toBeUndefined()
		expect(mergePluginBindingUtils([{ id: 'records-only' }], undefined)).toBeUndefined()
	})

	it('appends user bindingUtils after plugin bindingUtils, in plugin order', () => {
		const commentAnchor = fakeBindingUtil('comment-anchor')
		const annotationLink = fakeBindingUtil('annotation-link')
		const userTape = fakeBindingUtil('sticky-tape')
		const plugins: TLSyncSchemaPlugin[] = [
			{ id: 'comments', bindingUtils: [commentAnchor] },
			{ id: 'annotations', bindingUtils: [annotationLink] },
		]
		expect(mergePluginBindingUtils(plugins, [userTape])).toEqual([
			commentAnchor,
			annotationLink,
			userTape,
		])
	})

	it("lets the user's bindingUtils win over a plugin's on a `type` collision", () => {
		const pluginAnchor = fakeBindingUtil('comment-anchor')
		const userAnchor = fakeBindingUtil('comment-anchor')
		const plugins: TLSyncSchemaPlugin[] = [{ id: 'comments', bindingUtils: [pluginAnchor] }]
		const result = mergePluginBindingUtils(plugins, [userAnchor])
		expect(result).toEqual([userAnchor])
		expect(result?.[0]).toBe(userAnchor)
	})
})

describe('mergePluginMigrations', () => {
	it('returns the user migrations unchanged when there are no plugins', () => {
		const user = [fakeMigrations('app.custom')]
		expect(mergePluginMigrations(undefined, user)).toBe(user)
		expect(mergePluginMigrations([], user)).toBe(user)
	})

	it('returns undefined when neither plugins nor user provide migrations', () => {
		expect(mergePluginMigrations(undefined, undefined)).toBeUndefined()
		expect(mergePluginMigrations([{ id: 'records-only' }], undefined)).toBeUndefined()
	})

	it('puts plugin migrations first, in plugin order, followed by the user migrations', () => {
		const comments = fakeMigrations('tldraw.comments')
		const annotations = fakeMigrations('app.annotations')
		const user = fakeMigrations('app.custom')
		const plugins: TLSyncSchemaPlugin[] = [
			{ id: 'comments', migrations: [comments] },
			{ id: 'annotations', migrations: [annotations] },
		]
		expect(mergePluginMigrations(plugins, [user])).toEqual([comments, annotations, user])
	})
})

// Type-level assertion: `TldrawPlugin` (as passed to `<Tldraw plugins>`) must be assignable to
// the widened `TLSyncSchemaPlugin` option type, so the same plugin object can be passed to both
// `<Tldraw plugins>` and `useSync({ plugins })`.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function _assertTldrawPluginIsSyncSchemaPlugin(plugin: TldrawPlugin): TLSyncSchemaPlugin {
	return plugin
}
