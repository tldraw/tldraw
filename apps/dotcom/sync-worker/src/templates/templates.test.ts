import { NEW_WORKSPACE_TEMPLATE_ID } from '@tldraw/dotcom-shared'
import { RoomSnapshot } from '@tldraw/sync-core'
import { createTLSchema } from '@tldraw/tlschema'
import { describe, expect, it } from 'vitest'
import { getSerializedTemplate } from './index'
import { newWorkspaceTemplateJson } from './newWorkspace'

describe('getSerializedTemplate', () => {
	it('resolves the new-workspace template', () => {
		expect(getSerializedTemplate(NEW_WORKSPACE_TEMPLATE_ID)).toBe(newWorkspaceTemplateJson)
	})

	// `createSource` values are client-controlled, so unknown ids include keys from the
	// object prototype chain, which must not resolve to truthy non-template values.
	it('returns null for unknown template ids', () => {
		expect(getSerializedTemplate('not-a-template')).toBeNull()
		expect(getSerializedTemplate('constructor')).toBeNull()
		expect(getSerializedTemplate('__proto__')).toBeNull()
	})
})

describe('newWorkspaceTemplateJson', () => {
	const snapshot = JSON.parse(newWorkspaceTemplateJson) as RoomSnapshot

	it('parses into a room snapshot', () => {
		expect(snapshot).toMatchObject({ documentClock: 0, tombstoneHistoryStartsAtClock: 0 })
		expect(snapshot.schema).toBeDefined()
		expect(Array.isArray(snapshot.documents)).toBe(true)
		for (const doc of snapshot.documents) {
			expect(doc).toMatchObject({ lastChangedClock: 0 })
			expect(doc.state.id).toBeDefined()
		}
	})

	// The template's records were exported under the schema version current at export time.
	// They must keep migrating and validating under whatever schema the repo is on now,
	// since that is exactly what happens when the snapshot is loaded into a room.
	it('migrates and validates under the current schema', () => {
		const schema = createTLSchema()
		expect(snapshot.documents.length).toBeGreaterThan(0)
		for (const { state } of snapshot.documents) {
			const migrated = schema.migratePersistedRecord(state as any, snapshot.schema!, 'up')
			expect(migrated, `record ${state.id} should migrate`).toMatchObject({ type: 'success' })
			if (migrated.type === 'success') {
				expect(() => schema.types[migrated.value.typeName].validate(migrated.value)).not.toThrow()
			}
		}
	})

	it('parents every shape to the single page through groups, without cycles', () => {
		const records = snapshot.documents.map((d) => d.state)
		const documents = records.filter((r) => r.typeName === 'document')
		const pages = records.filter((r) => r.typeName === 'page')
		const shapes = records.filter((r) => r.typeName === 'shape') as any[]
		expect(documents).toHaveLength(1)
		expect(pages).toHaveLength(1)
		expect(shapes.length).toBeGreaterThan(0)
		const shapesById = new Map(shapes.map((s) => [s.id, s]))
		for (const shape of shapes) {
			// walk the parent chain to the page; intermediate parents must be group shapes
			const visited = new Set<string>([shape.id])
			let current = shape
			while (current.parentId !== pages[0].id) {
				expect(visited.has(current.parentId), `${shape.id} parent chain has no cycle`).toBe(false)
				visited.add(current.parentId)
				const parent = shapesById.get(current.parentId)
				expect(parent, `${shape.id} ancestor ${current.parentId} exists`).toBeDefined()
				expect(parent.type, `${shape.id} ancestor ${parent.id} is a group`).toBe('group')
				current = parent
			}
		}
	})

	// New files open at the default camera (there is no zoom-to-fit on first visit), so the
	// canvas content must sit near the origin and fit a typical editor viewport. Record x/y
	// is a coarse proxy for shape bounds, but it catches a re-export from the wrong part of
	// a canvas, which would present new users with an apparently empty file.
	it('keeps content near the origin so the default camera shows it', () => {
		const records = snapshot.documents.map((d) => d.state)
		const pageId = records.find((r) => r.typeName === 'page')!.id
		const topLevelShapes = records.filter(
			(r) => r.typeName === 'shape' && (r as any).parentId === pageId
		) as any[]
		expect(topLevelShapes.length).toBeGreaterThan(0)
		for (const shape of topLevelShapes) {
			expect(shape.x, `${shape.id} x within the first viewport`).toBeGreaterThan(-100)
			expect(shape.x, `${shape.id} x within the first viewport`).toBeLessThan(1300)
			expect(shape.y, `${shape.id} y within the first viewport`).toBeGreaterThan(-100)
			expect(shape.y, `${shape.id} y within the first viewport`).toBeLessThan(900)
		}
	})

	// Templates are stamped into every user's new workspace, so they must not carry the
	// authoring user's identity (see the regeneration notes in newWorkspace.ts).
	it('contains no authoring user identity', () => {
		const records = snapshot.documents.map((d) => d.state)
		expect(records.filter((r) => r.typeName === 'user')).toHaveLength(0)
		for (const record of records) {
			const props = (record as any).props
			if (props && 'textFirstEditedBy' in props) {
				expect(props.textFirstEditedBy, `${record.id} textFirstEditedBy`).toBeNull()
			}
		}
	})
})
