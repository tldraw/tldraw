import { describe, expect, it, beforeAll } from 'vitest'
import {
	initCompression,
	compressMessage,
	decompressMessage,
	compressMessageWithMetrics,
	compressMessagePlain,
	isCompressedMessage,
} from '../compression'

// Representative tldraw sync messages for benchmarking compression
const SAMPLE_MESSAGES = {
	ping: JSON.stringify({ type: 'ping' }),
	pong: JSON.stringify({ type: 'pong' }),

	push_cursor_move: JSON.stringify({
		type: 'push',
		clientClock: 42,
		presence: [
			'patch',
			{
				cursor: ['patch', { x: ['put', 523.7], y: ['put', 312.4] }],
			},
		],
	}),

	push_shape_move: JSON.stringify({
		type: 'push',
		clientClock: 15,
		diff: {
			'shape:abc123def456': [
				'patch',
				{
					x: ['put', 150.5],
					y: ['put', 275.3],
				},
			],
		},
	}),

	push_shape_create: JSON.stringify({
		type: 'push',
		clientClock: 1,
		diff: {
			'shape:newshape123456': [
				'put',
				{
					id: 'shape:newshape123456',
					typeName: 'shape',
					type: 'geo',
					x: 200,
					y: 300,
					rotation: 0,
					isLocked: false,
					opacity: 1,
					parentId: 'page:page1',
					index: 'a1',
					meta: {},
					props: {
						w: 200,
						h: 150,
						geo: 'rectangle',
						color: 'black',
						labelColor: 'black',
						fill: 'none',
						dash: 'draw',
						size: 'm',
						font: 'draw',
						text: '',
						align: 'middle',
						verticalAlign: 'middle',
						growY: 0,
						url: '',
						scale: 1,
					},
				},
			],
		},
	}),

	push_draw_shape: JSON.stringify({
		type: 'push',
		clientClock: 5,
		diff: {
			'shape:drawshape789': [
				'put',
				{
					id: 'shape:drawshape789',
					typeName: 'shape',
					type: 'draw',
					x: 100,
					y: 100,
					rotation: 0,
					isLocked: false,
					opacity: 1,
					parentId: 'page:page1',
					index: 'a2',
					meta: {},
					props: {
						segments: [
							{
								type: 'free',
								points: [
									{ x: 0, y: 0, z: 0.5 },
									{ x: 2.5, y: 1.3, z: 0.5 },
									{ x: 5.1, y: 3.7, z: 0.5 },
									{ x: 8.2, y: 7.1, z: 0.5 },
									{ x: 12.4, y: 11.6, z: 0.5 },
									{ x: 17.8, y: 16.2, z: 0.5 },
									{ x: 24.3, y: 21.9, z: 0.5 },
									{ x: 31.5, y: 27.4, z: 0.5 },
									{ x: 39.8, y: 33.1, z: 0.5 },
									{ x: 48.2, y: 38.7, z: 0.5 },
								],
							},
						],
						color: 'black',
						fill: 'none',
						dash: 'draw',
						size: 'm',
						isComplete: false,
						isClosed: false,
						isPen: false,
						scale: 1,
					},
				},
			],
		},
	}),

	server_patch: JSON.stringify({
		type: 'patch',
		diff: {
			'shape:abc123def456': [
				'patch',
				{
					x: ['put', 250],
					y: ['put', 350],
				},
			],
		},
		serverClock: 99,
	}),

	server_data_batch: JSON.stringify({
		type: 'data',
		data: [
			{
				type: 'patch',
				diff: {
					'shape:shape001': ['patch', { x: ['put', 100] }],
					'shape:shape002': ['patch', { y: ['put', 200] }],
				},
				serverClock: 50,
			},
			{
				type: 'push_result',
				clientClock: 10,
				serverClock: 50,
				action: 'commit',
			},
		],
	}),

	server_presence_patch: JSON.stringify({
		type: 'patch',
		diff: {
			'instance_presence:user123abc': [
				'patch',
				{
					cursor: [
						'patch',
						{
							x: ['put', 750.2],
							y: ['put', 420.8],
						},
					],
				},
			],
		},
		serverClock: 101,
	}),

	connect_request: JSON.stringify({
		type: 'connect',
		connectRequestId: 'conn-abc123def456',
		lastServerClock: 0,
		protocolVersion: 8,
		schema: {
			schemaVersion: 2,
			sequences: {
				'com.tldraw.store': 7,
				'com.tldraw.shape.arrow': 6,
				'com.tldraw.shape.bookmark': 3,
				'com.tldraw.shape.draw': 2,
				'com.tldraw.shape.embed': 5,
				'com.tldraw.shape.frame': 1,
				'com.tldraw.shape.geo': 10,
				'com.tldraw.shape.group': 0,
				'com.tldraw.shape.highlight': 1,
				'com.tldraw.shape.image': 5,
				'com.tldraw.shape.line': 6,
				'com.tldraw.shape.note': 9,
				'com.tldraw.shape.text': 3,
				'com.tldraw.shape.video': 2,
				'com.tldraw.document': 2,
				'com.tldraw.instance': 27,
				'com.tldraw.page': 2,
				'com.tldraw.asset': 5,
				'com.tldraw.camera': 2,
				'com.tldraw.instance_page_state': 9,
				'com.tldraw.pointer': 1,
				'com.tldraw.instance_presence': 7,
			},
		},
	}),

	push_result_commit: JSON.stringify({
		type: 'push_result',
		clientClock: 42,
		serverClock: 99,
		action: 'commit',
	}),

	push_result_rebase: JSON.stringify({
		type: 'push_result',
		clientClock: 42,
		serverClock: 99,
		action: {
			rebaseWithDiff: {
				'shape:conflicted123': ['patch', { x: ['put', 999], y: ['put', 888] }],
			},
		},
	}),

	shape_delete: JSON.stringify({
		type: 'push',
		clientClock: 20,
		diff: {
			'shape:deleted123': ['remove'],
			'binding:binding456': ['remove'],
		},
	}),

	multi_shape_update: JSON.stringify({
		type: 'push',
		clientClock: 30,
		diff: {
			'shape:shape001': ['patch', { x: ['put', 100], y: ['put', 200] }],
			'shape:shape002': ['patch', { x: ['put', 300], y: ['put', 400] }],
			'shape:shape003': ['patch', { x: ['put', 500], y: ['put', 600] }],
			'shape:shape004': ['patch', { rotation: ['put', 1.5708] }],
		},
	}),
}

