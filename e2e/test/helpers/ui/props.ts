import { wd } from './app'

export async function ifMobileOpenStylesMenu() {
	if (globalThis.tldrawOpts.ui === 'mobile') {
		await $(wd(`mobile.styles`)).click()
	}
}

export async function selectColor(color: string) {
	await $(wd(`style.color.${color}`)).click()
}

export async function selectFill(fill: string) {
	await $(wd(`style.fill.${fill}`)).click()
}

export async function selectStroke(stroke: string) {
	await $(wd(`style.dash.${stroke}`)).click()
}

export async function selectSize(size: string) {
	await $(wd(`style.size.${size}`)).click()
}

export async function selectSpline(type: string) {
	await $(wd(`style.spline`)).click()
	await $(wd(`style.spline.${type}`)).click()
}

export async function selectOpacity(_opacity: number) {
	// TODO...
}

export async function selectShape() {
	// TODO...
}

export async function selectFont(font: string) {
	await $(wd(`font.${font}`)).click()
}

export async function selectAlign(alignment: string) {
	await $(wd(`align.${alignment}`)).click()
}

export async function selectArrowheadStart(type: string) {
	await $(wd(`style.arrowheads.start`)).click()
	await $(wd(`style.arrowheads.start.${type}`)).click()
}

export async function selectArrowheadEnd(type: string) {
	await $(wd(`style.arrowheads.end`)).click()
	await $(wd(`style.arrowheads.end.${type}`)).click()
}
