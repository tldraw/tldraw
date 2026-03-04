import { chromium } from '@playwright/test'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { mermaidFlowchartLoopFixtures } from '../../../packages/tldraw/src/test/fixtures/mermaidFlowchartLoopFixtures'

interface LoopResult {
	id: string
	title: string
	status: 'supported' | 'todo'
	expected: {
		geo: number
		arrow: number
		text: number
		requiredGeoLabels?: string[]
		forbiddenGeoLabels?: string[]
	}
	actual: {
		geo: number
		arrow: number
		text: number
		geoLabels: string[]
	}
	durationMs: number
	passed: boolean
	countsPass: boolean
	requiredLabelsPass: boolean
	forbiddenLabelsPass: boolean
	screenshot: string
	failureNotes: string[]
}

const STRICT_MODE = process.env.TLDRAW_MERMAID_LOOP_STRICT === '1'
const APP_URL = process.env.MERMAID_LOOP_URL ?? 'http://localhost:5420/develop'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const outputDir = path.join(__dirname, 'test-results', 'mermaid-flowchart-visual-loop')
const screenshotsDir = path.join(outputDir, 'screenshots')
const reportPath = path.join(outputDir, 'report.json')

async function main() {
	await rm(outputDir, { recursive: true, force: true })
	await mkdir(screenshotsDir, { recursive: true })

	const browser = await chromium.launch({ headless: true })
	const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
	const page = await context.newPage()

	try {
		await page.goto(APP_URL, { waitUntil: 'domcontentloaded' })
		await page.waitForSelector('.tl-canvas', { timeout: 15_000 })
		await page.waitForFunction(() => Boolean((window as any).app), null, { timeout: 15_000 })

		const results: LoopResult[] = []

		for (const [index, fixture] of mermaidFlowchartLoopFixtures.entries()) {
			const startedAt = Date.now()

			await page.evaluate(async (source) => {
				const editor = (window as any).app

				editor.selectAll().deleteShapes(editor.getSelectedShapeIds())
				editor.selectNone()
				editor.setCurrentTool('select')
				editor.user.updateUserPreferences({ colorScheme: 'light', animationSpeed: 0 })

				await editor.putExternalContent({
					type: 'text',
					text: source,
				})

				for (let i = 0; i < 6; i++) {
					await new Promise((resolve) => requestAnimationFrame(() => resolve(null)))
				}

				const shapes = editor.getCurrentPageShapes()
				if (shapes.length) {
					editor.select(...shapes.map((shape: any) => shape.id))
					editor.zoomToSelection()
					editor.selectNone()
				}
			}, fixture.source)

			const actual = await page.evaluate(() => {
				const editor = (window as any).app
				const shapes = editor.getCurrentPageShapes()
				const geoShapes = shapes.filter((shape: any) => shape.type === 'geo')

				return {
					geo: geoShapes.length,
					arrow: shapes.filter((shape: any) => shape.type === 'arrow').length,
					text: shapes.filter((shape: any) => shape.type === 'text').length,
					geoLabels: geoShapes.map((shape: any) =>
						editor.getShapeUtil('geo').getText(shape).trim()
					),
				}
			})

			const countsPass =
				actual.geo === fixture.expected.geo &&
				actual.arrow === fixture.expected.arrow &&
				actual.text === fixture.expected.text
			const requiredLabelsPass = (fixture.expected.requiredGeoLabels ?? []).every((label) =>
				actual.geoLabels.includes(label)
			)
			const forbiddenLabelsPass = (fixture.expected.forbiddenGeoLabels ?? []).every(
				(label) => !actual.geoLabels.includes(label)
			)
			const passed = countsPass && requiredLabelsPass && forbiddenLabelsPass

			const screenshotName = `${String(index + 1).padStart(2, '0')}-${fixture.id}.png`
			const screenshotPath = path.join(screenshotsDir, screenshotName)
			await page.locator('.tl-canvas').screenshot({
				path: screenshotPath,
				animations: 'disabled',
			})

			const failureNotes: string[] = []
			if (!countsPass) {
				failureNotes.push(
					`counts expected geo:${fixture.expected.geo} arrow:${fixture.expected.arrow} text:${fixture.expected.text} got geo:${actual.geo} arrow:${actual.arrow} text:${actual.text}`
				)
			}
			if (!forbiddenLabelsPass) {
				failureNotes.push(
					`forbidden labels present: ${(fixture.expected.forbiddenGeoLabels ?? [])
						.filter((label) => actual.geoLabels.includes(label))
						.join(', ')}`
				)
			}
			if (!requiredLabelsPass) {
				failureNotes.push(
					`required labels missing: ${(fixture.expected.requiredGeoLabels ?? [])
						.filter((label) => !actual.geoLabels.includes(label))
						.join(', ')}`
				)
			}

			results.push({
				id: fixture.id,
				title: fixture.title,
				status: fixture.status,
				expected: fixture.expected,
				actual,
				durationMs: Date.now() - startedAt,
				passed,
				countsPass,
				requiredLabelsPass,
				forbiddenLabelsPass,
				screenshot: path.relative(outputDir, screenshotPath),
				failureNotes,
			})
		}

		const failing = results.filter((result) => {
			if (STRICT_MODE) return !result.passed
			if (result.status === 'todo') return false
			return !result.passed
		})

		const summary = {
			strictMode: STRICT_MODE,
			url: APP_URL,
			totalFixtures: results.length,
			passingFixtures: results.length - failing.length,
			failingFixtures: failing.length,
			failOnStatuses: STRICT_MODE ? ['supported', 'todo'] : ['supported'],
			generatedAt: new Date().toISOString(),
		}

		await writeFile(
			reportPath,
			JSON.stringify(
				{
					summary,
					results,
				},
				null,
				2
			),
			'utf8'
		)

		process.stdout.write(`[mermaid:visual] report: ${reportPath}\n`)
		process.stdout.write(
			[
				'fixture | status | passed | geo | arrow | text | screenshot',
				...results.map(
					(result) =>
						`${result.id} | ${result.status} | ${result.passed ? 'yes' : 'no'} | ${result.actual.geo}/${
							result.expected.geo
						} | ${result.actual.arrow}/${result.expected.arrow} | ${result.actual.text}/${
							result.expected.text
						} | ${result.screenshot}`
				),
			].join('\n') + '\n'
		)

		if (failing.length) {
			console.error(
				`[mermaid:visual] ${failing.length} failing fixture(s) under ${
					STRICT_MODE ? 'strict' : 'supported-only'
				} mode`
			)
			for (const failure of failing) {
				console.error(`- ${failure.id}: ${failure.failureNotes.join(' | ')}`)
			}
			process.exitCode = 1
		} else {
			process.stdout.write('[mermaid:visual] all monitored fixtures passed\n')
		}
	} finally {
		await page.close()
		await context.close()
		await browser.close()
	}
}

void main()
