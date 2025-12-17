/**
 * Benchmark script for @tldraw/validate DictValidator
 *
 * Usage:
 *   yarn tsx internal/scripts/benchmark-dict-validator.ts
 *
 * This script measures the performance of the DictValidator in @tldraw/validate.
 * It tests both fresh validation and validateUsingKnownGoodVersion scenarios.
 */

import * as T from '../../packages/validate/src/lib/validation'

const ITERATIONS_PER_RUN = 50_000
const TOTAL_RUNS = 200

interface BenchmarkResult {
	first100Avg: number
	last100Avg: number
	opsPerSecFirst: number
	opsPerSecLast: number
}

function runBenchmark(name: string, fn: () => void): BenchmarkResult {
	const times: number[] = []

	for (let run = 0; run < TOTAL_RUNS; run++) {
		const start = performance.now()
		for (let i = 0; i < ITERATIONS_PER_RUN; i++) {
			fn()
		}
		times.push(performance.now() - start)
	}

	const first100 = times.slice(0, 100)
	const last100 = times.slice(100)
	const first100Avg = first100.reduce((a, b) => a + b, 0) / first100.length
	const last100Avg = last100.reduce((a, b) => a + b, 0) / last100.length

	return {
		first100Avg,
		last100Avg,
		opsPerSecFirst: (ITERATIONS_PER_RUN / first100Avg) * 1000,
		opsPerSecLast: (ITERATIONS_PER_RUN / last100Avg) * 1000,
	}
}

function formatOps(ops: number): string {
	if (ops >= 1_000_000) {
		return `${(ops / 1_000_000).toFixed(2)}M`
	}
	if (ops >= 1_000) {
		return `${(ops / 1_000).toFixed(2)}K`
	}
	return ops.toFixed(0)
}

function printResult(name: string, result: BenchmarkResult): void {
	const warmupChange = ((result.first100Avg / result.last100Avg - 1) * 100).toFixed(1)
	const warmupDir = Number(warmupChange) > 0 ? 'slower' : 'faster'

	console.log(`--- ${name} ---`)
	console.log(
		`  First 100 runs: ${result.first100Avg.toFixed(2)}ms (${formatOps(result.opsPerSecFirst)} ops/sec)`
	)
	console.log(
		`  Last 100 runs:  ${result.last100Avg.toFixed(2)}ms (${formatOps(result.opsPerSecLast)} ops/sec)`
	)
	console.log(`  JIT stability:  First 100 ${Math.abs(Number(warmupChange))}% ${warmupDir}`)
	console.log('')
}

// Test data for dict validators
// Small dict (3 keys) - common case for simple configs
const smallDict: Record<string, number> = {
	width: 100,
	height: 200,
	depth: 50,
}

// Medium dict (10 keys) - typical shape props
const mediumDict: Record<string, number> = {}
for (let i = 0; i < 10; i++) {
	mediumDict[`key${i}`] = i * 10
}

// Large dict (50 keys) - stress test
const largeDict: Record<string, number> = {}
for (let i = 0; i < 50; i++) {
	largeDict[`key${i}`] = i * 10
}

// Line shape points scenario - realistic use case
interface LinePoint {
	id: string
	index: string
	x: number
	y: number
}
const linePoints: Record<string, LinePoint> = {}
for (let i = 0; i < 5; i++) {
	const id = `point${i}`
	linePoints[id] = { id, index: `a${i}`, x: i * 10, y: i * 20 }
}

// Validators
const stringToNumberDict = T.dict(T.string, T.number)
const linePointValidator = T.object({
	id: T.string,
	index: T.string,
	x: T.number,
	y: T.number,
})
const linePointsDict = T.dict(T.string, linePointValidator)

console.log('='.repeat(70))
console.log('DICT VALIDATOR BENCHMARK')
console.log('='.repeat(70))
console.log(`Iterations per run: ${ITERATIONS_PER_RUN.toLocaleString()}`)
console.log(`Total runs: ${TOTAL_RUNS}`)
console.log(`Comparing first 100 runs (warmup) vs last 100 runs (stable)`)
console.log('')

// --- Fresh validation benchmarks ---
console.log('='.repeat(70))
console.log('FRESH VALIDATION (validate)')
console.log('='.repeat(70))
console.log('')

// Small dict fresh validation
{
	const testDicts = [smallDict, { ...smallDict, extra: 999 }, { a: 1, b: 2, c: 3 }]
	let idx = 0
	printResult(
		'Small dict (3 keys)',
		runBenchmark('SmallDict', () => {
			stringToNumberDict.validate(testDicts[idx++ % testDicts.length])
		})
	)
}

