/* eslint-disable local/no-at-internal, local/no-internal-imports */
import { Page, expect } from '@playwright/test'
import assert from 'assert'
import { rename, writeFile } from 'fs/promises'
import { ReactElement } from 'react'
import {
	DefaultFillStyle,
	DefaultFontStyle,
	Editor,
	TLShapePartial,
	TLTextShape,
	mapObjectMapValues,
} from 'tldraw'
import { TL, shapesFromJsx } from 'tldraw/src/test/test-jsx'
import { EndToEndApi } from '../../src/misc/EndToEndApi'
import { setup } from '../shared-e2e'
import test, { ApiFixture } from './fixtures/fixtures'

declare const editor: Editor
declare const tldrawApi: EndToEndApi

interface Snapshots {
	[name: string]: { [row: string]: { [testCase: string]: ReactElement } }
}

const snapshots: Snapshots = {
	'Text rendering': {
		'geo text': {
			'leading line breaks': <TL.geo text={'\n\n\n\n\n\ntext'} w={100} h={30} />,
			'trailing line breaks': <TL.geo text={'text\n\n\n\n\n\n'} w={100} h={30} />,
			'mixed RTL': <TL.geo text={'unicode is cool!\nكتابة باللغة  العرب!'} w={300} h={300} />,
		},
	},
	Fills: Object.fromEntries(
		DefaultFillStyle.values.map((fill) => [
			`fill=${fill}`,
			{
				geo: <TL.geo fill={fill} color="green" w={100} h={100} />,
				arrow: (
					<TL.arrow
						fill={fill}
						color="light-green"
						arrowheadStart="square"
						arrowheadEnd="dot"
						start={{ x: 0, y: 0 }}
						end={{ x: 100, y: 100 }}
						bend={20}
					/>
				),
				draw: (
					<TL.draw
						fill={fill}
						color="light-violet"
						segments={[
							{ type: 'straight', points: [{ x: 0, y: 0 }] },
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
						]}
						isClosed
						isComplete
					/>
				),
			},
		])
	),
	Fonts: Object.fromEntries(
		DefaultFontStyle.values.map((font) => [
			`font=${font}`,
			{
				geo: <TL.geo font={font} text="test" w={100} h={100} />,
				arrow: (
					<TL.arrow
						font={font}
						color="blue"
						fill="solid"
						arrowheadStart="square"
						arrowheadEnd="arrow"
						start={{ x: 0, y: 0 }}
						end={{ x: 100, y: 100 }}
						bend={20}
						text="test"
					/>
				),
				note: <TL.note font={font} color="violet" text="test" />,
				text: <TL.text font={font} color="red" text="test" />,
			},
		])
	),
}

interface SnapshotWithoutJsx {
	[row: string]: { [testCase: string]: TLShapePartial[] }
}

test.describe('Export snapshots', () => {
	const snapshotsToTest = Object.entries(snapshots)

	test.beforeEach(setup)

	for (const [name, snapshotWithJsx] of snapshotsToTest) {
		const snapshot: SnapshotWithoutJsx = mapObjectMapValues(snapshotWithJsx, (key, row) =>
			mapObjectMapValues(row, (key, testCase) => shapesFromJsx(testCase).shapes)
		)

		for (const colorScheme of ['light', 'dark'] as const) {
			test(`${name} (${colorScheme})`, async ({ page, api }) => {
				await page.evaluate(
					({ name, snapshot }: { name: string; snapshot: SnapshotWithoutJsx }) => {
						editor.user.updateUserPreferences({ colorScheme: 'dark' })
						editor
							.updateInstanceState({ exportBackground: false })
							.selectAll()
							.deleteShapes(editor.getSelectedShapeIds())

						const titleId = tldrawApi.createShapeId()
						editor.createShape<TLTextShape>({
							id: titleId,
							type: 'text',
							x: 0,
							y: 0,
							props: { text: name, font: 'mono', size: 'xl' },
						})

						let y = editor.getShapePageBounds(titleId)!.maxY + 20

						for (const [rowName, testCases] of Object.entries(snapshot)) {
							const rowTitleId = tldrawApi.createShapeId()
							editor.createShape<TLTextShape>({
								id: rowTitleId,
								type: 'text',
								x: 0,
								y,
								props: { text: rowName, font: 'mono', size: 'l' },
							})
							y = editor.getShapePageBounds(rowTitleId)!.maxY + 20

							let x = 0
							let bottom = y
							for (const [testCaseName, shapes] of Object.entries(testCases)) {
								const group = tldrawApi.createShapeId()
								editor.createShape<TLTextShape>({
									id: group,
									type: 'text',
									x,
									y,
									props: { text: testCaseName, font: 'mono', size: 's' },
								})
								x = editor.getShapePageBounds(group)!.maxX + 20

								for (const shape of shapes) {
									editor.createShape(shape)
								}
								const topLevelShapeIds = shapes
									.filter((shape) => !shape.parentId)
									.map((shape) => shape.id)
								editor.setSelectedShapes(topLevelShapeIds)
								let bounds = editor.getSelectionPageBounds()!
								editor.nudgeShapes(topLevelShapeIds, {
									x: x - bounds.minX,
									y: y - bounds.minY,
								})

								bounds = editor.getSelectionPageBounds()!
								x = bounds.maxX + 20
								bottom = Math.max(bottom, bounds.maxY)
							}

							y = bottom + 20
						}

						editor.selectAll()
					},
					{ name, snapshot } as any
				)

				await snapshotTest(page, api)
			})
		}
		// test(`Exports with ${name} in dark mode`, async ({ page, api }) => {
		// 	await page.evaluate((shapes) => {
		// 		editor.user.updateUserPreferences({ colorScheme: 'dark' })
		// 		editor
		// 			.updateInstanceState({ exportBackground: false })
		// 			.selectAll()
		// 			.deleteShapes(editor.getSelectedShapeIds())
		// 			.createShapes(shapes)
		// 	}, shapes as any)

		// 	await snapshotTest(page, api)
		// })
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
