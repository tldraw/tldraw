import { Page, expect } from '@playwright/test'
import assert from 'assert'
import { rename, writeFile } from 'fs/promises'
import { Editor } from 'tldraw'
import mermaidDefinitions from '../../src/examples/use-cases/hundred-mermaids/mermaids'
import test, { ApiFixture } from '../fixtures/fixtures'
import { hardResetEditor, setup } from '../shared-e2e'

declare const editor: Editor

interface MermaidSnapshotCase {
	name: string
	definition: string
}

const snapshotCases: MermaidSnapshotCase[] = [
	{ name: 'flowchart decision', definition: mermaidDefinitions[0][0] },
	{ name: 'flowchart with subgraphs', definition: mermaidDefinitions[0][10] },
	{ name: 'flowchart with class defs', definition: mermaidDefinitions[0][15] },
	{ name: 'flowchart with custom edge styles', definition: mermaidDefinitions[0][17] },
	{ name: 'state diagram basic', definition: mermaidDefinitions[1][1] },
	{ name: 'state diagram with nested state', definition: mermaidDefinitions[1][8] },
	{ name: 'state diagram with fork join', definition: mermaidDefinitions[1][11] },
	{ name: 'sequence diagram basics', definition: mermaidDefinitions[2][0] },
	{ name: 'sequence diagram with alt', definition: mermaidDefinitions[2][10] },
	{ name: 'sequence diagram with parallel lanes', definition: mermaidDefinitions[2][12] },
]

test.describe('Mermaid export snapshots', () => {
	test.skip(({ isMobile }) => isMobile, 'Mermaid export snapshots are desktop-only')

	test.beforeEach(async ({ page, context }) => {
		const url = page.url()
		if (!url.includes('end-to-end')) {
			await setup({ page, context } as any)
		} else {
			await hardResetEditor(page)
		}
	})

	for (const testCase of snapshotCases) {
		test(`${testCase.name} (light)`, async ({ page, api }) => {
			await page.evaluate(() => {
				editor.user.updateUserPreferences({ colorScheme: 'light' })
				editor
					.updateInstanceState({ exportBackground: true })
					.selectAll()
					.deleteShapes(editor.getSelectedShapeIds())
				tldrawApi.resetMockShapeIds()
			})
			await api.createMermaidDiagram(testCase.definition)
			await page.evaluate(() => {
				editor.selectAll()
			})

			await snapshotTest(page, api)
		})
	}
})

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
			fullPage: true,
		})
	})
	await api.exportAsSvg()
	await downloadAndSnapshot
}
