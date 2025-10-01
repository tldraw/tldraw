import test from '@playwright/test'
import * as fs from 'fs'
import path from 'path'

const __dirname = path.dirname(new URL(import.meta.url).pathname)

// get all routes from examples/src/examples folder
const examplesFolderList = fs.readdirSync(path.join(__dirname, '../../src/examples'))
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
const exampelsToTest = examplesFolderList.filter((route) => !examplesWithoutCanvas.includes(route))

test.describe('Routes', () => {
	for (const example of exampelsToTest) {
		test(example, async ({ page }) => {
			await page.goto(`http://localhost:5420/${example}/full`)
			await page.waitForSelector('.tl-canvas')
		})
	}
})
