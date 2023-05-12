import { App, TLShape } from '@tldraw/editor'
import { Box2d } from '@tldraw/primitives'

declare global {
	interface Window {
		app: App
		webdriverReset: () => void
	}
}

export async function isIn(path: string) {
	return await browser.execute((path) => window.app.isIn(path), path)
}

export async function propsForNextShape() {
	return await browser.execute(() => window.app.instanceState.propsForNextShape)
}

export function getAllShapes() {
	return browser.execute(() => window.app.shapesArray)
}
export async function getShapesOfType(...types: TLShape['type'][]) {
	return await browser.execute((types) => {
		return window.app.store
			.allRecords()
			.filter((s) => s.typeName === 'shape' && types.includes(s.type))
	}, types)
}

export async function selectionBounds(): Promise<Box2d> {
	return await browser.execute(() => {
		return window.app.selectionBounds
	})
}

export async function getCamera() {
	return await browser.execute(() => {
		const { x, y, z } = window.app.camera
		return { x, y, z }
	})
}
export async function hardReset() {
	await browser.execute(() => {
		window.webdriverReset()
	})
}
