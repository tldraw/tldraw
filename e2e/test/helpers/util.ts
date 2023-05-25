import fs from 'fs'
import { ui } from '.'

export async function textToClipboard(text: string) {
	const html = `<p id="copy_target">${text}</p>`
	const url = `data:text/html;base64,${btoa(html)}`

	await browser.newWindow('', {
		windowName: 'copy_target',
		// windowFeatures: 'width=420,height=230,resizable,scrollbars=yes,status=1',
	})
	await browser.url(url)
	await $('#copy_target').waitForExist()

	await $('#copy_target').click()

	// For some reason the import isn't working...
	// From <https://github.com/webdriverio/webdriverio/blob/3620e90e47b6d3e62832f5de24f43cee6b31e972/packages/webdriverio/src/constants.ts#L360>
	const cmd = 'WDIO_CONTROL'

	// Select all
	await browser.action('key').down(cmd).down('a').up(cmd).up('a').perform()

	await browser.execute(() => new Promise((resolve) => setTimeout(resolve, 3000)))

	// Copy
	await browser.action('key').down(cmd).down('c').up(cmd).up('c').perform()

	await browser.closeWindow()

	const handles = await browser.getWindowHandles()
	await browser.switchToWindow(handles[0])
}

const LOCAL_DOWNLOAD_DIR = process.env.DOWNLOADS_DIR
	? process.env.DOWNLOADS_DIR + '/'
	: __dirname + '/../../downloads/'
export async function getDownloadFile(fileName: string) {
	if (global.webdriverService === 'browserstack') {
		// In browserstack we must grab it from the service
		// <https://www.browserstack.com/docs/automate/selenium/test-file-download#nodejs>
		// Note this only works on desktop devices.
		const base64String = await browser.executeScript(
			`browserstack_executor: {"action": "getFileContent", "arguments": {"fileName": "${fileName}"}}`,
			[]
		)
		const buffer = Buffer.from(base64String, 'base64')
		return buffer
	} else {
		// Locally we can grab the file from the `LOCAL_DOWNLOAD_DIR`
		return await fs.promises.readFile(LOCAL_DOWNLOAD_DIR + fileName)
	}
}

export async function imageToClipboard(_buffer: Buffer) {
	// TODO...
}

export async function htmlToClipboard(_html: string) {
	// TODO...
}

export async function nativeCopy() {
	// CMD+C
	await browser.action('key').down('WDIO_CONTROL').down('c').up('WDIO_CONTROL').up('c').perform()
}

export async function nativePaste() {
	// CMD+V
	await browser.action('key').down('WDIO_CONTROL').down('v').up('WDIO_CONTROL').up('v').perform()
}

export async function deleteAllShapesOnPage() {
	await ui.main.menu(['edit', 'select-all'])
	await ui.main.menu(['edit', 'delete'])
}

export async function sleep(ms: number) {
	await browser.execute((ms) => new Promise((resolve) => setTimeout(resolve, ms)), ms)
}

export async function clearClipboard() {
	return await browser.execute(async () => {
		if (navigator.clipboard.write) {
			await navigator.clipboard.write([
				new ClipboardItem({
					'text/plain': new Blob(['CLEAR'], { type: 'text/plain' }),
				}),
			])
		} else {
			await navigator.clipboard.writeText('')
		}
	})
}

export async function grantPermissions(permissions: 'clipboard-read'[]) {
	for (const permission of permissions) {
		await browser.setPermissions(
			{
				name: permission,
			},
			'granted'
		)
	}
}

// Checks that the clipboard is no-longer "clear" see 'clearClipboard' above
export async function waitForClipboardContents() {
	return await browser.waitUntil(async () => {
		return await browser.execute(async () => {
			const results = await navigator.clipboard.read()
			if (results.length < 0) {
				return true
			}
			return (
				!results[0].types.includes('text/plain') ||
				(await (await results[0].getType('text/plain')).text()) !== 'CLEAR'
			)
		})
	})
}

export async function clipboardContents() {
	return await browser.execute(async () => {
		const results = await navigator.clipboard.read()
		const contents = []

		for (const result of results) {
			const item = {}
			for (const type of result.types) {
				item[type] = type.match(/^text/)
					? await (await result.getType(type)).text()
					: await (await result.getType(type)).arrayBuffer()
			}
			contents.push(item)
		}
		return contents
	})
}
