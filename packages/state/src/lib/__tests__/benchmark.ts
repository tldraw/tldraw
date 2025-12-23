/**
 * Performance benchmark for @tldraw/state
 *
 * Run with: npx tsx src/lib/__tests__/benchmark.ts [output-path] [--json]
 */

import * as fs from 'fs'
import * as path from 'path'
import { atom } from '../Atom'
import { computed } from '../Computed'
import { react, reactor } from '../EffectScheduler'
import { transact } from '../transactions'
import { Signal } from '../types'

// eslint-disable-next-line no-console
const log = console.log

interface BenchmarkResult {
	name: string
	description: string
	iterations: number
	trials: number
	totalMs: number
	avgMs: number
	minMs: number
	maxMs: number
	stdDevMs: number
	opsPerSec: number
}

const results: BenchmarkResult[] = []

const TRIALS = 5

function benchmark(
	name: string,
	description: string,
	iterations: number,
	fn: () => void
): BenchmarkResult {
	// Warmup - run until timing stabilizes
	const warmupIterations = Math.max(100, Math.floor(iterations / 10))
	for (let i = 0; i < warmupIterations; i++) {
		fn()
	}

	// Run multiple trials
	const trialTimes: number[] = []
	for (let trial = 0; trial < TRIALS; trial++) {
		const start = performance.now()
		for (let i = 0; i < iterations; i++) {
			fn()
		}
		const end = performance.now()
		trialTimes.push(end - start)
	}

	// Calculate statistics
	const totalMs = trialTimes.reduce((a, b) => a + b, 0) / TRIALS
	const avgMs = totalMs / iterations
	const minMs = Math.min(...trialTimes) / iterations
	const maxMs = Math.max(...trialTimes) / iterations

	// Standard deviation
	const variance =
		trialTimes.reduce((sum, t) => sum + Math.pow(t / iterations - avgMs, 2), 0) / TRIALS
	const stdDevMs = Math.sqrt(variance)

	const opsPerSec = Math.round(1000 / avgMs)

	const result: BenchmarkResult = {
		name,
		description,
		iterations,
		trials: TRIALS,
		totalMs: Math.round(totalMs * 100) / 100,
		avgMs: Math.round(avgMs * 1000000) / 1000000,
		minMs: Math.round(minMs * 1000000) / 1000000,
		maxMs: Math.round(maxMs * 1000000) / 1000000,
		stdDevMs: Math.round(stdDevMs * 1000000) / 1000000,
		opsPerSec,
	}

	results.push(result)
	const deviation = stdDevMs > 0.000001 ? ` (±${stdDevMs.toFixed(6)}ms)` : ''
	log(`${name}: ${opsPerSec.toLocaleString()} ops/sec (${avgMs.toFixed(6)}ms avg${deviation})`)

	return result
}

// ============================================================================
// Benchmark 1: Deep computed chain - read when nothing changed
// This is where dirty-bit propagation helps most
// ============================================================================
function benchmarkDeepChainNoChange() {
	const depth = 20
	const baseAtom = atom('base', 1)

	// Create a chain of computed signals
	let current: Signal<number> = baseAtom
	for (let i = 0; i < depth; i++) {
		const parent = current
		current = computed(`level-${i}`, () => parent.get() + 1)
	}
	const finalComputed = current

	// Start a reactor so the chain is actively listening
	const stop = react('listener', () => {
		finalComputed.get()
	})

	// Read the final computed many times without changing the atom
	benchmark(
		'deep-chain-no-change',
		`Read end of ${depth}-deep computed chain when nothing changed`,
		100_000,
		() => {
			finalComputed.get()
		}
	)

	stop()
}

// ============================================================================
// Benchmark 2: Deep computed chain - read after change
// ============================================================================
function benchmarkDeepChainWithChange() {
	const depth = 20
	const baseAtom = atom('base', 1)

	let current: Signal<number> = baseAtom
	for (let i = 0; i < depth; i++) {
		const parent = current
		current = computed(`level-${i}`, () => parent.get() + 1)
	}
	const finalComputed = current

	const stop = react('listener', () => {
		finalComputed.get()
	})

	let counter = 0
	benchmark(
		'deep-chain-with-change',
		`Change atom then read end of ${depth}-deep computed chain`,
		10_000,
		() => {
			baseAtom.set(counter++)
			finalComputed.get()
		}
	)

	stop()
}

