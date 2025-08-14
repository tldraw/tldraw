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

/* eslint-disable no-console */
describe.skip('getResumeType Performance Tests', () => {
	let tempDbPath: string
	let db: DatabaseSync
	let sqlite: SqlStorageAdapter
	let logger: MockLogger

	// Helper to generate random LSN
	const generateLsn = (sequence: number) => `01/${sequence.toString().padStart(6, '0')}`

	// Helper to generate random user ID
	const generateUserId = () => `user${Math.floor(Math.random() * 1000)}`

	// Helper to generate random file ID
	const generateFileId = () => `file${Math.floor(Math.random() * 5000)}`

	// Helper to create random change with realistic data
	const createRandomChange = (fileId: string, ownerId: string, _lsn: string): ChangeV2 => {
		const now = Date.now()
		const commands = ['insert', 'update', 'delete'] as const
		const command = commands[Math.floor(Math.random() * commands.length)]

		return {
			event: {
				command,
				table: 'file',
			},
			row: {
				id: fileId,
				ownerId,
				name: `File ${fileId}`,
				ownerName: `Owner ${ownerId}`,
				ownerAvatar: '',
				thumbnail: '',
				shared: Math.random() > 0.8, // 20% chance of being shared
				sharedLinkType: Math.random() > 0.5 ? 'readonly' : 'edit',
				published: Math.random() > 0.9, // 10% chance of being published
				lastPublished: now - Math.floor(Math.random() * 86400000), // Random time in last day
				publishedSlug: `slug-${fileId}`,
				createdAt: now - Math.floor(Math.random() * 86400000 * 30), // Random time in last month
				updatedAt: now,
				isEmpty: Math.random() > 0.95, // 5% chance of being empty
				isDeleted: command === 'delete',
				createSource: 'test',
			},
			previous:
				command === 'update'
					? ({
							id: fileId,
							ownerId,
							published: Math.random() > 0.9,
							lastPublished: now - Math.floor(Math.random() * 86400000 * 2),
						} as any)
					: undefined,
			topics: [`user:${ownerId}`, `file:${fileId}`],
		}
	}

	// Helper to generate subscription changes
	const generateSubscriptionChange = () => {
		const userId = generateUserId()
		const fileId = generateFileId()
		const isAdd = Math.random() > 0.5

		return {
			newSubscriptions: isAdd ? [`user:${userId}\\file:${fileId}`] : undefined,
			removedSubscriptions: isAdd ? undefined : [`user:${userId}\\file:${fileId}`],
		}
	}

	beforeAll(async () => {
		tempDbPath = join(tmpdir(), `perf-test-${Date.now()}-${Math.random()}.db`)
		db = new DatabaseSync(tempDbPath)
		sqlite = new SqlStorageAdapter(db)
		logger = new MockLogger()

		// Run migrations to set up the schema
		await migrate(sqlite as any, logger as any)

		console.log('Generating 20,000 rows of test data...')
		const startTime = Date.now()

		// Generate 20,000 history entries with realistic data distribution
		for (let i = 1; i <= 20000; i++) {
			const lsn = generateLsn(i * 10) // Space out LSNs
			const fileId = generateFileId()
			const ownerId = generateUserId()
			const change = createRandomChange(fileId, ownerId, lsn)

			// 10% chance of subscription changes
			const subscriptionChange = Math.random() > 0.9 ? generateSubscriptionChange() : null

			// Random topics - file changes affect file and owner topics
			const topics = [`file:${fileId}`, `user:${ownerId}`]

			// Occasionally add additional topics (shared files, etc.)
			if (Math.random() > 0.8) {
				const extraUserId = generateUserId()
				topics.push(`user:${extraUserId}`)
			}

			sqlite.exec(
				`INSERT INTO history (lsn, topics, changesJson, newSubscriptions, removedSubscriptions, timestamp) 
				 VALUES (?, ?, ?, ?, ?, ?)`,
				lsn,
				topics.join(','),
				JSON.stringify([change]),
				subscriptionChange?.newSubscriptions?.join(',') || null,
				subscriptionChange?.removedSubscriptions?.join(',') || null,
				Date.now() - (20000 - i) * 1000 // Spread timestamps over time
			)

			// Log progress every 5000 rows
			if (i % 5000 === 0) {
				console.log(`Generated ${i}/20000 rows...`)
			}
		}

		// Generate realistic subscription data for test users
		const testUsers = ['user1', 'user100', 'user500', 'user999']
		for (const userId of testUsers) {
			// Each test user subscribes to 10-50 random files
			const subscriptionCount = 10 + Math.floor(Math.random() * 40)
			for (let j = 0; j < subscriptionCount; j++) {
				const fileId = generateFileId()
				try {
					sqlite.exec(
						`INSERT OR IGNORE INTO topic_subscription (fromTopic, toTopic) VALUES (?, ?)`,
						`user:${userId}`,
						`file:${fileId}`
					)
				} catch {
					// Ignore duplicates
				}
			}
		}

		const endTime = Date.now()
		console.log(`Data generation completed in ${endTime - startTime}ms`)
	}, 120000) // 2 minute timeout for data generation

	afterAll(() => {
		db.close()
		try {
			unlinkSync(tempDbPath)
		} catch {
			// Ignore cleanup errors
		}
	})

	it('should perform well when starting from the beginning of history', () => {
		const testUserId = 'user1'
		const startLsn = generateLsn(50) // Very early in history
		const currentLsn = generateLsn(200000) // End of history

		const startTime = performance.now()

		const result = getResumeType({
			sqlite: sqlite as any,
			log: logger as any,
			currentLsn,
			lsn: startLsn,
			userId: testUserId,
		})

		const endTime = performance.now()
		const duration = endTime - startTime

		assert(result.type === 'done')

		console.log(`Performance from start (${result.messages?.length}): ${duration.toFixed(2)}ms`)
		expect(duration).toBeLessThan(5000) // Should complete in under 5 seconds
		expect(result.type).toBe('done')
	})

	it('should perform well when starting from the middle of history', () => {
		const testUserId = 'user100'
		const startLsn = generateLsn(100000) // Middle of history
		const currentLsn = generateLsn(200000) // End of history

		const startTime = performance.now()

		const result = getResumeType({
			sqlite: sqlite as any,
			log: logger as any,
			currentLsn,
			lsn: startLsn,
			userId: testUserId,
		})

		const endTime = performance.now()
		const duration = endTime - startTime

		assert(result.type === 'done')

		console.log(`Performance from middle (${result.messages?.length}): ${duration.toFixed(2)}ms`)
		expect(duration).toBeLessThan(2500) // Should be faster than from start
		expect(result.type).toBe('done')
	})

	it('should perform well when starting near the end of history', () => {
		const testUserId = 'user500'
		const startLsn = generateLsn(190000) // Near end of history
		const currentLsn = generateLsn(200000) // End of history

		const startTime = performance.now()

		const result = getResumeType({
			sqlite: sqlite as any,
			log: logger as any,
			currentLsn,
			lsn: startLsn,
			userId: testUserId,
		})

		const endTime = performance.now()
		const duration = endTime - startTime

		assert(result.type === 'done')

		console.log(`Performance from near end (${result.messages?.length}): ${duration.toFixed(2)}ms`)
		expect(duration).toBeLessThan(1000) // Should be fastest
		expect(result.type).toBe('done')
	})

	it('should handle worst-case scenario with highly subscribed user', () => {
		// Create a user subscribed to many files
		const testUserId = 'user999'

		// Add many more subscriptions for this user
		for (let i = 0; i < 500; i++) {
			const fileId = `file${i}`
			try {
				sqlite.exec(
					`INSERT OR IGNORE INTO topic_subscription (fromTopic, toTopic) VALUES (?, ?)`,
					`user:${testUserId}`,
					`file:${fileId}`
				)
			} catch {
				// Ignore duplicates
			}
		}

		const startLsn = generateLsn(50) // From beginning
		const currentLsn = generateLsn(200000) // End of history

		const startTime = performance.now()

		const result = getResumeType({
			sqlite: sqlite as any,
			log: logger as any,
			currentLsn,
			lsn: startLsn,
			userId: testUserId,
		})

		const endTime = performance.now()
		const duration = endTime - startTime

		assert(result.type === 'done')

		console.log(
			`Performance worst-case (highly subscribed user, ${result.messages?.length}): ${duration.toFixed(2)}ms`
		)
		expect(duration).toBeLessThan(10000) // Should complete in under 10 seconds even in worst case
		expect(result.type).toBe('done')
	})
})
/* eslint-enable no-console */
