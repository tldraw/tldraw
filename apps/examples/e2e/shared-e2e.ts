export function sleep(ms: number) {
	return new Promise((resolve) => setTimeout(resolve, ms))
}

// export async function expectPathToBe(page: Page, path: string) {
// 	expect(await page.evaluate(() => app.root.path.value)).toBe(path)
// }

// export async function expectToHaveNShapes(page: Page, numberOfShapes: number) {
// 	expect(await page.evaluate(() => app.shapesArray.length)).toBe(numberOfShapes)
// }

// export async function expectToHaveNSelectedShapes(page: Page, numberOfSelectedShapes: number) {
// 	expect(await page.evaluate(() => app.selectedIds.length)).toBe(numberOfSelectedShapes)
// }