// ============================================================================
// Benchmark 3: Wide computed graph - many siblings, no change
// ============================================================================
function benchmarkWideGraphNoChange() {
	const width = 100
	const baseAtom = atom('base', 1)

	const computeds = Array.from({ length: width }, (_, i) =>
		computed(`sibling-${i}`, () => baseAtom.get() + i)
	)

	// Sum all siblings
	const sumComputed = computed('sum', () => {
		let sum = 0
		for (const c of computeds) {
			sum += c.get()
		}
		return sum
	})

	const stop = react('listener', () => {
		sumComputed.get()
	})

	benchmark(
		'wide-graph-no-change',
		`Read sum of ${width} sibling computeds when nothing changed`,
		50_000,
		() => {
			sumComputed.get()
		}
	)

	stop()
}

// ============================================================================
// Benchmark 4: Wide computed graph - many siblings, with change
// ============================================================================
function benchmarkWideGraphWithChange() {
	const width = 100
	const baseAtom = atom('base', 1)

	const computeds = Array.from({ length: width }, (_, i) =>
		computed(`sibling-${i}`, () => baseAtom.get() + i)
	)

	const sumComputed = computed('sum', () => {
		let sum = 0
		for (const c of computeds) {
			sum += c.get()
		}
		return sum
	})

	const stop = react('listener', () => {
		sumComputed.get()
	})

	let counter = 0
	benchmark(
		'wide-graph-with-change',
		`Change atom then read sum of ${width} sibling computeds`,
		5_000,
		() => {
			baseAtom.set(counter++)
			sumComputed.get()
		}
	)

	stop()
}

// ============================================================================
// Benchmark 5: Multiple independent atoms - only one changes
// This tests selective dirty propagation
// ============================================================================
function benchmarkSelectiveDirty() {
	const numAtoms = 10
	const atoms = Array.from({ length: numAtoms }, (_, i) => atom(`atom-${i}`, i))

	const computeds = atoms.map((a, i) => computed(`computed-${i}`, () => a.get() * 2))

	const sumComputed = computed('sum', () => {
		let sum = 0
		for (const c of computeds) {
			sum += c.get()
		}
		return sum
	})

	const stop = react('listener', () => {
		sumComputed.get()
	})

	let counter = 0
	benchmark(
		'selective-dirty',
		`Change 1 of ${numAtoms} atoms, then read sum computed`,
		20_000,
		() => {
			// Only change the first atom
			atoms[0].set(counter++)
			sumComputed.get()
		}
	)

	stop()
}

// ============================================================================
// Benchmark 6: Reactor start/stop cycle
// Tests the attach/detach overhead
// ============================================================================
function benchmarkReactorCycle() {
	const baseAtom = atom('base', 1)
	const derived = computed('derived', () => baseAtom.get() * 2)

	benchmark('reactor-start-stop', 'Start and stop a reactor', 50_000, () => {
		const r = reactor('test', () => {
			derived.get()
		})
		r.start()
		r.stop()
	})
}

// ============================================================================
// Benchmark 7: Transaction with many atom updates
// ============================================================================
function benchmarkTransaction() {
	const numAtoms = 50
	const atoms = Array.from({ length: numAtoms }, (_, i) => atom(`atom-${i}`, i))

	const sumComputed = computed('sum', () => {
		let sum = 0
		for (const a of atoms) {
			sum += a.get()
		}
		return sum
	})

	const stop = react('listener', () => {
		sumComputed.get()
	})

	let counter = 0
	benchmark('transaction-many-atoms', `Update ${numAtoms} atoms in a transaction`, 2_000, () => {
		transact(() => {
			for (const a of atoms) {
				a.set(counter++)
			}
		})
	})

	stop()
}

// ============================================================================
// Benchmark 8: Diamond dependency pattern
// A -> B -> D
// A -> C -> D
// ============================================================================
function benchmarkDiamondPattern() {
	const a = atom('a', 1)
	const b = computed('b', () => a.get() + 1)
	const c = computed('c', () => a.get() + 2)
	const d = computed('d', () => b.get() + c.get())

	const stop = react('listener', () => {
		d.get()
	})

	benchmark(
		'diamond-no-change',
		'Read diamond pattern computed when nothing changed',
		100_000,
		() => {
			d.get()
		}
	)

	stop()
}

// ============================================================================
// Benchmark 9: Diamond pattern with change
// ============================================================================
function benchmarkDiamondPatternWithChange() {
	const a = atom('a', 1)
	const b = computed('b', () => a.get() + 1)
	const c = computed('c', () => a.get() + 2)
	const d = computed('d', () => b.get() + c.get())

	const stop = react('listener', () => {
		d.get()
	})

	let counter = 0
	benchmark('diamond-with-change', 'Change atom then read diamond pattern computed', 50_000, () => {
		a.set(counter++)
		d.get()
	})

	stop()
}