describe('zstd dictionary compression', () => {
	beforeAll(async () => {
		await initCompression()
	})

	it('round-trips all sample messages', () => {
		for (const [name, json] of Object.entries(SAMPLE_MESSAGES)) {
			const compressed = compressMessage(json)
			expect(compressed, `compress failed for ${name}`).not.toBeNull()

			const decompressed = decompressMessage(compressed!)
			expect(decompressed, `decompress failed for ${name}`).not.toBeNull()
			expect(JSON.parse(decompressed!)).toEqual(JSON.parse(json))
		}
	})

	it('identifies compressed messages', () => {
		const compressed = compressMessage(SAMPLE_MESSAGES.ping)!
		expect(isCompressedMessage(compressed)).toBe(true)
		expect(isCompressedMessage(new Uint8Array([0x7b, 0x22]))).toBe(false)
		expect(isCompressedMessage(new Uint8Array([]))).toBe(false)
	})

	it('reports compression metrics', () => {
		for (const [name, json] of Object.entries(SAMPLE_MESSAGES)) {
			const { metrics } = compressMessageWithMetrics(json)
			expect(metrics.method).toBe('zstd-dict')
			expect(metrics.originalSize).toBeGreaterThan(0)
			expect(metrics.compressedSize).toBeGreaterThan(0)
			expect(metrics.ratio).toBeGreaterThan(0)
		}
	})

	it('dictionary compression beats plain zstd for small structured messages', () => {
		const results: Array<{
			name: string
			originalSize: number
			dictSize: number
			plainSize: number
			dictRatio: number
			plainRatio: number
			dictWins: boolean
		}> = []

		let dictWinCount = 0

		for (const [name, json] of Object.entries(SAMPLE_MESSAGES)) {
			const { metrics: dictMetrics } = compressMessageWithMetrics(json)
			const { metrics: plainMetrics } = compressMessagePlain(json)

			const dictWins = dictMetrics.compressedSize < plainMetrics.compressedSize
			if (dictWins) dictWinCount++

			results.push({
				name,
				originalSize: dictMetrics.originalSize,
				dictSize: dictMetrics.compressedSize,
				plainSize: plainMetrics.compressedSize,
				dictRatio: dictMetrics.ratio,
				plainRatio: plainMetrics.ratio,
				dictWins,
			})
		}

		// Log a summary table
		console.log('\n=== ZSTD Dictionary Compression Benchmark ===')
		console.log(
			'%-25s %8s %8s %8s %7s %7s %s',
			'Message',
			'Original',
			'Dict',
			'Plain',
			'D-Ratio',
			'P-Ratio',
			'Winner'
		)
		console.log('-'.repeat(95))
		for (const r of results) {
			console.log(
				'%-25s %8d %8d %8d %7.2f %7.2f %s',
				r.name,
				r.originalSize,
				r.dictSize,
				r.plainSize,
				r.dictRatio,
				r.plainRatio,
				r.dictWins ? 'DICT' : 'plain'
			)
		}
		console.log('-'.repeat(95))

		const totalOrig = results.reduce((s, r) => s + r.originalSize, 0)
		const totalDict = results.reduce((s, r) => s + r.dictSize, 0)
		const totalPlain = results.reduce((s, r) => s + r.plainSize, 0)
		console.log(
			'%-25s %8d %8d %8d %7.2f %7.2f',
			'TOTAL',
			totalOrig,
			totalDict,
			totalPlain,
			totalOrig / totalDict,
			totalOrig / totalPlain
		)
		console.log(
			`\nDictionary wins: ${dictWinCount}/${results.length} messages (${((dictWinCount / results.length) * 100).toFixed(0)}%)`
		)
		console.log(
			`Overall bandwidth reduction vs uncompressed: ${((1 - totalDict / totalOrig) * 100).toFixed(1)}% (dict) vs ${((1 - totalPlain / totalOrig) * 100).toFixed(1)}% (plain)`
		)
		console.log(
			`Dictionary advantage over plain zstd: ${((1 - totalDict / totalPlain) * 100).toFixed(1)}%`
		)

		// The dictionary should provide meaningful compression for small messages
		// For structured JSON with known keys, we expect at least some benefit
		expect(dictWinCount).toBeGreaterThan(results.length * 0.3)
	})
})
