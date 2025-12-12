/* eslint-disable no-console */
/**
 * Performance comparison between native, oldSchool, and custom implementations.
 * Run with: npx tsx packages/tlschema/src/misc/base64.perf.ts
 */

import {
	customBase64ToVecs,
	customVecsToBase64,
	nativeBase64ToVecs,
	nativeVecsToBase64,
	oldSchoolBase64ToVecs,
	oldSchoolVecsToBase64,
} from '../misc/base64'
import { VecModel } from '../misc/geometry-types'

// Check for native support
const hasFromBase64 =
	'fromBase64' in Uint8Array && typeof (Uint8Array as any).fromBase64 === 'function'
const hasToBase64 =
	'toBase64' in Uint8Array.prototype && typeof Uint8Array.prototype.toBase64 === 'function'
const hasFloat16Array = typeof Float16Array !== 'undefined'
const hasNativeSupport = hasFromBase64 && hasToBase64 && hasFloat16Array

console.log('='.repeat(70))
console.log('Base64 Vec Encoding Performance Comparison')
console.log('='.repeat(70))
console.log()
console.log('Implementations:')
console.log('  Native:    Float16Array + Uint8Array.toBase64/fromBase64')
console.log('  OldSchool: Custom Float16 + btoa/atob')
console.log('  Custom:    Custom Float16 + custom base64 (no btoa/atob)')
console.log()
console.log('Native support:', hasNativeSupport ? 'YES' : 'NO')
console.log('  Float16Array:', hasFloat16Array ? '✓' : '✗')
console.log('  Uint8Array.fromBase64:', hasFromBase64 ? '✓' : '✗')
console.log('  Uint8Array.toBase64:', hasToBase64 ? '✓' : '✗')
console.log()

// Generate test data
function generateVecs(count: number): VecModel[] {
	return Array.from({ length: count }, (_, _i) => ({
		x: Math.random() * 1000 - 500,
		y: Math.random() * 1000 - 500,
		z: Math.random(),
	}))
}

function benchmark(name: string, fn: () => void, iterations: number): number {
	// Warmup
	for (let i = 0; i < Math.min(100, iterations / 10); i++) {
		fn()
	}

	const start = performance.now()
	for (let i = 0; i < iterations; i++) {
		fn()
	}
	const elapsed = performance.now() - start
	const opsPerSec = (iterations / elapsed) * 1000

	return opsPerSec
}

const testSizes = [1, 10, 100, 1000]
const iterations = 10000

// Helper to format numbers
const fmt = (n: number) => Math.round(n).toLocaleString().padEnd(14)

console.log('Benchmark: Encoding (vecsToBase64)')
console.log('-'.repeat(70))
if (hasNativeSupport) {
	console.log(
		'Points'.padEnd(8),
		'Custom'.padEnd(14),
		'OldSchool'.padEnd(14),
		'Native'.padEnd(14),
		'Custom/Old'.padEnd(12),
		'Native/Old'
	)
} else {
	console.log('Points'.padEnd(8), 'Custom'.padEnd(14), 'OldSchool'.padEnd(14), 'Custom/Old')
}

for (const size of testSizes) {
	const vecs = generateVecs(size)
	const iters = Math.max(100, Math.floor(iterations / size))

	const customOps = benchmark('custom encode', () => customVecsToBase64(vecs), iters)
	const oldSchoolOps = benchmark('oldSchool encode', () => oldSchoolVecsToBase64(vecs), iters)

	if (hasNativeSupport) {
		const nativeOps = benchmark('native encode', () => nativeVecsToBase64(vecs), iters)
		console.log(
			size.toString().padEnd(8),
			fmt(customOps),
			fmt(oldSchoolOps),
			fmt(nativeOps),
			`${(customOps / oldSchoolOps).toFixed(2)}x`.padEnd(12),
			`${(nativeOps / oldSchoolOps).toFixed(2)}x`
		)
	} else {
		console.log(
			size.toString().padEnd(8),
			fmt(customOps),
			fmt(oldSchoolOps),
			`${(customOps / oldSchoolOps).toFixed(2)}x`
		)
	}
}

console.log()
console.log('Benchmark: Decoding (base64ToVecs)')
console.log('-'.repeat(70))
if (hasNativeSupport) {
	console.log(
		'Points'.padEnd(8),
		'Custom'.padEnd(14),
		'OldSchool'.padEnd(14),
		'Native'.padEnd(14),
		'Custom/Old'.padEnd(12),
		'Native/Old'
	)
} else {
	console.log('Points'.padEnd(8), 'Custom'.padEnd(14), 'OldSchool'.padEnd(14), 'Custom/Old')
}

for (const size of testSizes) {
	const vecs = generateVecs(size)
	const encoded = oldSchoolVecsToBase64(vecs)
	const iters = Math.max(100, Math.floor(iterations / size))

	const customOps = benchmark('custom decode', () => customBase64ToVecs(encoded), iters)
	const oldSchoolOps = benchmark('oldSchool decode', () => oldSchoolBase64ToVecs(encoded), iters)

	if (hasNativeSupport) {
		const nativeOps = benchmark('native decode', () => nativeBase64ToVecs(encoded), iters)
		console.log(
			size.toString().padEnd(8),
			fmt(customOps),
			fmt(oldSchoolOps),
			fmt(nativeOps),
			`${(customOps / oldSchoolOps).toFixed(2)}x`.padEnd(12),
			`${(nativeOps / oldSchoolOps).toFixed(2)}x`
		)
	} else {
		console.log(
			size.toString().padEnd(8),
			fmt(customOps),
			fmt(oldSchoolOps),
			`${(customOps / oldSchoolOps).toFixed(2)}x`
		)
	}
}

console.log()
console.log('Benchmark: Roundtrip (encode + decode)')
console.log('-'.repeat(70))
if (hasNativeSupport) {
	console.log(
		'Points'.padEnd(8),
		'Custom'.padEnd(14),
		'OldSchool'.padEnd(14),
		'Native'.padEnd(14),
		'Custom/Old'.padEnd(12),
		'Native/Old'
	)
} else {
	console.log('Points'.padEnd(8), 'Custom'.padEnd(14), 'OldSchool'.padEnd(14), 'Custom/Old')
}

for (const size of testSizes) {
	const vecs = generateVecs(size)
	const iters = Math.max(100, Math.floor(iterations / size))

	const customOps = benchmark(
		'custom roundtrip',
		() => {
			const encoded = customVecsToBase64(vecs)
			customBase64ToVecs(encoded)
		},
		iters
	)

	const oldSchoolOps = benchmark(
		'oldSchool roundtrip',
		() => {
			const encoded = oldSchoolVecsToBase64(vecs)
			oldSchoolBase64ToVecs(encoded)
		},
		iters
	)

	if (hasNativeSupport) {
		const nativeOps = benchmark(
			'native roundtrip',
			() => {
				const encoded = nativeVecsToBase64(vecs)
				nativeBase64ToVecs(encoded)
			},
			iters
		)
		console.log(
			size.toString().padEnd(8),
			fmt(customOps),
			fmt(oldSchoolOps),
			fmt(nativeOps),
			`${(customOps / oldSchoolOps).toFixed(2)}x`.padEnd(12),
			`${(nativeOps / oldSchoolOps).toFixed(2)}x`
		)
	} else {
		console.log(
			size.toString().padEnd(8),
			fmt(customOps),
			fmt(oldSchoolOps),
			`${(customOps / oldSchoolOps).toFixed(2)}x`
		)
	}
}

console.log()
console.log('='.repeat(70))
