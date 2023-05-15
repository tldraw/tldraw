import { MOVE_DEFAULTS } from '../constants'
import { getElementByWd, pointWithinActiveArea, wd } from './app'

export async function brush(x1: number, y1: number, x2: number, y2: number) {
	const start = await pointWithinActiveArea(x1, y1)
	const end = await pointWithinActiveArea(x2, y2)

	await browser
		.action('pointer')
		.move({ ...start, ...MOVE_DEFAULTS })
		.down()
		.move(end)
		.up()
		.perform()
}

export async function draw(points: { x: number; y: number }[]) {
	const mappedPoints = []
	for (const point of points) {
		mappedPoints.push(await pointWithinActiveArea(point.x, point.y))
	}

	let chain = browser.action('pointer')
	for (const [index, mappedPoint] of mappedPoints.entries()) {
		if (index === 0) {
			chain = chain.move({ ...mappedPoint, ...MOVE_DEFAULTS }).down()
		} else {
			chain = chain.move({ ...mappedPoint, ...MOVE_DEFAULTS })
		}
	}
	await chain.perform()
}

export async function click(x1: number, y1: number) {
	const start = await pointWithinActiveArea(x1, y1)
	await browser
		.action('pointer')
		.move({ ...start, ...MOVE_DEFAULTS })
		.down()
		.up()
		.perform()
}

export async function doubleClick(x1: number, y1: number) {
	const start = await pointWithinActiveArea(x1, y1)
	await browser
		.action('pointer')
		.move({ ...start, ...MOVE_DEFAULTS })
		.down()
		.up()
		.down()
		.up()
		.perform()
}

export async function dragBy(target: WebdriverIO.Element, dx: number, dy: number) {
	const loc = await target.getLocation()
	const size = await target.getSize()
	const locX = Math.floor(loc.x) + Math.floor(size.width / 2)
	const locY = Math.floor(loc.y) + Math.floor(size.height / 2)

	const startX = locX
	const startY = locY
	const endX = locX + dx
	const endY = locY + dy

	await browser.actions([
		browser
			.action('pointer')
			.move({ x: startX, y: startY, ...MOVE_DEFAULTS })
			.down('left')
			.move({ x: endX, y: endY, ...MOVE_DEFAULTS })
			.up(),
	])
}

export async function contextMenu(x: number, y: number, path: string[] = []) {
	await browser
		.action('pointer')
		.move({ x, y, ...MOVE_DEFAULTS })
		.down('right')
		.up()
		.perform()
	// await $(wd('active-area')).click({button: 2, x, y})

	for await (const item of path) {
		await $(wd(`menu-item.${item}`)).waitForExist()
		await $(wd(`menu-item.${item}`)).click()
	}
}

export async function clickTextInput() {
	await (await $(wd(`canvas`) + ' textarea')).click()
}

export async function selectionHandle(...possibleSelectors: string[]) {
	return getElementByWd(...possibleSelectors.map((s) => `selection.${s}`))
}