// ============================================================================
// Benchmark 10: Computed without active listener (cold read)
// ============================================================================
function benchmarkColdRead() {
	const depth = 10
	const baseAtom = atom('base', 1)

	let current: Signal<number> = baseAtom
	for (let i = 0; i < depth; i++) {
		const parent = current
		current = computed(`level-${i}`, () => parent.get() + 1)
	}
	const finalComputed = current

	// No reactor - cold read
	benchmark(
		'cold-read-deep-chain',
		`Cold read (no listener) of ${depth}-deep computed chain`,
		50_000,
		() => {
			finalComputed.get()
		}
	)
}

// ============================================================================
// Benchmark 11: Many computeds from few atoms (tldraw-like pattern)
// 5000 computed values, each depending on 3 atoms
// ============================================================================
function benchmarkManyComputedsFewAtoms() {
	const numAtoms = 100
	const numComputeds = 5000
	const depsPerComputed = 3

	const atoms = Array.from({ length: numAtoms }, (_, i) => atom(`atom-${i}`, i))

	// Each computed depends on 3 random atoms
	const computeds = Array.from({ length: numComputeds }, (_, i) => {
		const dep1 = atoms[i % numAtoms]
		const dep2 = atoms[(i * 7) % numAtoms]
		const dep3 = atoms[(i * 13) % numAtoms]
		return computed(`computed-${i}`, () => dep1.get() + dep2.get() + dep3.get())
	})

	// Create a reactor that reads all computeds
	const stop = react('listener', () => {
		for (const c of computeds) {
			c.get()
		}
	})

	// Read all computeds when nothing changed
	benchmark(
		'many-computeds-no-change',
		`Read ${numComputeds} computeds (${depsPerComputed} deps each) when nothing changed`,
		1_000,
		() => {
			for (const c of computeds) {
				c.get()
			}
		}
	)

	stop()
}

// ============================================================================
// Benchmark 12: Many computeds - change one atom
// ============================================================================
function benchmarkManyComputedsOneChange() {
	const numAtoms = 100
	const numComputeds = 5000
	const depsPerComputed = 3

	const atoms = Array.from({ length: numAtoms }, (_, i) => atom(`atom-${i}`, i))

	const computeds = Array.from({ length: numComputeds }, (_, i) => {
		const dep1 = atoms[i % numAtoms]
		const dep2 = atoms[(i * 7) % numAtoms]
		const dep3 = atoms[(i * 13) % numAtoms]
		return computed(`computed-${i}`, () => dep1.get() + dep2.get() + dep3.get())
	})

	const stop = react('listener', () => {
		for (const c of computeds) {
			c.get()
		}
	})

	let counter = 0
	benchmark(
		'many-computeds-one-change',
		`Change 1 atom affecting ~${Math.round((numComputeds / numAtoms) * depsPerComputed)} computeds, read all ${numComputeds}`,
		500,
		() => {
			// Change atom 0, which affects computeds where i % 100 == 0, (i*7) % 100 == 0, or (i*13) % 100 == 0
			atoms[0].set(counter++)
			for (const c of computeds) {
				c.get()
			}
		}
	)

	stop()
}

// ============================================================================
// Benchmark 13: Many computeds - change all atoms in transaction
// ============================================================================
function benchmarkManyComputedsAllChange() {
	const numAtoms = 100
	const numComputeds = 5000

	const atoms = Array.from({ length: numAtoms }, (_, i) => atom(`atom-${i}`, i))

	const computeds = Array.from({ length: numComputeds }, (_, i) => {
		const dep1 = atoms[i % numAtoms]
		const dep2 = atoms[(i * 7) % numAtoms]
		const dep3 = atoms[(i * 13) % numAtoms]
		return computed(`computed-${i}`, () => dep1.get() + dep2.get() + dep3.get())
	})

	const stop = react('listener', () => {
		for (const c of computeds) {
			c.get()
		}
	})

	let counter = 0
	benchmark(
		'many-computeds-all-change',
		`Change all ${numAtoms} atoms in transaction, read all ${numComputeds} computeds`,
		100,
		() => {
			transact(() => {
				for (const a of atoms) {
					a.set(counter++)
				}
			})
			for (const c of computeds) {
				c.get()
			}
		}
	)

	stop()
}

