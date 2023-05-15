import { wd } from './app'

export async function menu(path = []) {
	await $(wd('main.menu')).click()

	for await (const item of path) {
		await $(wd(`menu-item.${item}`)).click()
	}
}

export async function actionMenu(path = []) {
	await $(wd('main.action-menu')).click()

	for await (const item of path) {
		await $(wd(`menu-item.${item}`)).click()
	}
}

export async function click(key: string) {
	await $(wd(`main.${key}`)).click()
}
