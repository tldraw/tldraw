/**
 * Performance benchmark for @tldraw/store
 *
 * Run with: npx tsx src/lib/test/benchmark.ts
 */

// eslint-disable-next-line no-console
const log = console.log

// Polyfill requestAnimationFrame for Node.js environment
// @ts-expect-error - polyfill for Node environment
globalThis.requestAnimationFrame = (cb: () => void) => setTimeout(cb, 0)

import { transact } from '@tldraw/state'
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'
import { BaseRecord, RecordId } from '../BaseRecord'
import { createRecordType } from '../RecordType'
import { Store } from '../Store'
import { StoreSchema } from '../StoreSchema'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// ============================================================================
// Test record types
// ============================================================================

interface TestRecord extends BaseRecord<'test', RecordId<TestRecord>> {
	value: number
	name: string
	category: string
}

const TestRecord = createRecordType<TestRecord>('test', {
	validator: { validate: (r) => r as TestRecord },
	scope: 'document',
})

interface OtherRecord extends BaseRecord<'other', RecordId<OtherRecord>> {
	data: string
}

const OtherRecord = createRecordType<OtherRecord>('other', {
	validator: { validate: (r) => r as OtherRecord },
	scope: 'document',
})

type AllRecords = TestRecord | OtherRecord

const schema = StoreSchema.create<AllRecords>({
	test: TestRecord,
	other: OtherRecord,
})

function createStore() {
	return new Store<AllRecords>({ schema, props: {} })
}

// ============================================================================
// Benchmark infrastructure
// ============================================================================

interface BenchmarkResult {
	name: string
	description: string
	iterations: number
	totalMs: number
	avgMs: number
	opsPerSec: number
}

const results: BenchmarkResult[] = []

function benchmark(
	name: string,
	description: string,
	iterations: number,
	fn: () => void
): BenchmarkResult {
	// Warmup
	for (let i = 0; i < Math.min(100, iterations / 10); i++) {
		fn()
	}

	// Actual benchmark
	const start = performance.now()
	for (let i = 0; i < iterations; i++) {
		fn()
	}
	const end = performance.now()

	const totalMs = end - start
	const avgMs = totalMs / iterations
	const opsPerSec = Math.round(1000 / avgMs)

	const result: BenchmarkResult = {
		name,
		description,
		iterations,
		totalMs: Math.round(totalMs * 100) / 100,
		avgMs: Math.round(avgMs * 1000000) / 1000000,
		opsPerSec,
	}

	results.push(result)
	log(`${name}: ${opsPerSec.toLocaleString()} ops/sec (${avgMs.toFixed(6)}ms avg)`)

	return result
}

// ============================================================================
// Benchmark 1: Single record put
// ============================================================================
function benchmarkSinglePut() {
	const store = createStore()
	let counter = 0

	benchmark('single-put', 'Put a single record into the store', 50_000, () => {
		store.put([
			TestRecord.create({
				id: TestRecord.createId(`record-${counter++}`),
				value: counter,
				name: `Test ${counter}`,
				category: 'benchmark',
			}),
		])
	})
}

// ============================================================================
// Benchmark 2: Batch put (100 records)
// ============================================================================
function benchmarkBatchPut() {
	const store = createStore()
	let counter = 0

	benchmark('batch-put-100', 'Put 100 records in a single call', 1_000, () => {
		const records = Array.from({ length: 100 }, (_, i) =>
			TestRecord.create({
				id: TestRecord.createId(`record-${counter++}`),
				value: counter + i,
				name: `Test ${counter + i}`,
				category: 'benchmark',
			})
		)
		store.put(records)
	})
}

// ============================================================================
// Benchmark 3: Single record get (reactive)
// ============================================================================
function benchmarkSingleGet() {
	const store = createStore()
	const ids: RecordId<TestRecord>[] = []

	// Setup: add 10,000 records
	for (let i = 0; i < 10_000; i++) {
		const id = TestRecord.createId(`record-${i}`)
		ids.push(id)
		store.put([
			TestRecord.create({
				id,
				value: i,
				name: `Test ${i}`,
				category: `cat-${i % 10}`,
			}),
		])
	}

	let idx = 0
	benchmark('single-get', 'Get a single record by ID (reactive)', 100_000, () => {
		store.get(ids[idx++ % ids.length])
	})
}

