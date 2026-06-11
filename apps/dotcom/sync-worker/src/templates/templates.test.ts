import { NEW_WORKSPACE_TEMPLATE_ID } from '@tldraw/dotcom-shared'
import { createTLSchema } from '@tldraw/tlschema'
import { describe, expect, it } from 'vitest'
import { getTemplateSnapshot } from './index'
import { newWorkspaceTemplateSnapshot } from './newWorkspace'

describe('getTemplateSnapshot', () => {
	it('resolves the new-workspace template', () => {
		expect(getTemplateSnapshot(NEW_WORKSPACE_TEMPLATE_ID)).toBe(newWorkspaceTemplateSnapshot)
	})

	it('returns null for unknown template ids', () => {
		expect(getTemplateSnapshot('not-a-template')).toBeNull()
	})
})

describe('newWorkspaceTemplateSnapshot', () => {
	// The template's records were exported under the schema version current at export time.
	// They must keep migrating and validating under whatever schema the repo is on now,
	// since that is exactly what happens when the snapshot is loaded into a room.
	it('migrates and validates under the current schema', () => {
		const schema = createTLSchema()
		expect(newWorkspaceTemplateSnapshot.documents.length).toBeGreaterThan(0)
		for (const { state } of newWorkspaceTemplateSnapshot.documents) {
			const migrated = schema.migratePersistedRecord(
				state as any,
				newWorkspaceTemplateSnapshot.schema!,
				'up'
			)
			expect(migrated, `record ${state.id} should migrate`).toMatchObject({ type: 'success' })
			if (migrated.type === 'success') {
				expect(() => schema.types[migrated.value.typeName].validate(migrated.value)).not.toThrow()
			}
		}
	})

	it('has a single page with all shapes on it', () => {
		const records = newWorkspaceTemplateSnapshot.documents.map((d) => d.state)
		const documents = records.filter((r) => r.typeName === 'document')
		const pages = records.filter((r) => r.typeName === 'page')
		const shapes = records.filter((r) => r.typeName === 'shape')
		expect(documents).toHaveLength(1)
		expect(pages).toHaveLength(1)
		expect(shapes.length).toBeGreaterThan(0)
		for (const shape of shapes) {
			expect((shape as any).parentId).toBe(pages[0].id)
		}
	})

	// Templates are stamped into every user's new workspace, so they must not carry the
	// authoring user's identity (see the regeneration notes in newWorkspace.ts).
	it('contains no authoring user identity', () => {
		const records = newWorkspaceTemplateSnapshot.documents.map((d) => d.state)
		expect(records.filter((r) => r.typeName === 'user')).toHaveLength(0)
		for (const record of records) {
			const props = (record as any).props
			if (props && 'textFirstEditedBy' in props) {
				expect(props.textFirstEditedBy, `${record.id} textFirstEditedBy`).toBeNull()
			}
		}
	})
})
