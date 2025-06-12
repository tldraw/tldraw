import { assert } from '@tldraw/utils'
import { unlinkSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { getResumeType } from './getResumeType'
import { migrate } from './replicatorMigrations'
import { ChangeV2 } from './replicatorTypes'
import { MockLogger, SqlStorageAdapter } from './test-helpers'

function createMockFileChange(fileId: string, ownerId: string, _lsn: string): ChangeV2 {
	const now = Date.now()
	return {
		event: {
			command: 'update',
			table: 'file',
		},
		row: {
			id: fileId,
			ownerId,
			name: `Test File ${fileId}`,
			ownerName: `Owner ${ownerId}`,
			ownerAvatar: 'avatar.png',
			thumbnail: 'thumb.png',
			shared: false,
			sharedLinkType: 'private',
			published: false,
			lastPublished: now,
			publishedSlug: `slug-${fileId}`,
			createdAt: now,
			updatedAt: now,
			isEmpty: false,
			isDeleted: false,
			createSource: 'test',
		},
		previous: {
			id: fileId,
			ownerId,
			name: `Test File ${fileId}`,
			ownerName: `Owner ${ownerId}`,
			ownerAvatar: 'avatar.png',
			thumbnail: 'thumb.png',
			shared: false,
			sharedLinkType: 'private',
			published: false,
			lastPublished: now,
			publishedSlug: `slug-${fileId}`,
			createdAt: now,
			updatedAt: now,
			isEmpty: false,
			isDeleted: false,
			createSource: 'test',
		},
		topics: [`user:${ownerId}`, `file:${fileId}`],
	}
}

describe('getResumeType', () => {
	let tempDbPath: string
	let db: DatabaseSync
	let sqlite: SqlStorageAdapter
	let logger: MockLogger

	const addHistoryEntry = (
		lsn: string,
		others?: {
			topics?: string[]
			newSubscriptions?: string[]
			removedSubscriptions?: string[]
		}
	) => {
		sqlite.exec(
			`
        INSERT INTO history (lsn, topics, changesJson, newSubscriptions, removedSubscriptions, timestamp) 
        VALUES (?, ?, ?, ?, ?, ${Date.now()})
      `,
			lsn,
			others?.topics?.join(',') ?? '',
			JSON.stringify([createMockFileChange('doc1', 'alice', lsn)] satisfies ChangeV2[]),
			others?.newSubscriptions?.join(',') ?? null,
			others?.removedSubscriptions?.join(',') ?? null
		)
	}

	beforeEach(async () => {
		tempDbPath = join(tmpdir(), `test-${Date.now()}-${Math.random()}.db`)
		db = new DatabaseSync(tempDbPath)
		sqlite = new SqlStorageAdapter(db)
		logger = new MockLogger()

		// Run migrations to set up the schema
		await migrate(sqlite as any, logger as any)
	})

	afterEach(() => {
		db.close()
		try {
			unlinkSync(tempDbPath)
		} catch {
			// Ignore cleanup errors
		}
	})

	describe('Basic LSN comparison', () => {
		it('should return done when lsn equals currentLsn', () => {
			const result = getResumeType({
				sqlite: sqlite as any,
				log: logger as any,
				currentLsn: '01/000100',
				lsn: '01/000100',
				userId: 'alice',
			})
			expect(result).toEqual({ type: 'done' })
		})

		it('should return done when lsn is in the future', () => {
			const result = getResumeType({
				sqlite: sqlite as any,
				log: logger as any,
				currentLsn: '01/000100',
				lsn: '01/000200',
				userId: 'alice',
			})
			expect(result).toEqual({ type: 'done' })
		})

		it('should return reboot when no history exists', () => {
			const result = getResumeType({
				sqlite: sqlite as any,
				log: logger as any,
				currentLsn: '01/000200',
				lsn: '01/000050',
				userId: 'alice',
			})
			expect(result).toEqual({ type: 'reboot' })
		})

		it('should return reboot when lsn is before earliest history', () => {
			// Add some history
			db.exec(`
				INSERT INTO history (lsn, topics, changesJson, newSubscriptions, removedSubscriptions, timestamp) 
				VALUES ('01/000120', 'file:doc1', '[]', null, null, ${Date.now()})
			`)

			const result = getResumeType({
				sqlite: sqlite as any,
				log: logger as any,
				currentLsn: '01/000200',
				lsn: '01/000050',
				userId: 'alice',
			})
			expect(result).toEqual({ type: 'reboot' })
		})
	})

	describe('History replay with changes', () => {
		beforeEach(() => {
			// Set up test subscriptions for alice
			db.exec(`
				INSERT INTO topic_subscription (fromTopic, toTopic) VALUES
				('user:alice', 'file:doc1')
			`)
		})

		it('should return done with no messages when the lsn matches the last relevant change', () => {
			addHistoryEntry('01/000140', { topics: ['file:doc1'] }) // last committed change
			addHistoryEntry('01/000150', { topics: ['file:doc2'] }) // first unseen change

			const result = getResumeType({
				sqlite: sqlite as any,
				log: logger as any,
				currentLsn: '01/000200',
				lsn: '01/000140',
				userId: 'alice',
			})

			expect(result.type).toBe('done')
			assert(result.type === 'done')
			expect(result.messages).toBeUndefined()
		})

		it('should return done with messages when relevant history exists', () => {
			// Add history that alice cares about after her LSN
			addHistoryEntry('01/000140', { topics: ['file:doc1'] }) // last committed change
			addHistoryEntry('01/000150', { topics: ['file:doc1'] }) // first unseen change

			const result = getResumeType({
				sqlite: sqlite as any,
				log: logger as any,
				currentLsn: '01/000200',
				lsn: '01/000140',
				userId: 'alice',
			})

			expect(result.type).toBe('done')
			if (result.type === 'done') {
				expect(result.messages).toHaveLength(1)
				const message = result.messages![0]
				if (message.type === 'changes') {
					expect(message.lsn).toBe('01/000150')
				}
			}
		})

		it('should return done with no messages when no relevant changes', () => {
			// Add history that alice doesn't care about
			addHistoryEntry('01/000140', { topics: ['file:doc2', 'user:alice'] })
			addHistoryEntry('01/000150', { topics: ['file:doc2', 'user:charlie'] })

			// Alice's LSN is at the history, but she doesn't care about doc2
			const result = getResumeType({
				sqlite: sqlite as any,
				log: logger as any,
				currentLsn: '01/000200',
				lsn: '01/000140',
				userId: 'alice',
			})

			expect(result).toEqual({ type: 'done' })
		})

		it('should handle subscription changes during replay', () => {
			// Add subscription changes first at earlier LSNs
			addHistoryEntry('01/000130')
			addHistoryEntry('01/000140', {
				topics: ['file:doc2'],
				newSubscriptions: ['user:alice\\file:doc2'],
			})

			// Add a change that becomes relevant after subscription
			addHistoryEntry('01/000150', { topics: ['file:doc2'] })

			const result = getResumeType({
				sqlite: sqlite as any,
				log: logger as any,
				currentLsn: '01/000200',
				lsn: '01/000130',
				userId: 'alice',
			})

			assert(result.type === 'done')
			expect(result.messages).toHaveLength(2)
			expect(result.messages?.[0].type).toBe('changes')
			expect(result.messages?.[1].type).toBe('changes')
		})
	})

	describe('Edge cases', () => {
		it('should handle empty topics string', () => {
			addHistoryEntry('01/000140', { topics: [] })

			const result = getResumeType({
				sqlite: sqlite as any,
				log: logger as any,
				currentLsn: '01/000200',
				lsn: '01/000140',
				userId: 'alice',
			})
			expect(result).toEqual({ type: 'done' })
		})

		it('should handle malformed subscription strings gracefully', () => {
			sqlite.exec(
				`
				INSERT INTO history (lsn, topics, changesJson, newSubscriptions, removedSubscriptions, timestamp) 
				VALUES ('01/000140', 'file:doc1', '[]', 'invalid\\format\\too\\many\\backslashes', null, ${Date.now()})
				`
			)

			expect(() => {
				getResumeType({
					sqlite: sqlite as any,
					log: logger as any,
					currentLsn: '01/000200',
					lsn: '01/000140',
					userId: 'alice',
				})
			}).not.toThrow()
		})

		it('should handle empty changes array in history', () => {
			sqlite.exec(
				`
				INSERT INTO history (lsn, topics, changesJson, newSubscriptions, removedSubscriptions, timestamp) 
				VALUES ('01/000140', 'file:doc1', '[]', null, null, ${Date.now()})
				`
			)

			// Set up subscription
			db.exec(`
				INSERT INTO topic_subscription (fromTopic, toTopic) VALUES ('user:alice', 'file:doc1')
			`)

			const result = getResumeType({
				sqlite: sqlite as any,
				log: logger as any,
				currentLsn: '01/000200',
				lsn: '01/000140',
				userId: 'alice',
			})
			expect(result).toEqual({ type: 'done' })
		})
	})
})