// Medium dict fresh validation
{
	const testDicts = [mediumDict, { ...mediumDict }]
	let idx = 0
	printResult(
		'Medium dict (10 keys)',
		runBenchmark('MediumDict', () => {
			stringToNumberDict.validate(testDicts[idx++ % testDicts.length])
		})
	)
}

// Large dict fresh validation
{
	const testDicts = [largeDict, { ...largeDict }]
	let idx = 0
	printResult(
		'Large dict (50 keys)',
		runBenchmark('LargeDict', () => {
			stringToNumberDict.validate(testDicts[idx++ % testDicts.length])
		})
	)
}

// Line points dict (realistic scenario)
{
	const testDicts = [linePoints, { ...linePoints }]
	let idx = 0
	printResult(
		'Line points dict (5 nested objects)',
		runBenchmark('LinePoints', () => {
			linePointsDict.validate(testDicts[idx++ % testDicts.length])
		})
	)
}

// --- ValidateUsingKnownGoodVersion benchmarks ---
console.log('='.repeat(70))
console.log('INCREMENTAL VALIDATION (validateUsingKnownGoodVersion)')
console.log('='.repeat(70))
console.log('')

// Scenario 1: No changes (should be fast - identity check)
{
	const knownGood = stringToNumberDict.validate(smallDict)
	printResult(
		'Small dict - no changes (same reference)',
		runBenchmark('SmallDictNoChange', () => {
			stringToNumberDict.validateUsingKnownGoodVersion(knownGood, knownGood)
		})
	)
}

// Scenario 2: Same values, different reference
{
	const knownGood = stringToNumberDict.validate(smallDict)
	const newValue = { ...smallDict } // Same values, new object
	printResult(
		'Small dict - same values, different reference',
		runBenchmark('SmallDictSameValues', () => {
			stringToNumberDict.validateUsingKnownGoodVersion(knownGood, newValue)
		})
	)
}

// Scenario 3: One value changed
{
	const knownGood = stringToNumberDict.validate(smallDict)
	const changed = { ...smallDict, width: 150 }
	printResult(
		'Small dict - one value changed',
		runBenchmark('SmallDictOneChange', () => {
			stringToNumberDict.validateUsingKnownGoodVersion(knownGood, changed)
		})
	)
}

// Scenario 4: Key added
{
	const knownGood = stringToNumberDict.validate(smallDict)
	const added = { ...smallDict, newKey: 999 }
	printResult(
		'Small dict - key added',
		runBenchmark('SmallDictKeyAdded', () => {
			stringToNumberDict.validateUsingKnownGoodVersion(knownGood, added)
		})
	)
}

// Scenario 5: Key removed
{
	const { width: _, ...rest } = smallDict
	const knownGood = stringToNumberDict.validate(smallDict)
	printResult(
		'Small dict - key removed',
		runBenchmark('SmallDictKeyRemoved', () => {
			stringToNumberDict.validateUsingKnownGoodVersion(knownGood, rest)
		})
	)
}

// Medium dict scenarios
{
	const knownGood = stringToNumberDict.validate(mediumDict)
	const newValue = { ...mediumDict }
	printResult(
		'Medium dict - same values, different reference',
		runBenchmark('MediumDictSameValues', () => {
			stringToNumberDict.validateUsingKnownGoodVersion(knownGood, newValue)
		})
	)
}

{
	const knownGood = stringToNumberDict.validate(mediumDict)
	const changed = { ...mediumDict, key5: 999 }
	printResult(
		'Medium dict - one value changed',
		runBenchmark('MediumDictOneChange', () => {
			stringToNumberDict.validateUsingKnownGoodVersion(knownGood, changed)
		})
	)
}

// Line points incremental
{
	const knownGood = linePointsDict.validate(linePoints)
	const newValue = { ...linePoints }
	printResult(
		'Line points - same values, different reference',
		runBenchmark('LinePointsSameValues', () => {
			linePointsDict.validateUsingKnownGoodVersion(knownGood, newValue)
		})
	)
}

{
	const knownGood = linePointsDict.validate(linePoints)
	const changed = {
		...linePoints,
		point2: { ...linePoints.point2, x: 999 },
	}
	printResult(
		'Line points - one point changed',
		runBenchmark('LinePointsOneChange', () => {
			linePointsDict.validateUsingKnownGoodVersion(knownGood, changed)
		})
	)
}

console.log('='.repeat(70))
console.log('')
