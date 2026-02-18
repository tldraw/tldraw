import test from '@playwright/test'
import * as fs from 'fs'
import path from 'path'

const __dirname = path.dirname(new URL(import.meta.url).pathname)

// get all example slugs by finding README.md files in the nested category folders
const examplesRoot = path.join(__dirname, '../../src/examples')
function getExampleSlugs(dir: string): string[] {
	const slugs: string[] = []
	for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
		if (!entry.isDirectory()) continue
		const subdir = path.join(dir, entry.name)
		if (fs.existsSync(path.join(subdir, 'README.md'))) {
			slugs.push(entry.name)
		} else {
			slugs.push(...getExampleSlugs(subdir))
		}
	}
	return slugs
}
const examplesFolderList = getExampleSlugs(examplesRoot)
const examplesWithoutCanvas = [
	// only shows an image, not the canvas
	'image-component',
	// links out to a different repo
	'yjs',
	// starts by asking the user to select an image
	'image-annotator',
	// starts by asking the user to open a pdf
	'pdf-editor',
	// starts by asking the user to select a pdf (built on pdf-editor)
	'exam-marking',
]
const examplesToTest = examplesFolderList.filter((route) => !examplesWithoutCanvas.includes(route))

test.describe('Routes', () => {
	for (const example of examplesToTest) {
		test(example, async ({ page }) => {
			await page.goto(`http://localhost:5420/${example}/full`)
			await page.waitForSelector('.tl-canvas')
		})
	}
})
