import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { RoomSnapshot } from '@tldraw/sync-core'
import { createTLSchema } from '@tldraw/tlschema'
import { describe, expect, it } from 'vitest'
import { defaultWelcomeSnapshotJson } from './defaultWelcomeSnapshot'

const SNAPSHOT_FILE = fileURLToPath(new URL('./defaultWelcomeSnapshot.ts', import.meta.url))

describe('defaultWelcomeSnapshotJson', () => {
	const snapshot = JSON.parse(defaultWelcomeSnapshotJson) as RoomSnapshot

	it('parses into a room snapshot', () => {
		expect(snapshot).toMatchObject({ documentClock: 0, tombstoneHistoryStartsAtClock: 0 })
		expect(snapshot.schema).toBeDefined()
		expect(Array.isArray(snapshot.documents)).toBe(true)
		for (const doc of snapshot.documents) {
			expect(doc).toMatchObject({ lastChangedClock: 0 })
			expect(doc.state.id).toBeDefined()
		}
	})

	// The default is baked at the schema version current when it was exported, and is loaded
	// into a room verbatim. Rather than just check that it still migrates, keep the baked file
	// itself migrated up to head: this test migrates and revalidates every record, re-anchors
	// the stored schema, re-embeds the JSON into the literal, and asserts it matches the file
	// on disk. A schema change that touches these records fails this test; run `yarn test -u`
	// to re-bake defaultWelcomeSnapshot.ts (it rewrites only the literal, not the header).
	// Changing the default canvas content is a separate manual re-export — see the file header.
	it('defaultWelcomeSnapshot.ts is baked at the current schema (run `yarn test -u` to re-bake)', async () => {
		const schema = createTLSchema()
		expect(snapshot.documents.length).toBeGreaterThan(0)
		const documents = snapshot.documents.map(({ state, lastChangedClock }) => {
			const migrated = schema.migratePersistedRecord(state as any, snapshot.schema!, 'up')
			if (migrated.type !== 'success') throw new Error(`record ${state.id} failed to migrate`)
			schema.types[migrated.value.typeName].validate(migrated.value)
			return { state: migrated.value, lastChangedClock }
		})
		const rebaked = { ...snapshot, schema: schema.serialize(), documents }

		// embed the pretty-printed JSON back into the literal, escaped for ` and ${ }
		const json = JSON.stringify(rebaked, null, '\t')
			.replace(/\\/g, '\\\\')
			.replace(/`/g, '\\`')
			.replace(/\$\{/g, '\\${')
		const regenerated = readFileSync(SNAPSHOT_FILE, 'utf8').replace(
			/export const defaultWelcomeSnapshotJson = `[\s\S]*`\n?$/,
			'export const defaultWelcomeSnapshotJson = `' + json + '`\n'
		)
		await expect(regenerated).toMatchFileSnapshot(SNAPSHOT_FILE)
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

	// The default is stamped into every user's new workspace, so it must not carry the
	// authoring user's identity (see the regeneration notes in defaultWelcomeSnapshot.ts).
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
