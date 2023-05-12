import { Box2d } from '@tldraw/primitives'
import fs from 'fs'
import pixelmatch from 'pixelmatch'
import pngjs from 'pngjs'
import sharp from 'sharp'
import { app } from './ui'

const PNG = pngjs.PNG

type takeRegionScreenshotOpts = {
	writeTo: {
		path: string
		prefix: string
	}
}
type takeRegionScreenshotResult = {
	browserBuffer: Buffer
	exportBuffer: Buffer
	fullWidth: any
	fullHeight: any
}
export async function takeRegionScreenshot(
	bbox: Box2d,
	opts?: takeRegionScreenshotOpts
): Promise<takeRegionScreenshotResult> {
	const { data, dpr } = await app.shapesAsImgData()

	const base64 = await browser.takeScreenshot()
	const bufferInput = Buffer.from(data.replace('data:image/png;base64,', ''), 'base64')

	const { data: exportBuffer, info: origInfo } = await sharp(bufferInput)
		.png()
		.toBuffer({ resolveWithObject: true })

	const fullWidth = Math.floor(origInfo.width)
	const fullHeight = Math.floor(origInfo.height)

	const binary = Buffer.from(base64, 'base64')

	const browserBuffer = await sharp(binary)
		.extract({
			left: Math.floor(bbox.x * dpr),
			top: Math.floor(bbox.y * dpr),
			width: Math.floor(bbox.w * dpr),
			height: Math.floor(bbox.h * dpr),
		})
		.resize({ width: fullWidth, height: fullHeight })
		.png()
		.toBuffer()

	if (opts.writeTo) {
		const { path: writeToPath, prefix: writeToPrefix } = opts.writeTo
		await fs.promises.writeFile(
			`${__dirname}/../../screenshots/${writeToPrefix}-app.png`,
			exportBuffer
		)
		await fs.promises.writeFile(`${writeToPath}/${writeToPrefix}-svg.png`, exportBuffer)
	}

	return {
		browserBuffer,
		exportBuffer,
		fullWidth,
		fullHeight,
	}
}

type diffScreenshotOpts = {
	writeTo: {
		path: string
		prefix: string
	}
}
export async function diffScreenshot(
	screenshotRegion: takeRegionScreenshotResult,
	opts?: diffScreenshotOpts
) {
	const { exportBuffer, browserBuffer, fullWidth, fullHeight } = screenshotRegion
	const diff = new PNG({ width: fullWidth, height: fullHeight })
	const img1 = PNG.sync.read(browserBuffer)
	const img2 = PNG.sync.read(exportBuffer)
	const pxielDiff = pixelmatch(img1.data, img2.data, diff.data, fullWidth, fullHeight, {
		threshold: 0.6,
	})

	if (opts.writeTo) {
		const { path: writeToPath, prefix: writeToPrefix } = opts.writeTo

		await fs.promises.writeFile(`${writeToPath}/${writeToPrefix}-diff.png`, PNG.sync.write(diff))
	}

	return {
		pxielDiff,
	}
}
