// const colors = {
//   fill: new Map<TLColorType, string>(),
//   // containerStyle.getPropertyValue(`--palette-${color.id}`)
//   pattern: new Map<TLColorType, string>(),
//   // containerStyle.getPropertyValue(`--palette-${color.id}-pattern`),
//   semi: new Map<TLColorType, string>(),
//   // containerStyle.getPropertyValue(`--palette-${color.id}-semi`),
//   text: containerStyle.getPropertyValue(`--color-text`),
//   background: containerStyle.getPropertyValue(`--color-background`),
//   solid: containerStyle.getPropertyValue(`--palette-solid`),
// }

import { TLColorType } from '@tldraw/tlschema'

export function getColorForSvgExport(
	opts:
		| { type: 'text' | 'background' | 'solid'; isDarkMode: boolean }
		| { type: 'fill' | 'pattern' | 'semi'; color: TLColorType; isDarkMode: boolean }
): string {
	const fakeContainerEl = document.createElement('div')
	fakeContainerEl.className = `tl-container tl-theme__${opts.isDarkMode ? 'dark' : 'light'}`
	document.body.appendChild(fakeContainerEl)

	const containerStyle = getComputedStyle(fakeContainerEl)

	let style: string

	switch (opts.type) {
		case 'fill': {
			style = containerStyle.getPropertyValue(`--palette-${opts.color}`)
			break
		}
		case 'pattern': {
			style = containerStyle.getPropertyValue(`--palette-${opts.color}-pattern`)
			break
		}
		case 'semi': {
			style = containerStyle.getPropertyValue(`--palette-${opts.color}-semi`)
			break
		}
		case 'solid': {
			style = containerStyle.getPropertyValue(`--palette-solid`)
			break
		}
		case 'text': {
			style = containerStyle.getPropertyValue(`--color-text`)
			break
		}
		case 'background': {
			style = containerStyle.getPropertyValue(`--color-background`)
			break
		}
	}

	document.body.removeChild(fakeContainerEl)

	return style
}