// ============================================================================
// Benchmark 4: Single record get (non-reactive)
// ============================================================================
function benchmarkSingleGetUnsafe() {
	const store = createStore()
	const ids: RecordId<TestRecord>[] = []

	// Setup: add 10,000 records
	for (let i = 0; i < 10_000; i++) {
		const id = TestRecord.createId(`record-${i}`)
		ids.push(id)
		store.put([
			TestRecord.create({
				id,
				value: i,
				name: `Test ${i}`,
				category: `cat-${i % 10}`,
			}),
		])
	}

	let idx = 0
	benchmark('single-get-unsafe', 'Get a single record by ID (non-reactive)', 100_000, () => {
		store.unsafeGetWithoutCapture(ids[idx++ % ids.length])
	})
}

// ============================================================================
// Benchmark 5: Update existing record
// ============================================================================
function benchmarkUpdate() {
	const store = createStore()
	const ids: RecordId<TestRecord>[] = []

	// Setup: add 1,000 records
	for (let i = 0; i < 1_000; i++) {
		const id = TestRecord.createId(`record-${i}`)
		ids.push(id)
		store.put([
			TestRecord.create({
				id,
				value: i,
				name: `Test ${i}`,
				category: `cat-${i % 10}`,
			}),
		])
	}

	let counter = 0
	benchmark('update-record', 'Update a single record using store.update()', 20_000, () => {
		const id = ids[counter++ % ids.length]
		store.update(id, (r) => ({ ...r, value: counter }))
	})
}

// ============================================================================
// Benchmark 6: Remove records
// ============================================================================
function benchmarkRemove() {
	let counter = 0

	benchmark('remove-record', 'Remove a single record', 10_000, () => {
		const store = createStore()
		const id = TestRecord.createId(`record-${counter++}`)
		store.put([
			TestRecord.create({
				id,
				value: 1,
				name: 'Test',
				category: 'benchmark',
			}),
		])
		store.remove([id])
	})
}

// ============================================================================
// Benchmark 7: Get all records
// ============================================================================
function benchmarkAllRecords() {
	const store = createStore()

	// Setup: add 10,000 records
	for (let i = 0; i < 10_000; i++) {
		store.put([
			TestRecord.create({
				id: TestRecord.createId(`record-${i}`),
				value: i,
				name: `Test ${i}`,
				category: `cat-${i % 10}`,
			}),
		])
	}

	benchmark('all-records', 'Get all 10,000 records as array', 5_000, () => {
		store.allRecords()
	})
}

// ============================================================================
// Benchmark 8: Query records by type
// ============================================================================
function benchmarkQueryByType() {
	const store = createStore()

	// Setup: add 5,000 test records and 5,000 other records
	for (let i = 0; i < 5_000; i++) {
		store.put([
			TestRecord.create({
				id: TestRecord.createId(`record-${i}`),
				value: i,
				name: `Test ${i}`,
				category: `cat-${i % 10}`,
			}),
			OtherRecord.create({
				id: OtherRecord.createId(`other-${i}`),
				data: `Data ${i}`,
			}),
		])
	}

	benchmark('query-by-type', 'Query all records of one type (5,000 records)', 10_000, () => {
		store.query.records('test').get()
	})
}

// ============================================================================
// Benchmark 9: Index creation and lookup
// ============================================================================
function benchmarkIndexLookup() {
	const store = createStore()

	// Setup: add 10,000 records with 10 categories
	for (let i = 0; i < 10_000; i++) {
		store.put([
			TestRecord.create({
				id: TestRecord.createId(`record-${i}`),
				value: i,
				name: `Test ${i}`,
				category: `cat-${i % 10}`,
			}),
		])
	}

	// Create index
	const index = store.query.index('test', 'category')

	let catIdx = 0
	benchmark('index-lookup', 'Lookup records by indexed category', 50_000, () => {
		const cat = `cat-${catIdx++ % 10}`
		index.get().get(cat)
	})
}

// ============================================================================
// Benchmark 10: Listener notification (synchronous)
// ============================================================================
function benchmarkListenerNotification() {
	const store = createStore()
	let _listenerCallCount = 0

	// Add 10 listeners with synchronous source filter
	for (let i = 0; i < 10; i++) {
		store.listen(
			() => {
				_listenerCallCount++
			},
			{ source: 'user', scope: 'all' }
		)
	}

	let counter = 0
	benchmark('listener-notification', 'Put record with 10 listeners attached', 10_000, () => {
		store.put([
			TestRecord.create({
				id: TestRecord.createId(`record-${counter++}`),
				value: counter,
				name: `Test ${counter}`,
				category: 'benchmark',
			}),
		])
	})
}

