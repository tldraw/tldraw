import { ui, util } from '..'
import * as runtime from '../runtime'

export function wd(key: string) {
	return `*[data-wd="${key}"]`
}

export async function pointWithinActiveArea(x: number, y: number) {
	const offsetX = 0
	const offsetY = 52
	return { x: x + offsetX, y: y + offsetY }
}

export async function waitForReady() {
	await browser.waitUntil(() => {
		return browser.execute(() => {
			return window.tldrawReady
		})
	})

	// Make sure the window is focused... maybe
	await ui.canvas.click(100, 100)

	// Note: We need to not trigger the double click handler here so we need to wait a little bit.
	await util.sleep(300)
}

export async function hardReset() {
	await runtime.hardReset()
	await waitForReady()
}

export async function open() {
	await browser.url(global.webdriverTestUrl ?? `https://localhost:5420/`)
	/**
	 * HACK: vscode doesn't support `browser.setWindowSize` so we use the
	 * default size.
	 *
	 * This will break things currently if run on a small screen.
	 */
	if (global.tldrawOptions.windowSize !== 'default') {
		const windowSize = global.tldrawOptions.windowSize ?? [1200, 1200]
		await browser.setWindowSize(windowSize[0], windowSize[1])
	}

	await waitForReady()
	global.isWindowOpen = true
}

export async function shapesAsImgData() {
	return await browser.execute(async () => {
		return await window.app
			.getSvg([...window.app.shapeIds], { padding: 0, background: true })
			.then(async (svg) => {
				const svgStr = new XMLSerializer().serializeToString(svg)
				const svgImage = document.createElement('img')
				document.body.appendChild(svgImage)
				svgImage.src = URL.createObjectURL(
					new Blob([svgStr], {
						type: 'image/svg+xml',
					})
				)

				const dpr = window.devicePixelRatio

				return await new Promise<{
					width: number
					height: number
					dpr: number
					data: string
				}>((resolve) => {
					svgImage.onload = () => {
						const width = parseInt(svg.getAttribute('width'))
						const height = parseInt(svg.getAttribute('height'))

						const canvas = document.createElement('canvas')
						canvas.width = width * dpr
						canvas.height = height * dpr
						const canvasCtx = canvas.getContext('2d')
						canvasCtx.drawImage(svgImage, 0, 0, width * dpr, height * dpr)
						const imgData = canvas.toDataURL('image/png')
						resolve({
							dpr: dpr,
							width: width * dpr,
							height: height * dpr,
							data: imgData,
						})
					}
				})
			})
	})
}

global.isWindowOpen = false

export async function setup() {
	if (!global.isWindowOpen) {
		await open()
	} else {
		await hardReset()
	}
}

export async function getElementByWd(...selectors: string[]) {
	for (const possibleSelector of selectors) {
		const element = wd(possibleSelector)
		const isDisplayed = await $(element).isDisplayed()
		if (isDisplayed) {
			return $(element)
		}
	}
}
