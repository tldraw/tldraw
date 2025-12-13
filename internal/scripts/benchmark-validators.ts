/**
 * Benchmark script for @tldraw/validate number validators
 *
 * Usage:
 *   yarn tsx internal/scripts/benchmark-validators.ts
 *
 * This script measures the performance of the numeric validators in @tldraw/validate.
 * It runs multiple iterations to get stable measurements after JIT warmup.
 */

import * as T from '../../packages/validate/src/lib/validation'

const ITERATIONS_PER_RUN = 100_000
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

// Test values
const testIntegers = [0, 1, 42, -100, 1000000]
const testFloats = [0.5, 3.14, -2.5, 100.001, 0.000001]
const testPositive = [0, 1, 42, 0.5, 1000000]
const testNonZero = [1, 42, 0.5, 100.001, 1000000]
const testUnitInterval = [0, 0.25, 0.5, 0.75, 1]
const testNonZeroFinite = [1, -1, 0.5, -0.5, 100.001]

console.log('='.repeat(70))
console.log('VALIDATOR BENCHMARK')
console.log('='.repeat(70))
console.log(`Iterations per run: ${ITERATIONS_PER_RUN.toLocaleString()}`)
console.log(`Total runs: ${TOTAL_RUNS}`)
console.log(`Comparing first 100 runs (warmup) vs last 100 runs (stable)`)
console.log('')

// T.number
{
	const vals = [...testIntegers, ...testFloats]
	let idx = 0
	printResult(
		'T.number',
		runBenchmark('T.number', () => {
			T.number.validate(vals[idx++ % vals.length])
		})
	)
}

// T.positiveNumber
{
	let idx = 0
	printResult(
		'T.positiveNumber',
		runBenchmark('T.positiveNumber', () => {
			T.positiveNumber.validate(testPositive[idx++ % testPositive.length])
		})
	)
}

// T.nonZeroNumber
{
	let idx = 0
	printResult(
		'T.nonZeroNumber',
		runBenchmark('T.nonZeroNumber', () => {
			T.nonZeroNumber.validate(testNonZero[idx++ % testNonZero.length])
		})
	)
}

// T.integer
{
	let idx = 0
	printResult(
		'T.integer',
		runBenchmark('T.integer', () => {
			T.integer.validate(testIntegers[idx++ % testIntegers.length])
		})
	)
}

// T.positiveInteger
{
	let idx = 0
	printResult(
		'T.positiveInteger',
		runBenchmark('T.positiveInteger', () => {
			T.positiveInteger.validate(testPositive.filter(Number.isInteger)[idx++ % 3])
		})
	)
}

// T.nonZeroFiniteNumber
{
	let idx = 0
	printResult(
		'T.nonZeroFiniteNumber',
		runBenchmark('T.nonZeroFiniteNumber', () => {
			T.nonZeroFiniteNumber.validate(testNonZeroFinite[idx++ % testNonZeroFinite.length])
		})
	)
}

// T.unitInterval
{
	let idx = 0
	printResult(
		'T.unitInterval',
		runBenchmark('T.unitInterval', () => {
			T.unitInterval.validate(testUnitInterval[idx++ % testUnitInterval.length])
		})
	)
}

console.log('='.repeat(70))
console.log('')

// Realistic scenario: Point validation
console.log('='.repeat(70))
console.log('REALISTIC SCENARIO: Point validation')
console.log('='.repeat(70))
console.log('')

const testPoints: unknown[] = []
for (let i = 0; i < 10000; i++) {
	testPoints.push({ x: Math.random() * 1000, y: Math.random() * 1000 })
}

const pointValidator = T.object({
	x: T.number,
	y: T.number,
})

{
	let idx = 0
	printResult(
		'Point {x, y}',
		runBenchmark('Point', () => {
			pointValidator.validate(testPoints[idx++ % testPoints.length])
		})
	)
}

// Draw shape props scenario
const testDrawProps: unknown[] = []
for (let i = 0; i < 1000; i++) {
	testDrawProps.push({
		scaleX: 1 + Math.random() * 0.5,
		scaleY: 1 + Math.random() * 0.5,
		opacity: Math.random(),
	})
}

const drawPropsValidator = T.object({
	scaleX: T.nonZeroFiniteNumber,
	scaleY: T.nonZeroFiniteNumber,
	opacity: T.unitInterval,
})

{
	let idx = 0
	printResult(
		'DrawProps {scaleX, scaleY, opacity}',
		runBenchmark('DrawProps', () => {
			drawPropsValidator.validate(testDrawProps[idx++ % testDrawProps.length])
		})
	)
}

console.log('='.repeat(70))