// ============================================================================
// Benchmark 14: Many computeds - subset read after change
// ============================================================================
function benchmarkManyComputedsPartialRead() {
	const numAtoms = 100
	const numComputeds = 5000

	const atoms = Array.from({ length: numAtoms }, (_, i) => atom(`atom-${i}`, i))

	const computeds = Array.from({ length: numComputeds }, (_, i) => {
		const dep1 = atoms[i % numAtoms]
		const dep2 = atoms[(i * 7) % numAtoms]
		const dep3 = atoms[(i * 13) % numAtoms]
		return computed(`computed-${i}`, () => dep1.get() + dep2.get() + dep3.get())
	})

	const stop = react('listener', () => {
		for (const c of computeds) {
			c.get()
		}
	})

	let counter = 0
	// Only read first 100 computeds (simulating viewport culling)
	const subset = computeds.slice(0, 100)

	benchmark(
		'many-computeds-partial-read',
		`Change 1 atom, read only 100 of ${numComputeds} computeds`,
		2_000,
		() => {
			atoms[0].set(counter++)
			for (const c of subset) {
				c.get()
			}
		}
	)

	stop()
}

// ============================================================================
// Run all benchmarks and generate markdown report
// ============================================================================

function generateMarkdownReport(): string {
	const timestamp = new Date().toISOString()

	let md = `# @tldraw/state Performance Benchmark

Generated: ${timestamp}

## System info
- Node.js: ${process.version}
- Platform: ${process.platform} ${process.arch}
- Trials per benchmark: ${TRIALS}

## Results

| Benchmark | Description | Ops/sec | Avg (ms) | Std Dev (ms) | Min (ms) | Max (ms) | Iterations |
|-----------|-------------|--------:|----------|--------------|----------|----------|------------|
`

	for (const r of results) {
		md += `| ${r.name} | ${r.description} | ${r.opsPerSec.toLocaleString()} | ${r.avgMs.toFixed(6)} | ${r.stdDevMs.toFixed(6)} | ${r.minMs.toFixed(6)} | ${r.maxMs.toFixed(6)} | ${r.iterations.toLocaleString()} |\n`
	}

	md += `
## Benchmark descriptions

### Key optimization targets
- **deep-chain-no-change**: Primary target for dirty-bit optimization. Reading a deep chain when nothing changed should be O(1) with the optimization.
- **selective-dirty**: Tests that unchanged branches of the dependency graph are efficiently skipped.
- **diamond-no-change**: Tests that diamond patterns (shared dependencies) are handled efficiently.

### Baseline measurements
- ***-with-change**: These measure the cost when recomputation is actually needed.
- **cold-read**: Measures performance when computed signals are not actively listening.
- **reactor-start-stop**: Measures attach/detach overhead.

## Notes

Higher ops/sec is better. Lower avg time is better. Lower std dev indicates more consistent performance.
`

	return md
}

function generateJsonReport(): string {
	return JSON.stringify(
		{
			timestamp: new Date().toISOString(),
			system: {
				nodeVersion: process.version,
				platform: process.platform,
				arch: process.arch,
			},
			config: {
				trials: TRIALS,
			},
			results,
		},
		null,
		2
	)
}

// Parse command line arguments
const args = process.argv.slice(2)
const jsonFlag = args.includes('--json')
const outputArg = args.find((arg) => !arg.startsWith('--'))

// Run all benchmarks
log('Running @tldraw/state performance benchmarks...\n')
log(`Configuration: ${TRIALS} trials per benchmark\n`)

benchmarkDeepChainNoChange()
benchmarkDeepChainWithChange()
benchmarkWideGraphNoChange()
benchmarkWideGraphWithChange()
benchmarkSelectiveDirty()
benchmarkReactorCycle()
benchmarkTransaction()
benchmarkDiamondPattern()
benchmarkDiamondPatternWithChange()
benchmarkColdRead()
benchmarkManyComputedsFewAtoms()
benchmarkManyComputedsOneChange()
benchmarkManyComputedsAllChange()
benchmarkManyComputedsPartialRead()

log('\n--- Benchmark complete ---\n')

// Generate and save report
if (jsonFlag) {
	const report = generateJsonReport()
	const outputPath = outputArg || path.join(__dirname, 'benchmark-results.json')
	fs.writeFileSync(outputPath, report)
	log(`JSON report saved to: ${outputPath}`)
} else {
	const report = generateMarkdownReport()
	const outputPath = outputArg || path.join(__dirname, 'benchmark-results.md')
	fs.writeFileSync(outputPath, report)
	log(`Markdown report saved to: ${outputPath}`)
}
