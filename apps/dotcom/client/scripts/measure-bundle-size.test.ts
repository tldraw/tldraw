import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { gzipSync } from 'zlib'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
	BundleAsset,
	getAssetCategory,
	getBundleSizeEvents,
	getInitialAssetNames,
	measureBundleSize,
	stripContentHash,
	summarizeAssets,
} from './measure-bundle-size'

describe('getAssetCategory', () => {
	it('categorizes assets by extension', () => {
		expect(getAssetCategory('index-BdIhNi0J.js')).toBe('js')
		expect(getAssetCategory('index-BdIhNi0J.css')).toBe('css')
		expect(getAssetCategory('IBMPlexSans-Medium-CxYz1234.woff2')).toBe('font')
		expect(getAssetCategory('0_merged-abcd1234.svg')).toBe('image')
		expect(getAssetCategory('en-abcd1234.json')).toBe('json')
		expect(getAssetCategory('something-abcd1234.wasm')).toBe('other')
	})
})

describe('stripContentHash', () => {
	it('removes the content hash so a chunk is comparable across builds', () => {
		expect(stripContentHash('index-BdIhNi0J.js')).toBe('index.js')
		expect(stripContentHash('TlaEditor-_a1B2c3D.js')).toBe('TlaEditor.js')
		expect(stripContentHash('IBMPlexSans-Medium-CxYz1234.woff2')).toBe('IBMPlexSans-Medium.woff2')
	})

	it('leaves names without a hash alone', () => {
		expect(stripContentHash('index.js')).toBe('index.js')
		expect(stripContentHash('IBMPlexSans-Medium.woff2')).toBe('IBMPlexSans-Medium.woff2')
	})
})

describe('getInitialAssetNames', () => {
	it('collects every asset index.html references', () => {
		const html = `<!doctype html><html><head>
			<script type="module" crossorigin src="/assets/index-BdIhNi0J.js"></script>
			<link rel="modulepreload" crossorigin href="/assets/vendor-CxYz1234.js">
			<link rel="stylesheet" crossorigin href="/assets/index-DeFg5678.css">
			<link rel="preload" href="/assets/IBMPlexSans-Medium-HiJk9012.woff2" as="font">
			<link rel="preload" href="/assets/0_merged-LmNo3456.svg" as="image">
			<link rel="icon" href="/favicon.svg">
		</head><body></body></html>`

		expect(getInitialAssetNames(html)).toEqual(
			new Set([
				'index-BdIhNi0J.js',
				'vendor-CxYz1234.js',
				'index-DeFg5678.css',
				'IBMPlexSans-Medium-HiJk9012.woff2',
				'0_merged-LmNo3456.svg',
			])
		)
	})

	it('ignores query strings and assets outside /assets', () => {
		const html = `<script src="/assets/index-BdIhNi0J.js?v=1"></script><img src="/logo.png">`
		expect(getInitialAssetNames(html)).toEqual(new Set(['index-BdIhNi0J.js']))
	})
})

describe('summarizeAssets', () => {
	function asset(overrides: Partial<BundleAsset>): BundleAsset {
		return {
			fileName: 'index-BdIhNi0J.js',
			name: 'index.js',
			category: 'js',
			bytes: 100,
			gzipBytes: 40,
			isInitial: false,
			...overrides,
		}
	}

	const noAssets = {
		font: { count: 0, bytes: 0, gzipBytes: 0 },
		image: { count: 0, bytes: 0, gzipBytes: 0 },
		json: { count: 0, bytes: 0, gzipBytes: 0 },
		other: { count: 0, bytes: 0, gzipBytes: 0 },
	}

	it('totals assets overall, by category, and across the initial payload', () => {
		const report = summarizeAssets([
			asset({ bytes: 100, gzipBytes: 40, isInitial: true }),
			asset({ bytes: 200, gzipBytes: 60 }),
			asset({ category: 'css', bytes: 50, gzipBytes: 20, isInitial: true }),
		])

		expect(report.total).toEqual({ count: 3, bytes: 350, gzipBytes: 120 })
		expect(report.initial).toEqual({ count: 2, bytes: 150, gzipBytes: 60 })
		expect(report.byCategory).toEqual({
			js: { count: 2, bytes: 300, gzipBytes: 100 },
			css: { count: 1, bytes: 50, gzipBytes: 20 },
			...noAssets,
		})
		expect(report.initialByCategory).toEqual({
			js: { count: 1, bytes: 100, gzipBytes: 40 },
			css: { count: 1, bytes: 50, gzipBytes: 20 },
			...noAssets,
		})
	})
})

