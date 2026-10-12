import { readFileSync, readdirSync, statSync } from 'fs'
import { extname, join } from 'path'
import { gzipSync } from 'zlib'
import { nicelog } from '../../../../internal/scripts/lib/nicelog'
import { captureCiMetricEvents, CiMetricEvent } from '../../../../internal/scripts/lib/posthog'

// How many of the largest assets we report individually alongside the totals — enough to attribute
// a jump in the total to the chunk that caused it, without sending an event per file on every
// deploy. Assets in the initial payload are always reported, however small: they're the ones we
// most want to be able to explain a change in.
const TOP_ASSET_COUNT = 25

export type AssetCategory = 'js' | 'css' | 'font' | 'image' | 'json' | 'other'

const EXTENSIONS_BY_CATEGORY: Record<Exclude<AssetCategory, 'other'>, string[]> = {
	js: ['.js', '.mjs'],
	css: ['.css'],
	font: ['.woff2', '.woff', '.ttf', '.otf'],
	image: ['.svg', '.png', '.jpg', '.jpeg', '.webp', '.avif', '.gif', '.ico'],
	// mostly the compiled translations, which are worth telling apart from everything else
	json: ['.json'],
}

export const ASSET_CATEGORIES: AssetCategory[] = ['js', 'css', 'font', 'image', 'json', 'other']

export interface BundleAsset {
	fileName: string
	/** `fileName` with the content hash removed, so the same chunk is comparable across builds. */
	name: string
	category: AssetCategory
	bytes: number
	gzipBytes: number
	/** Whether the browser downloads this asset to render the app, before any lazy loading. */
	isInitial: boolean
}

export interface BundleSizeGroup {
	count: number
	bytes: number
	gzipBytes: number
}

export interface BundleSizeReport {
	assets: BundleAsset[]
	total: BundleSizeGroup
	initial: BundleSizeGroup
	byCategory: Record<AssetCategory, BundleSizeGroup>
	/**
	 * The initial payload split up, because its two halves move for unrelated reasons: the js grows
	 * when we add application code, the fonts only when we change which ones we preload.
	 */
	initialByCategory: Record<AssetCategory, BundleSizeGroup>
}

export function getAssetCategory(fileName: string): AssetCategory {
	const extension = extname(fileName).toLowerCase()
	for (const [category, extensions] of Object.entries(EXTENSIONS_BY_CATEGORY)) {
		if (extensions.includes(extension)) return category as AssetCategory
	}
	return 'other'
}

/**
 * Strip vite's content hash from an asset file name, so `index-BdIhNi0J.js` becomes `index.js` and
 * the same chunk can be followed from one build to the next. Hashes are 8 url-safe base64 chars,
 * which is short enough that a real name segment could look like one — but only if it's exactly 8
 * characters and sits right before the extension, which is rare enough to live with.
 */
export function stripContentHash(fileName: string) {
	return fileName.replace(/-[A-Za-z0-9_-]{8}(\.[A-Za-z0-9]+)$/, '$1')
}

/**
 * The assets referenced directly by index.html: the entry chunk, its modulepreloads, stylesheets,
 * and the fonts and sprite sheet the build script preloads. Together these are what a visitor
 * downloads before anything renders, which is the number that matters most for load time.
 */
