import { Page, expect } from '@playwright/test'
import assert from 'assert'
import { rename, writeFile } from 'fs/promises'
import { Editor, TLShapeId, TLShapePartial } from 'tldraw'
import { setup } from '../shared-e2e'
import test, { ApiFixture } from './fixtures/fixtures'

declare const editor: Editor

// hi steve. please don't comment these out. they stop us getting bugs. u can just ask if they're
// holding u up <3
test.describe('Export snapshots', () => {
	const snapshots = {
		'Exports geo text with leading line breaks': [
			{
				id: 'shape:testShape' as TLShapeId,
				type: 'geo',
				props: {
					w: 100,
					h: 30,
					text: '\n\n\n\n\n\ntext',
				},
			},
		],
		'Exports geo text with trailing line breaks': [
			{
				id: 'shape:testShape' as TLShapeId,
				type: 'geo',
				props: {
					w: 100,
					h: 30,
					text: 'text\n\n\n\n\n\n',
				},
			},
		],
		'Exports geo text with mixed RTL': [
			{
				id: 'shape:testShape' as TLShapeId,
				type: 'geo',
				props: {
					w: 300,
					h: 300,
					text: 'unicode is cool!\nكتابة باللغة  العرب!',
				},
			},
		],
	} as Record<string, TLShapePartial[]>

	for (const fill of ['none', 'semi', 'solid', 'pattern']) {
		snapshots[`geo fill=${fill}`] = [
			{
				id: 'shape:testShape' as TLShapeId,
				type: 'geo',
				props: {
					fill,
					color: 'green',
					w: 100,
					h: 100,
				},
			},
		]

		snapshots[`arrow fill=${fill}`] = [
			{
				id: 'shape:testShape' as TLShapeId,
				type: 'arrow',
				props: {
					color: 'light-green',
					fill: fill,
					arrowheadStart: 'square',
					arrowheadEnd: 'dot',
					start: { x: 0, y: 0 },
					end: { x: 100, y: 100 },
					bend: 20,
				},
			},
		]

		snapshots[`draw fill=${fill}`] = [
			{
				id: 'shape:testShape' as TLShapeId,
				type: 'draw',
				props: {
					color: 'light-violet',
					fill: fill,
					segments: [
						{
							type: 'straight',
							points: [{ x: 0, y: 0 }],
						},
						{
							type: 'straight',
							points: [
								{ x: 0, y: 0 },
								{ x: 100, y: 0 },
							],
						},
						{
							type: 'straight',
							points: [
								{ x: 100, y: 0 },
								{ x: 0, y: 100 },
							],
						},
						{
							type: 'straight',
							points: [
								{ x: 0, y: 100 },
								{ x: 100, y: 100 },
							],
						},
						{
							type: 'straight',
							points: [
								{ x: 100, y: 100 },
								{ x: 0, y: 0 },
							],
						},
					],
					isClosed: true,
					isComplete: true,
				},
			},
		]
	}

	for (const font of ['draw', 'sans', 'serif', 'mono']) {
		snapshots[`geo font=${font}`] = [
			{
				id: 'shape:testShape' as TLShapeId,
				type: 'geo',
				props: {
					text: 'test',
					color: 'blue',
					font,
					w: 100,
					h: 100,
				},
			},
		]

		snapshots[`arrow font=${font}`] = [
			{
				id: 'shape:testShape' as TLShapeId,
				type: 'arrow',
				props: {
					color: 'blue',
					fill: 'solid',
					arrowheadStart: 'square',
					arrowheadEnd: 'arrow',
					font,
					start: { x: 0, y: 0 },
					end: { x: 100, y: 100 },
					bend: 20,
					text: 'test',
				},
			},
		]

		snapshots[`arrow font=${font}`] = [
			{
				id: 'shape:testShape' as TLShapeId,
				type: 'arrow',
				props: {
					color: 'blue',
					fill: 'solid',
					arrowheadStart: 'square',
					arrowheadEnd: 'arrow',
					font,
					start: { x: 0, y: 0 },
					end: { x: 100, y: 100 },
					bend: 20,
					text: 'test',
				},
			},
		]

		snapshots[`note font=${font}`] = [
			{
				id: 'shape:testShape' as TLShapeId,
				type: 'note',
				props: {
					color: 'violet',
					font,
					text: 'test',
				},
			},
		]

		snapshots[`text font=${font}`] = [
			{
				id: 'shape:testShape' as TLShapeId,
				type: 'text',
				props: {
					color: 'red',
					font,
					text: 'test',
				},
			},
		]
	}

	const snapshotsToTest = Object.entries(snapshots)
	const filteredSnapshots = snapshotsToTest // maybe we filter these down, there are a lot of them

	test.beforeEach(setup)

	for (const [name, shapes] of filteredSnapshots) {
		test(`Exports with ${name} in dark mode`, async ({ page, api }) => {
			await page.evaluate((shapes) => {
				editor.user.updateUserPreferences({ isDarkMode: true })
				editor
					.updateInstanceState({ exportBackground: false })
					.selectAll()
					.deleteShapes(editor.getSelectedShapeIds())
					.createShapes(shapes)
			}, shapes as any)

			await snapshotTest(page, api)
		})
	}

	async function snapshotTest(page: Page, api: ApiFixture) {
		const downloadAndSnapshot = page.waitForEvent('download').then(async (download) => {
			const path = (await download.path()) as string
			assert(path)
			await rename(path, path + '.svg')
			await writeFile(
				path + '.html',
				`
								<!DOCTYPE html>
								<meta charset="utf-8" />
								<meta name="viewport" content="width=device-width, initial-scale=1" />
								<img src="${path}.svg" />
				`,
				'utf-8'
			)

			await page.goto(`file://${path}.html`)
			const clip = await page.$eval('img', (img) => img.getBoundingClientRect())
			await expect(page).toHaveScreenshot({
				omitBackground: true,
				clip,
			})
		})
		await api.exportAsSvg()
		await downloadAndSnapshot
	}
})
