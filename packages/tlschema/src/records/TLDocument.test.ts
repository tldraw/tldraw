import { describe, expect, it } from 'vitest'
import { documentMigrations, documentVersions, TLDOCUMENT_ID } from './TLDocument'

describe('documentMigrations', () => {
	it('should apply AddName migration correctly', () => {
		const addNameMigration = documentMigrations.sequence.find(
			(m) => m.id === documentVersions.AddName
		)!

		const oldRecord: any = {
			typeName: 'document',
			id: TLDOCUMENT_ID,
			gridSize: 10,
		}

		addNameMigration.up(oldRecord)
		expect(oldRecord.name).toBe('')
	})

	it('should apply AddMeta migration correctly', () => {
		const addMetaMigration = documentMigrations.sequence.find(
			(m) => m.id === documentVersions.AddMeta
		)!

		const oldRecord: any = {
			typeName: 'document',
			id: TLDOCUMENT_ID,
			gridSize: 10,
			name: 'Test',
		}

		addMetaMigration.up(oldRecord)
		expect(oldRecord.meta).toEqual({})
	})
})