// ============================================================================
// Benchmark 11: Transaction with many updates
// ============================================================================
function benchmarkTransaction() {
	const store = createStore()
	const ids: RecordId<TestRecord>[] = []

	// Setup: add 100 records
	for (let i = 0; i < 100; i++) {
		const id = TestRecord.createId(`record-${i}`)
		ids.push(id)
		store.put([
			TestRecord.create({
				id,
				value: i,
				name: `Test ${i}`,
				category: `cat-${i % 10}`,
			}),
		])
	}

	let counter = 0
	benchmark('transaction-100-updates', 'Update 100 records in a transaction', 1_000, () => {
		transact(() => {
			for (const id of ids) {
				store.update(id, (r) => ({ ...r, value: counter++ }))
			}
		})
	})
}

// ============================================================================
// Benchmark 12: Serialize store
// ============================================================================
function benchmarkSerialize() {
	const store = createStore()

	// Setup: add 10,000 records
	for (let i = 0; i < 10_000; i++) {
		store.put([
			TestRecord.create({
				id: TestRecord.createId(`record-${i}`),
				value: i,
				name: `Test ${i}`,
				category: `cat-${i % 10}`,
			}),
		])
	}

	benchmark('serialize', 'Serialize store with 10,000 records', 1_000, () => {
		store.serialize()
	})
}

// ============================================================================
// Benchmark 13: Load store snapshot
// ============================================================================
function benchmarkLoadSnapshot() {
	const sourceStore = createStore()

	// Setup: add 10,000 records to source
	for (let i = 0; i < 10_000; i++) {
		sourceStore.put([
			TestRecord.create({
				id: TestRecord.createId(`record-${i}`),
				value: i,
				name: `Test ${i}`,
				category: `cat-${i % 10}`,
			}),
		])
	}

	const snapshot = sourceStore.getStoreSnapshot()

	benchmark('load-snapshot', 'Load snapshot with 10,000 records into empty store', 500, () => {
		const store = createStore()
		store.loadStoreSnapshot(snapshot)
	})
}

// ============================================================================
// Benchmark 14: Computed cache
// ============================================================================
function benchmarkComputedCache() {
	const store = createStore()
	const ids: RecordId<TestRecord>[] = []

	// Setup: add 1,000 records
	for (let i = 0; i < 1_000; i++) {
		const id = TestRecord.createId(`record-${i}`)
		ids.push(id)
		store.put([
			TestRecord.create({
				id,
				value: i,
				name: `Test ${i}`,
				category: `cat-${i % 10}`,
			}),
		])
	}

	// Create a computed cache
	const cache = store.createComputedCache('double-value', (record: TestRecord) => {
		return record.value * 2
	})

	let idx = 0
	benchmark('computed-cache-get', 'Get value from computed cache', 50_000, () => {
		cache.get(ids[idx++ % ids.length])
	})
}

// ============================================================================
// Benchmark 15: Computed cache after change
// ============================================================================
function benchmarkComputedCacheAfterChange() {
	const store = createStore()
	const ids: RecordId<TestRecord>[] = []

	// Setup: add 1,000 records
	for (let i = 0; i < 1_000; i++) {
		const id = TestRecord.createId(`record-${i}`)
		ids.push(id)
		store.put([
			TestRecord.create({
				id,
				value: i,
				name: `Test ${i}`,
				category: `cat-${i % 10}`,
			}),
		])
	}

	// Create a computed cache
	const cache = store.createComputedCache('double-value', (record: TestRecord) => {
		return record.value * 2
	})

	// Prime the cache
	for (const id of ids) {
		cache.get(id)
	}

	let counter = 0
	benchmark(
		'computed-cache-after-change',
		'Update record then read from computed cache',
		10_000,
		() => {
			const idx = counter++ % ids.length
			const id = ids[idx]
			store.update(id, (r) => ({ ...r, value: counter }))
			cache.get(id)
		}
	)
}

// ============================================================================
// Benchmark 16: Has record check
// ============================================================================
function benchmarkHas() {
	const store = createStore()
	const ids: RecordId<TestRecord>[] = []
	const missingIds: RecordId<TestRecord>[] = []

	// Setup: add 10,000 records
	for (let i = 0; i < 10_000; i++) {
		const id = TestRecord.createId(`record-${i}`)
		ids.push(id)
		missingIds.push(TestRecord.createId(`missing-${i}`))
		store.put([
			TestRecord.create({
				id,
				value: i,
				name: `Test ${i}`,
				category: `cat-${i % 10}`,
			}),
		])
	}

	let idx = 0
	benchmark('has-record', 'Check if record exists (alternating hit/miss)', 100_000, () => {
		const i = idx++ % ids.length
		store.has(ids[i])
		store.has(missingIds[i])
	})
}