describe('measureBundleSize', () => {
	let staticDir: string

	beforeEach(() => {
		staticDir = mkdtempSync(join(tmpdir(), 'bundle-size-'))
		mkdirSync(join(staticDir, 'assets'))
	})

	afterEach(() => {
		rmSync(staticDir, { recursive: true, force: true })
	})

	function writeAsset(fileName: string, contents: string) {
		writeFileSync(join(staticDir, 'assets', fileName), contents)
	}

	it('measures raw and gzipped sizes, and marks assets index.html loads as initial', () => {
		const entry = 'a'.repeat(1000)
		const lazy = 'b'.repeat(500)
		writeAsset('index-BdIhNi0J.js', entry)
		writeAsset('TlaEditor-CxYz1234.js', lazy)
		writeFileSync(
			join(staticDir, 'index.html'),
			`<script type="module" src="/assets/index-BdIhNi0J.js"></script>`
		)

		const report = measureBundleSize(staticDir)

		expect(report.assets).toEqual([
			{
				fileName: 'index-BdIhNi0J.js',
				name: 'index.js',
				category: 'js',
				bytes: 1000,
				gzipBytes: gzipSync(entry).byteLength,
				isInitial: true,
			},
			{
				fileName: 'TlaEditor-CxYz1234.js',
				name: 'TlaEditor.js',
				category: 'js',
				bytes: 500,
				gzipBytes: gzipSync(lazy).byteLength,
				isInitial: false,
			},
		])
		expect(report.initial.bytes).toBe(1000)
	})

	it('skips source maps, which are only downloaded with devtools open', () => {
		writeAsset('index-BdIhNi0J.js', 'console.log(1)')
		writeAsset('index-BdIhNi0J.js.map', 'x'.repeat(10000))
		writeFileSync(join(staticDir, 'index.html'), '<html></html>')

		const report = measureBundleSize(staticDir)

		expect(report.assets.map((asset) => asset.fileName)).toEqual(['index-BdIhNi0J.js'])
	})
})

describe('getBundleSizeEvents', () => {
	it('reports totals once and the largest assets individually', () => {
		const report = summarizeAssets([
			{
				fileName: 'index-BdIhNi0J.js',
				name: 'index.js',
				category: 'js',
				bytes: 100,
				gzipBytes: 40,
				isInitial: true,
			},
		])

		const [summary, ...assets] = getBundleSizeEvents(report, { git_commit: 'abc123' })

		expect(summary).toEqual({
			event: 'dotcom_bundle_size',
			distinctId: 'dotcom-bundle-size',
			properties: {
				git_commit: 'abc123',
				total_bytes: 100,
				total_gzip_bytes: 40,
				total_count: 1,
				initial_bytes: 100,
				initial_gzip_bytes: 40,
				initial_count: 1,
				js_bytes: 100,
				js_gzip_bytes: 40,
				js_count: 1,
				initial_js_bytes: 100,
				initial_js_gzip_bytes: 40,
				initial_js_count: 1,
				css_bytes: 0,
				css_gzip_bytes: 0,
				css_count: 0,
				initial_css_bytes: 0,
				initial_css_gzip_bytes: 0,
				initial_css_count: 0,
				font_bytes: 0,
				font_gzip_bytes: 0,
				font_count: 0,
				initial_font_bytes: 0,
				initial_font_gzip_bytes: 0,
				initial_font_count: 0,
				image_bytes: 0,
				image_gzip_bytes: 0,
				image_count: 0,
				initial_image_bytes: 0,
				initial_image_gzip_bytes: 0,
				initial_image_count: 0,
				json_bytes: 0,
				json_gzip_bytes: 0,
				json_count: 0,
				initial_json_bytes: 0,
				initial_json_gzip_bytes: 0,
				initial_json_count: 0,
				other_bytes: 0,
				other_gzip_bytes: 0,
				other_count: 0,
				initial_other_bytes: 0,
				initial_other_gzip_bytes: 0,
				initial_other_count: 0,
			},
		})
		expect(assets).toEqual([
			{
				event: 'dotcom_bundle_size_asset',
				distinctId: 'dotcom-bundle-size',
				properties: {
					git_commit: 'abc123',
					asset_name: 'index.js',
					asset_file_name: 'index-BdIhNi0J.js',
					asset_category: 'js',
					asset_is_initial: true,
					bytes: 100,
					gzip_bytes: 40,
				},
			},
		])
	})
})
