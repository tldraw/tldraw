import { wd } from './app'

export function $element() {
	return $(wd('minimap'))
}

export async function zoomIn() {
	const button = wd(`minimap.zoom-in`)
	const toggle = wd(`minimap.toggle`)

	if (await $(button).isExisting()) {
		await $(button).click()
	} else if (await $(wd(`minimap.toggle`)).isExisting()) {
		await $(toggle).click()
		await $(button).click()
	}

	return this
}

export async function zoomOut() {
	const button = wd(`minimap.zoom-out`)
	const toggle = wd(`minimap.toggle`)

	if (await $(button).isExisting()) {
		await $(button).click()
	} else if (await $(wd(`minimap.toggle`)).isExisting()) {
		await $(toggle).click()
		await $(button).click()
	}

	return this
}

export async function menuButton() {
	return await $(wd('minimap.zoom-menu'))
}

export async function menu(path: string[] = []) {
	await $(wd('minimap.zoom-menu')).click()

	for await (const item of path) {
		await $(wd(`minimap.zoom-menu.${item}`)).click()
	}
}