// ============================================================================
// Benchmark 17: Clear store
// ============================================================================
function benchmarkClear() {
	benchmark('clear-store', 'Clear store with 1,000 records', 500, () => {
		const store = createStore()
		for (let i = 0; i < 1_000; i++) {
			store.put([
				TestRecord.create({
					id: TestRecord.createId(`record-${i}`),
					value: i,
					name: `Test ${i}`,
					category: `cat-${i % 10}`,
				}),
			])
		}
		store.clear()
	})
}

// ============================================================================
// Benchmark 18: Extract changes
// ============================================================================
function benchmarkExtractChanges() {
	const store = createStore()

	// Setup: add some initial records
	for (let i = 0; i < 100; i++) {
		store.put([
			TestRecord.create({
				id: TestRecord.createId(`record-${i}`),
				value: i,
				name: `Test ${i}`,
				category: `cat-${i % 10}`,
			}),
		])
	}

	let counter = 100
	benchmark('extract-changes', 'Extract changes from a batch of operations', 5_000, () => {
		store.extractingChanges(() => {
			for (let i = 0; i < 10; i++) {
				store.put([
					TestRecord.create({
						id: TestRecord.createId(`record-${counter++}`),
						value: counter,
						name: `Test ${counter}`,
						category: 'benchmark',
					}),
				])
			}
		})
	})
}

// ============================================================================
// Generate markdown report
// ============================================================================

function generateMarkdownReport(): string {
	const timestamp = new Date().toISOString()

	let md = `# @tldraw/store Performance Benchmark

Generated: ${timestamp}

## System Info
- Node.js: ${process.version}
- Platform: ${process.platform} ${process.arch}

## Results

| Benchmark | Description | Ops/sec | Avg (ms) | Total (ms) | Iterations |
|-----------|-------------|---------|----------|------------|------------|
`

	for (const r of results) {
		md += `| ${r.name} | ${r.description} | ${r.opsPerSec.toLocaleString()} | ${r.avgMs.toFixed(6)} | ${r.totalMs.toFixed(2)} | ${r.iterations.toLocaleString()} |\n`
	}

	md += `
## Benchmark Descriptions

### Write Operations
- **single-put**: Basic write performance for adding one record
- **batch-put-100**: Efficiency of batching multiple records in one put call
- **update-record**: Cost of updating an existing record
- **remove-record**: Cost of removing a record (includes setup)
- **clear-store**: Bulk removal of all records

### Read Operations
- **single-get**: Reactive read that tracks dependencies
- **single-get-unsafe**: Non-reactive read without dependency tracking
- **all-records**: Fetching all records as an array
- **has-record**: Checking record existence

### Query Operations
- **query-by-type**: Filter records by type name
- **index-lookup**: Lookup records using a pre-built index

### Reactive Operations
- **listener-notification**: Cost of notifying multiple listeners on change
- **transaction-100-updates**: Batching many updates in a transaction
- **computed-cache-get**: Reading from a computed cache (cached)
- **computed-cache-after-change**: Cache read after underlying record changed
- **extract-changes**: Capturing changes from a batch of operations

### Serialization
- **serialize**: Converting store to plain objects
- **load-snapshot**: Loading records from a store snapshot

## Notes

Higher ops/sec is better. Lower avg time is better.
`

	return md
}

// ============================================================================
// Run all benchmarks
// ============================================================================

log('Running @tldraw/store performance benchmarks...\n')

benchmarkSinglePut()
benchmarkBatchPut()
benchmarkSingleGet()
benchmarkSingleGetUnsafe()
benchmarkUpdate()
benchmarkRemove()
benchmarkAllRecords()
benchmarkQueryByType()
benchmarkIndexLookup()
benchmarkListenerNotification()
benchmarkTransaction()
benchmarkSerialize()
benchmarkLoadSnapshot()
benchmarkComputedCache()
benchmarkComputedCacheAfterChange()
benchmarkHas()
benchmarkClear()
benchmarkExtractChanges()

log('\n--- Benchmark complete ---\n')

// Generate and save report
const report = generateMarkdownReport()
const outputPath = process.argv[2] || path.join(__dirname, 'benchmark-control.md')

fs.writeFileSync(outputPath, report)
log(`Report saved to: ${outputPath}`)
