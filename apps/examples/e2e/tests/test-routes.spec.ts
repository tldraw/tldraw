import test from '@playwright/test'
import * as fs from 'fs'
import path from 'path'

// get all routes from examples/src/examples folder
const examplesFolderList = fs.readdirSync(path.join(__dirname, '../../src/examples'))
const examplesWithoutCanvas = ['image-component', 'yjs']
const exampelsToTest = examplesFolderList.filter((route) => !examplesWithoutCanvas.includes(route))

test.describe('Routes', () => {
	for (const example of exampelsToTest) {
		test(example, async ({ page }) => {
			await page.goto(`http://localhost:5420/${example}/full`)
			await page.waitForSelector('.tl-canvas')
		})
	}
})