export function getInitialAssetNames(indexHtml: string) {
	const names = new Set<string>()
	for (const match of indexHtml.matchAll(/(?:src|href)="\/assets\/([^"?#]+)/g)) {
		names.add(match[1])
	}
	return names
}

function emptyGroup(): BundleSizeGroup {
	return { count: 0, bytes: 0, gzipBytes: 0 }
}

function addToGroup(group: BundleSizeGroup, asset: BundleAsset) {
	group.count += 1
	group.bytes += asset.bytes
	group.gzipBytes += asset.gzipBytes
}

function emptyCategoryGroups() {
	return Object.fromEntries(ASSET_CATEGORIES.map((category) => [category, emptyGroup()])) as Record<
		AssetCategory,
		BundleSizeGroup
	>
}

export function summarizeAssets(assets: BundleAsset[]): BundleSizeReport {
	const report: BundleSizeReport = {
		assets,
		total: emptyGroup(),
		initial: emptyGroup(),
		byCategory: emptyCategoryGroups(),
		initialByCategory: emptyCategoryGroups(),
	}

	for (const asset of assets) {
		addToGroup(report.total, asset)
		addToGroup(report.byCategory[asset.category], asset)
		if (asset.isInitial) {
			addToGroup(report.initial, asset)
			addToGroup(report.initialByCategory[asset.category], asset)
		}
	}

	return report
}

/**
 * Measure every file in the built assets directory. Source maps are skipped: we serve them, but
 * they're only fetched when devtools is open, so counting them would swamp the numbers a visitor
 * actually pays for. Files in `public/` are skipped too — they're copied verbatim rather than
 * bundled, so they don't move when application code changes.
 */
export function measureBundleSize(staticDir: string): BundleSizeReport {
	const assetsDir = join(staticDir, 'assets')
	const initialAssetNames = getInitialAssetNames(
		readFileSync(join(staticDir, 'index.html'), 'utf8')
	)

	const assets = readdirSync(assetsDir)
		.filter(
			(fileName) => !fileName.endsWith('.map') && statSync(join(assetsDir, fileName)).isFile()
		)
		.map((fileName): BundleAsset => {
			const contents = readFileSync(join(assetsDir, fileName))
			return {
				fileName,
				name: stripContentHash(fileName),
				category: getAssetCategory(fileName),
				bytes: contents.byteLength,
				gzipBytes: gzipSync(contents).byteLength,
				isInitial: initialAssetNames.has(fileName),
			}
		})
		.sort((a, b) => b.gzipBytes - a.gzipBytes)

	return summarizeAssets(assets)
}

function formatKb(bytes: number) {
	return `${(bytes / 1024).toFixed(1)} kB`
}

export function formatBundleSizeReport(report: BundleSizeReport) {
	function section(label: string, total: BundleSizeGroup, groups: Record<string, BundleSizeGroup>) {
		return [
			[label, total] as [string, BundleSizeGroup],
			...ASSET_CATEGORIES.filter((category) => groups[category].count > 0).map(
				(category): [string, BundleSizeGroup] => [`  ${category}`, groups[category]]
			),
		]
	}

	const rows = [
		...section('initial payload', report.initial, report.initialByCategory),
		...section('all assets', report.total, report.byCategory),
	]

	const labelWidth = Math.max(...rows.map(([label]) => label.length))
	return rows
		.map(
			([label, group]) =>
				`  ${label.padEnd(labelWidth)}  ${formatKb(group.gzipBytes).padStart(10)} gzipped` +
				`  ${formatKb(group.bytes).padStart(10)} raw  (${group.count} files)`
		)
		.join('\n')
}

export function getBundleSizeEvents(
	report: BundleSizeReport,
	context: Record<string, unknown>
): CiMetricEvent[] {
	const categoryProperties: Record<string, number> = {}
	for (const category of ASSET_CATEGORIES) {
		for (const [prefix, groups] of [
			['', report.byCategory],
			['initial_', report.initialByCategory],
		] as const) {
			const group = groups[category]
			categoryProperties[`${prefix}${category}_bytes`] = group.bytes
			categoryProperties[`${prefix}${category}_gzip_bytes`] = group.gzipBytes
			categoryProperties[`${prefix}${category}_count`] = group.count
		}
	}

	return [
		{
			event: 'dotcom_bundle_size',
			distinctId: 'dotcom-bundle-size',
			properties: {
				...context,
				total_bytes: report.total.bytes,
				total_gzip_bytes: report.total.gzipBytes,
				total_count: report.total.count,
				initial_bytes: report.initial.bytes,
				initial_gzip_bytes: report.initial.gzipBytes,
				initial_count: report.initial.count,
				...categoryProperties,
			},
		},
		...report.assets
			.filter((asset, index) => asset.isInitial || index < TOP_ASSET_COUNT)
			.map(
				(asset): CiMetricEvent => ({
					event: 'dotcom_bundle_size_asset',
					distinctId: 'dotcom-bundle-size',
					properties: {
						...context,
						asset_name: asset.name,
						asset_file_name: asset.fileName,
						asset_category: asset.category,
						asset_is_initial: asset.isInitial,
						bytes: asset.bytes,
						gzip_bytes: asset.gzipBytes,
					},
				})
			),
	]
}

/**
 * Measure the built client and, when `BUNDLE_SIZE_ANALYTICS_ENABLED` is set, send the results to
 * PostHog so we can watch the bundle over time. Reporting never fails the build: a bundle size
 * datapoint isn't worth breaking a deploy over.
 *
 * Call this on the finished `.vercel/output/static` directory, and before the deploy script
 * coalesces previous deploys' assets into it — those older files are still served for open tabs,
 * but they aren't part of this build.
 */
export async function reportBundleSize(staticDir: string) {
	try {
		const report = measureBundleSize(staticDir)
		nicelog(`Bundle size:\n${formatBundleSizeReport(report)}`)

		if (process.env.BUNDLE_SIZE_ANALYTICS_ENABLED !== 'true') {
			nicelog('Bundle size analytics disabled, not reporting to PostHog')
			return
		}

		// See https://eu.posthog.com/project/45972
		await captureCiMetricEvents(
			getBundleSizeEvents(report, {
				git_commit: process.env.RELEASE_COMMIT_HASH || process.env.GITHUB_SHA,
				git_branch: process.env.GITHUB_REF_NAME,
				tldraw_env: process.env.TLDRAW_ENV,
				ci_environment: process.env.GITHUB_ACTIONS ? 'github-actions' : 'local',
			})
		)
	} catch (error) {
		console.error('Failed to measure or report bundle size:', error)
	}
}
